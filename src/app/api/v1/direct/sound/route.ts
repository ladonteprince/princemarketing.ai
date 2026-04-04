import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, badRequest, serverError } from '@/lib/apiResponse';

// ---------------------------------------------------------------------------
// Gemini Sound Director — /api/v1/direct/sound
// WHY: After a video is stitched, this endpoint analyzes the scene structure
// and generates a neurochemically-targeted Sound Skeleton — a timestamped
// music/SFX brief that becomes the Suno prompt. Every sound decision is
// informed by the Production Brain vector store (neuroscience + music theory).
// ---------------------------------------------------------------------------

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-3.1-pro-preview';
const PINECONE_HOST = 'https://prince-production-brain-ya8e9us.svc.aped-4627-b74a.pinecone.io';
const PINECONE_NS = 'production-research';

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const SceneSchema = z.object({
  prompt: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  attentionRole: z.enum(['stimulation', 'captivation', 'anticipation', 'validation', 'revelation']),
});

const SoundDirectorSchema = z.object({
  videoUrl: z.string().url().optional(),
  scenes: z.array(SceneSchema).min(1),
  totalDuration: z.number().min(1).max(300),
  targetEmotion: z.string().min(1),
  voiceoverScript: z.string().optional(),
});

// ---------------------------------------------------------------------------
// RAG: Query Production Brain for music/sound research
// ---------------------------------------------------------------------------

async function queryProductionBrain(scenes: string[], emotion: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!openaiKey || !pineconeKey) return '';

  try {
    const query = `Music and sound design for ${emotion} video: ${scenes.slice(0, 3).join('. ')}. What scoring techniques, SFX, and neurochemical sound strategies should be used?`;

    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-large', input: query }),
    });
    if (!embedRes.ok) return '';

    const embedData = (await embedRes.json()) as { data: Array<{ embedding: number[] }> };
    const vector = embedData.data[0]?.embedding;
    if (!vector) return '';

    const searchRes = await fetch(`${PINECONE_HOST}/query`, {
      method: 'POST',
      headers: { 'Api-Key': pineconeKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace: PINECONE_NS, vector, topK: 5, includeMetadata: true }),
    });
    if (!searchRes.ok) return '';

    const searchData = (await searchRes.json()) as {
      matches?: Array<{ score: number; metadata?: { content?: string; source?: string; section?: string } }>;
    };

    return (searchData.matches ?? [])
      .filter((m) => m.score > 0.35)
      .map((m, i) => `[Source ${i + 1}: ${m.metadata?.source} — ${m.metadata?.section}]\n${m.metadata?.content}`)
      .join('\n\n---\n\n');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Gemini API call
// ---------------------------------------------------------------------------

async function callGemini(parts: Array<Record<string, unknown>>): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('[SoundDirector] GEMINI_API_KEY not set');

  const res = await fetch(`${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`[SoundDirector] Gemini error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('[SoundDirector] No text in Gemini response');
  return text;
}

// ---------------------------------------------------------------------------
// Build the Sound Director prompt
// ---------------------------------------------------------------------------

function buildSoundPrompt(
  scenes: z.infer<typeof SceneSchema>[],
  totalDuration: number,
  emotion: string,
  voiceoverScript?: string,
  ragContext?: string,
): string {
  const sceneList = scenes
    .map((s, i) => `Scene ${i + 1} [${s.startTime.toFixed(1)}s-${s.endTime.toFixed(1)}s] (${s.attentionRole.toUpperCase()}): ${s.prompt}`)
    .join('\n');

  const voiceoverNote = voiceoverScript
    ? `\n\nVOICEOVER SCRIPT (user will record this — leave space for dialogue):\n"${voiceoverScript}"\n\nWhen voiceover is present, use audio ducking: music drops -6dB during speech sections. Mark voiceoverTimestamps in your output.`
    : '';

  const ragSection = ragContext
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETRIEVED RESEARCH CONTEXT — Primary literature for this score:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ragContext}`
    : '';

  return `You are the Gemini Sound Director — an expert film composer, sound designer, and music supervisor. Your job is to create a Sound Skeleton: a timestamped music and SFX brief for AI music generation (Suno).

VIDEO CONTEXT:
- Total duration: ${totalDuration}s
- Target emotion: ${emotion}
- Scenes:
${sceneList}
${voiceoverNote}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MUSIC/SOUND DESIGN FRAMEWORK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING TECHNIQUES:
- Leitmotif: recurring melodic identity for character/brand
- Underscore: subtle emotional bed beneath action
- Stinger: sharp accent on a reveal or beat change
- Ostinato: repeating pattern building tension/momentum
- Crescendo: building intensity toward climax
- Counterpoint: music opposing visual mood for irony/depth
- Drone: sustained tension, unease, anticipation
- Silence: maximum impact before or after key moment

SFX TYPES:
- Whoosh: transitions, fast motion emphasis
- Riser: building anticipation before reveal
- Impact/Hit: punctuation on beat changes or reveals
- Boom/Sub Drop: bass emphasis for power/arrival moments
- Reverse/Suck-Back: pulling attention inward before release
- Drone/Pad: atmospheric tension or calm
- Tick/Clock: urgency, countdown, time pressure

NEUROCHEMICAL SOUND MAPPING:
- Dopamine: Musical tension-resolution (caudate anticipation → NAcc peak). Deceptive cadences = striatal prediction error.
- Norepinephrine: Sudden stingers → LC phasic burst. Silence after pattern → orienting response.
- Cortisol: Sustained drone >20s → HPA axis. Low-frequency unresolvable tension.
- Oxytocin: Warm melodic motif, soft underscore ~60 BPM, familiar harmonic patterns.
- Serotonin: Resolved major progressions → satisfaction. Bright timbres.
- Endorphins: Musical climax with crescendo → emotional payoff (causal evidence: Mallik 2017).
- GABA: Ambient room tone, minimal stimulation → parasympathetic dominance.

ATTENTION ARCHITECTURE SOUND MAPPING:
- STIMULATION: Sub-drop impact + silence gap (NE). Stinger/whoosh on first frame.
- CAPTIVATION: Rising ostinato, minor key, 80-100 BPM. Riser building.
- ANTICIPATION: Drone builds. Ticking SFX. Ostinato intensifies.
- VALIDATION: Crescendo → warm major chord + silence (endorphin release). Bass hit on payoff.
- REVELATION: Brand leitmotif. 2-3 note signature. Sound bridge fading out.

SOUND SKELETON RULES:
1. Every timestamp must map to a specific neurochemical target
2. Build from the AI Filmmaking SOP "Sound Skeleton" concept — score BEFORE edit, structure the emotional architecture
3. Music cues should enter on cuts/transitions, not mid-shot
4. Silence is a scoring technique — use it before major hits
5. Total duration must match ${totalDuration}s exactly
6. Style should be instrumental (no vocals/lyrics unless specified)
${ragSection}

Return ONLY valid JSON:
{
  "soundSkeleton": [
    {"startTime": 0.0, "endTime": 2.0, "type": "sfx|music|silence", "description": "what happens", "neurochemicalTarget": "dopamine|norepinephrine|cortisol|oxytocin|serotonin|endorphins|gaba|acetylcholine", "attentionRole": "stimulation|captivation|anticipation|validation|revelation"}
  ],
  "sunoPrompt": "A complete, detailed music generation prompt for Suno. Include tempo, key, instrumentation, emotional arc, timing landmarks. No lyrics. No vocals.",
  "sunoStyle": "genre/style tags for Suno",
  "sunoDuration": ${Math.ceil(totalDuration)},
  "voiceoverTimestamps": ${voiceoverScript ? '[{"startTime": N, "endTime": N, "text": "...", "duckMusic": true}]' : '[]'},
  "neurochemicalProfile": {"primary": "...", "secondary": "...", "tertiary": "..."}
}`;
}

// ---------------------------------------------------------------------------
// POST /api/v1/direct/sound
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SoundDirectorSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest('Invalid request', parsed.error.flatten().fieldErrors);
    }

    const { scenes, totalDuration, targetEmotion, voiceoverScript } = parsed.data;

    // RAG: query Production Brain for relevant music/sound research
    const ragContext = await queryProductionBrain(
      scenes.map((s) => s.prompt),
      targetEmotion,
    );

    // Build prompt and call Gemini
    const prompt = buildSoundPrompt(scenes, totalDuration, targetEmotion, voiceoverScript, ragContext);
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];

    const rawResponse = await callGemini(parts);

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const output = JSON.parse(cleaned);

    return success(output);
  } catch (err) {
    console.error('[SoundDirector] Error:', err);
    return serverError(err instanceof Error ? err.message : 'Sound direction failed');
  }
}
