import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, badRequest, serverError } from '@/lib/apiResponse';

// ---------------------------------------------------------------------------
// Gemini Sound Director — /api/v1/direct/sound
// WHY: After video generation is complete, the Sound Director watches the
// finished video and generates a neurochemically-targeted Sound Skeleton —
// a timestamped blueprint of music cues, SFX hits, and audio transitions
// that maps every second of audio to a specific brain response. This
// skeleton feeds directly into Suno for music generation, ensuring the
// score is not generic background music but a precision instrument designed
// to trigger dopamine, norepinephrine, and endorphins at exact timestamps.
// ---------------------------------------------------------------------------

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-3.1-pro-preview';
const PINECONE_HOST = 'https://prince-production-brain-ya8e9us.svc.aped-4627-b74a.pinecone.io';
const PINECONE_NS = 'production-research';

// WHY: 20MB inline limit matches GeminiCritic.ts — files above this get
// uploaded through the Gemini Files API for resumable processing.
const MAX_INLINE_BYTES = 20 * 1024 * 1024;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('[SoundDirector] GEMINI_API_KEY is not set');
  return key;
}

// ---------------------------------------------------------------------------
// RAG: Query the Production Brain for music/sound design research
// WHY: The Sound Director consults the same 125-vector research corpus as
// the visual Director, but targets music/sound/neurochemistry knowledge.
// This ensures every scoring decision is evidence-backed, not vibes.
// ---------------------------------------------------------------------------

async function queryProductionBrain(
  scenes: Array<{ prompt: string; attentionRole: string }>,
  targetEmotion: string,
  topK: number = 5,
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const pineconeKey = process.env.PINECONE_API_KEY;

  if (!openaiKey || !pineconeKey) {
    console.warn('[SoundDirector] Missing OPENAI_API_KEY or PINECONE_API_KEY — skipping RAG');
    return '';
  }

  try {
    // WHY: Construct a query that captures the sound design needs across all
    // scenes — this gets better semantic matches than querying per-scene.
    const scenesSummary = scenes
      .map((s) => `${s.attentionRole}: ${s.prompt}`)
      .join('; ');

    const query = `Music and sound design for ${targetEmotion} video: ${scenesSummary}. What scoring techniques, SFX, neurochemical sound mapping, and audio transitions should be used?`;

    // Embed the query with text-embedding-3-large
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: query,
      }),
    });

    if (!embedRes.ok) {
      console.error('[SoundDirector] OpenAI embedding failed:', embedRes.status);
      return '';
    }

    const embedData = (await embedRes.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    const vector = embedData.data[0]?.embedding;
    if (!vector) return '';

    // Search Pinecone for the top-k most relevant chunks
    const searchRes = await fetch(`${PINECONE_HOST}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': pineconeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace: PINECONE_NS,
        vector,
        topK,
        includeMetadata: true,
      }),
    });

    if (!searchRes.ok) {
      console.error('[SoundDirector] Pinecone search failed:', searchRes.status);
      return '';
    }

    const searchData = (await searchRes.json()) as {
      matches?: Array<{
        score: number;
        metadata?: { content?: string; source?: string; section?: string };
      }>;
    };

    const matches = searchData.matches ?? [];
    if (matches.length === 0) return '';

    // WHY: Only keep matches above 0.35 relevance — below that, the research
    // is too tangential to improve the Sound Skeleton quality.
    const context = matches
      .filter((m) => m.score > 0.35)
      .map((m, i) => {
        const src = m.metadata?.source ?? 'unknown';
        const sec = m.metadata?.section ?? '';
        const content = m.metadata?.content ?? '';
        return `[Source ${i + 1}: ${src} — ${sec}] (relevance: ${m.score.toFixed(2)})\n${content}`;
      })
      .join('\n\n---\n\n');

    return context;
  } catch (err) {
    console.error('[SoundDirector] RAG query failed:', err);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Input validation
// WHY: Zod ensures the caller sends exactly what we need — scene timing,
// attention roles, and duration. Fail fast, fail clearly.
// ---------------------------------------------------------------------------

const AttentionRole = z.enum([
  'stimulation',
  'captivation',
  'anticipation',
  'validation',
  'revelation',
]);

const SceneSchema = z.object({
  prompt: z.string().min(1, 'Scene prompt is required'),
  startTime: z.number().min(0, 'startTime must be >= 0'),
  endTime: z.number().min(0, 'endTime must be > 0'),
  attentionRole: AttentionRole,
});

const SoundDirectRequestSchema = z.object({
  videoUrl: z.string().url().optional(),
  scenes: z.array(SceneSchema).min(1, 'At least one scene is required'),
  totalDuration: z.number().min(1, 'totalDuration must be at least 1 second').max(300, 'totalDuration must be under 5 minutes'),
  targetEmotion: z.string().min(1, 'targetEmotion is required'),
  voiceoverScript: z.string().optional(),
});

type SoundDirectRequest = z.infer<typeof SoundDirectRequestSchema>;

// ---------------------------------------------------------------------------
// Video download + Gemini upload (mirrors GeminiCritic.ts pattern)
// WHY: When a videoUrl is provided, we download it and send it to Gemini as
// multimodal input so it can WATCH the actual video and match sound design
// to visual beats — cuts, motion peaks, lighting shifts, reveals. This is
// the difference between generic scoring and precision-timed sound design.
// ---------------------------------------------------------------------------

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[SoundDirector] Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function uploadToGeminiFiles(
  buffer: Buffer,
  mimeType: string,
  displayName: string,
): Promise<string> {
  const apiKey = getApiKey();

  // Step 1: Start resumable upload
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(buffer.length),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({
        file: { displayName },
      }),
    },
  );

  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('[SoundDirector] Failed to get upload URL from Files API');
  }

  // Step 2: Upload the bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(buffer.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(buffer),
  });

  const uploadData = (await uploadRes.json()) as {
    file?: { uri?: string; name?: string; state?: string };
  };
  const fileUri = uploadData.file?.uri;
  if (!fileUri) {
    throw new Error(`[SoundDirector] Files API upload failed: ${JSON.stringify(uploadData)}`);
  }

  // Step 3: Poll until the file is ACTIVE (video processing can take a moment)
  const fileName = uploadData.file?.name;
  if (fileName) {
    let state = uploadData.file?.state ?? 'PROCESSING';
    let attempts = 0;
    while (state === 'PROCESSING' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(
        `${GEMINI_API_URL}/${fileName}?key=${apiKey}`,
      );
      const statusData = (await statusRes.json()) as { state?: string };
      state = statusData.state ?? 'ACTIVE';
      attempts++;
    }
    if (state !== 'ACTIVE') {
      throw new Error(`[SoundDirector] File ${fileName} stuck in state: ${state}`);
    }
  }

  return fileUri;
}

// ---------------------------------------------------------------------------
// The Sound Director system prompt
// WHY: Compresses the full music/sound design + neurochemical sound mapping
// frameworks into a single prompt that Gemini uses to generate a
// production-ready Sound Skeleton. Every SFX, music cue, and transition
// is mapped to a specific neurochemical response and attention role.
// ---------------------------------------------------------------------------

function buildSoundDirectorPrompt(input: SoundDirectRequest): string {
  const scenesDescription = input.scenes
    .map(
      (s, i) =>
        `Scene ${i + 1} [${s.startTime.toFixed(1)}s–${s.endTime.toFixed(1)}s] (${s.attentionRole.toUpperCase()}): "${s.prompt}"`,
    )
    .join('\n');

  const voiceoverSection = input.voiceoverScript
    ? `

VOICEOVER SCRIPT (the user will record this as narration):
"${input.voiceoverScript}"

CRITICAL — VOICEOVER HANDLING:
- You MUST leave space for dialogue. Use audio ducking: music drops -6dB during voiceover sections.
- Mark which timestamps have voiceover vs music-only.
- Place voiceover at natural speech points — not over SFX hits or crescendos.
- The voiceover should COMPLEMENT the music, not compete with it.
- Include voiceoverTimestamps in your output with the exact text segments and their timing.`
    : '';

  return `You are the Gemini Sound Director — an elite music supervisor, sound designer, and neurochemical audio architect for AI-generated video. Your job is to watch a completed video (if provided) or analyze scene descriptions, and generate a precision-timed Sound Skeleton that maps every second of audio to a specific brain response.

VIDEO CONTEXT:
- Total Duration: ${input.totalDuration}s
- Target Emotion: ${input.targetEmotion}
- Number of Scenes: ${input.scenes.length}

SCENE BREAKDOWN:
${scenesDescription}
${voiceoverSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MUSIC / SOUND DESIGN FRAMEWORK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING TECHNIQUES (when to use each):
- Leitmotif: Recurring melodic identity for character/brand — use in REVELATION scenes
- Underscore: Subtle emotional bed beneath action — use in CAPTIVATION scenes
- Stinger: Sharp accent on a reveal or beat change — use at scene transitions
- Ostinato: Repeating pattern building tension/momentum — use in CAPTIVATION/ANTICIPATION
- Crescendo: Building intensity toward climax — use in ANTICIPATION→VALIDATION transition
- Counterpoint: Music opposing visual mood for irony/depth — use sparingly for subversion
- Drone: Sustained tension, unease, anticipation — use in ANTICIPATION scenes
- Silence: Maximum impact before or after key moment — use after STIMULATION hit

SFX TYPES (purpose and placement):
- Whoosh: Transitions, fast motion emphasis — place on cuts and camera moves
- Riser: Building anticipation before reveal — place 2-4s before payoff moment
- Impact/Hit: Punctuation on beat changes or reveals — place on first frame of new scene
- Boom/Sub Drop: Bass emphasis for power/arrival moments — place at STIMULATION opening
- Reverse/Suck-Back: Pulling attention inward before release — place before silence gap
- Drone/Pad: Atmospheric tension or calm — layer under ANTICIPATION scenes
- Tick/Clock: Urgency, countdown, time pressure — layer under ANTICIPATION when time-sensitive

AUDIO TRANSITIONS (connecting scenes):
- J-Cut: Audio leads before visual cut (anticipation) — next scene's audio starts 0.5s early
- L-Cut: Audio lingers after visual cut (resonance) — previous scene's audio extends 0.5s
- Sound Bridge: Shared sound connects two scenes — use a sustained note or ambient tone
- Crossfade: Smooth emotional blending — 1-2s overlap between cues
- Hard Cut: Abrupt impact, shock, scene break — use for STIMULATION moments
- Music Swell: Emotional crescendo into next scene — use for VALIDATION→REVELATION

SPOTTING TACTICS:
- Sneak music in behind sound effects — don't start music cold
- End music on natural pauses — not mid-phrase
- Use silence where the visual performance is strong enough alone
- Hard hit points for explosions, reveals, brand logos
- Soft hit points for head turns, dissolves, gentle transitions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEUROCHEMICAL SOUND MAPPING — The WHY behind each audio choice:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOPAMINE (reward prediction error — engagement, "wanting"):
- Musical tension-resolution structure → caudate (anticipation) + NAcc (peak)
- Harmonic expectation violation: Deceptive cadences generate striatal prediction error
- Technique: Ostinato building to unexpected resolution, withhold payoff, misdirection then resolve

NOREPINEPHRINE (arousal — attention, alertness, orienting):
- Sudden stingers → LC phasic burst → cortical arousal
- Sudden silence after established pattern → orienting response
- Technique: Stingers, impacts, hard cuts in audio, sudden silence after 3+ seconds of sound

CORTISOL (sustained threat — enhanced memory encoding):
- Sustained drone underscore → HPA axis activation over 20+ seconds
- Technique: Low-frequency drones, unresolvable harmonic tension, no clear tonal center

OXYTOCIN (social bonding — trust, empathy):
- Warm familiar melodic motif → parasocial bonding
- Soft underscore at 60 BPM → parasympathetic activation
- Technique: Gentle piano or strings, familiar intervals, human voice warmth

SEROTONIN (mood regulation — satisfaction, well-being):
- Resolved major chord progressions → satisfaction signal
- Technique: Clean major resolutions, bright timbres, clear harmonic landing

ENDORPHINS (pleasure/relief — catharsis, "chills"):
- Musical climax with crescendo resolving to emotional payoff (Mallik 2017, causal evidence)
- Technique: Full crescendo → sudden resolution + brief silence = maximum endorphin release

GABA (calming — parasympathetic dominance):
- Ambient room tone, slow tempo, minimal stimulation → parasympathetic dominance
- Technique: Ambient pads, 50-60 BPM, wide stereo field, no sudden transients

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATTENTION ARCHITECTURE SOUND MAPPING — Per-role audio design:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STIMULATION: Sub-drop impact + silence gap (NE spike). Stinger or whoosh on first frame.
CAPTIVATION: Rising ostinato begins, minor key, tempo 80-100 BPM. Riser building.
ANTICIPATION: Drone underscore builds. Add ticking SFX for urgency. Ostinato intensifies.
VALIDATION: Crescendo resolves to warm major chord + brief silence (endorphin release). Bass hit on payoff.
REVELATION: Brand leitmotif callback. 2-3 note signature melody. Sound bridge fading out.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a Sound Skeleton — a timestamped array of audio cues covering every second of the video. Then synthesize those cues into a single Suno-ready prompt that describes the full score.

If you are watching the actual video, match your sound design to the visual beats you observe — cuts, motion peaks, lighting shifts, reveals. Do NOT just follow the scene descriptions; react to what you SEE.

Your decisions should be:
1. WHAT audio element to use → from the Scoring Techniques + SFX Types
2. WHY that element → from the Neurochemical Sound Mapping (which brain system?)
3. WHEN exactly → from the scene timing and Attention Architecture role
4. HOW to transition → from the Audio Transitions framework
5. Prefer Priority 1-2 neurochemical techniques over Priority 3-4

SOUND SKELETON RULES:
- Every timestamp must map to a specific neurochemical target
- Music cues should enter on cuts/transitions, not mid-shot
- Silence is a scoring technique — use it before major hits
- Total duration must match ${input.totalDuration}s exactly
- Style should be instrumental (no vocals/lyrics unless specified)

Return ONLY valid JSON:
{
  "soundSkeleton": [
    {
      "startTime": 0.0,
      "endTime": 2.0,
      "type": "sfx" | "music" | "transition" | "silence",
      "description": "Detailed description of what plays during this window",
      "neurochemicalTarget": "dopamine" | "norepinephrine" | "cortisol" | "oxytocin" | "serotonin" | "endorphins" | "gaba",
      "attentionRole": "stimulation" | "captivation" | "anticipation" | "validation" | "revelation"
    }
  ],
  "sunoPrompt": "A single paragraph describing the entire score for Suno to generate. Include tempo, key, instruments, style, and timing cues. Be specific about what happens when. No lyrics. No vocals (unless the style calls for humming/chanting).",
  "lyriaPrompt": "The SAME score but in Lyria 3 timestamp format. Each section uses [M:SS - M:SS] format. Example: [0:00 - 0:10] Intro: soft lo-fi beat with vinyl crackle. [0:10 - 0:30] Verse: warm piano melody and gentle percussion at 90 BPM. Always end with 'Instrumental only, no vocals.' unless voiceover requires vocal elements.",
  "sunoStyle": "Comma-separated style tags (e.g. cinematic, electronic, orchestral)",
  "sunoDuration": ${input.totalDuration},
  "voiceoverTimestamps": ${input.voiceoverScript ? '[{"startTime": number, "endTime": number, "text": "voiceover segment", "duckMusic": true}]' : '[]'},
  "neurochemicalProfile": {
    "primary": "The dominant neurochemical targeted across the full score",
    "secondary": "The second most targeted neurochemical",
    "tertiary": "The third most targeted neurochemical"
  }
}`;
}

// ---------------------------------------------------------------------------
// Gemini API call — self-contained (mirrors the visual Director pattern)
// WHY: Duplicated rather than imported so this route has zero dependency on
// the engine layer. API routes should be self-contained for deployment safety.
// ---------------------------------------------------------------------------

async function callGemini(parts: Array<Record<string, unknown>>): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(
    `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          // WHY: Low temperature for consistent, production-grade sound design.
          // We want reliable neurochemical targeting, not creative gambling.
          temperature: 0.3,
          // WHY: 8192 tokens because the Sound Skeleton can be long — each
          // scene generates multiple timestamped entries + the full sunoPrompt.
          maxOutputTokens: 8192,
          // WHY: Forces Gemini to return parseable JSON without markdown wrapping.
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`[SoundDirector] API error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`[SoundDirector] No text in response: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return text;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type SoundSkeletonEntry = {
  startTime: number;
  endTime: number;
  type: 'sfx' | 'music' | 'transition' | 'silence';
  description: string;
  neurochemicalTarget: string;
  attentionRole: string;
};

type VoiceoverTimestamp = {
  startTime: number;
  endTime: number;
  text: string;
  duckMusic: boolean;
};

type SoundDirectorOutput = {
  soundSkeleton: SoundSkeletonEntry[];
  sunoPrompt: string;
  lyriaPrompt: string;
  sunoStyle: string;
  sunoDuration: number;
  voiceoverTimestamps: VoiceoverTimestamp[];
  neurochemicalProfile: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
};

// ---------------------------------------------------------------------------
// POST /api/v1/direct/sound
// WHY: The pipeline calls this after video stitching is complete. The Sound
// Skeleton output feeds directly into the AudioGenerator's Suno endpoints
// (create-music for the score, generate-sounds for SFX layers). This is
// the bridge between a finished video and its neurochemically-designed
// soundtrack.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Parse and validate input
    const body = await request.json();
    const parsed = SoundDirectRequestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        'Invalid request body',
        parsed.error.flatten().fieldErrors,
      );
    }

    const input = parsed.data;

    // 2. RAG: Query the Production Brain for music/sound research
    // WHY: Every sound design decision is informed by the research corpus —
    // neurochemical mapping, music psychology, attention architecture.
    // The Sound Director NEVER operates without consulting primary literature.
    const retrievedContext = await queryProductionBrain(
      input.scenes,
      input.targetEmotion,
      5, // top-k results
    );

    // 3. Build the sound director prompt with RAG context injected
    let systemPrompt = buildSoundDirectorPrompt(input);

    if (retrievedContext) {
      systemPrompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETRIEVED RESEARCH CONTEXT — Primary literature retrieved for this specific score:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL: Use the following research findings to inform your sound design decisions. These are the most relevant passages from the primary neuroscience, music psychology, and attention architecture literature for THIS specific video. Ground your technique choices in this evidence.

${retrievedContext}`;
    }

    // 4. Build multimodal parts — video first (if provided), then text prompt
    const parts: Array<Record<string, unknown>> = [];

    if (input.videoUrl) {
      // WHY: Downloading the video and sending it inline/via Files API lets
      // Gemini WATCH the actual footage — matching sound cues to visual cuts,
      // motion peaks, lighting shifts, and reveals. This is precision scoring,
      // not guesswork from scene descriptions alone.
      try {
        const buffer = await downloadToBuffer(input.videoUrl);
        const mimeType = 'video/mp4';

        if (buffer.length <= MAX_INLINE_BYTES) {
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: buffer.toString('base64'),
            },
          });
        } else {
          console.log(
            `[SoundDirector] Video is ${(buffer.length / 1024 / 1024).toFixed(1)}MB — uploading via Files API`,
          );
          const fileUri = await uploadToGeminiFiles(
            buffer,
            mimeType,
            `sound-director-${Date.now()}`,
          );
          parts.push({
            file_data: {
              mime_type: mimeType,
              file_uri: fileUri,
            },
          });
        }

        // WHY: Tell Gemini explicitly that it's watching the video, so it
        // prioritizes visual observation over scene description text.
        systemPrompt += '\n\nYou are watching the actual completed video above. Match your sound design to the visual beats you observe — cuts, motion, lighting, reveals. The scene descriptions are a guide, but trust what you SEE.';
      } catch (err) {
        // WHY: If video download fails, fall back to scene-description-only
        // mode rather than failing the entire request. Degraded but functional.
        console.error('[SoundDirector] Video download failed, proceeding without video:', err);
      }
    }

    parts.push({ text: systemPrompt });

    // 5. Call Gemini
    const rawResponse = await callGemini(parts);

    // 6. Parse the structured JSON response
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const directorOutput = JSON.parse(cleaned) as SoundDirectorOutput;

    // 7. Enforce sunoDuration matches the requested totalDuration
    // WHY: Even if Gemini returns a different duration, the score must match
    // the video length exactly — mismatched audio/video is immediately obvious.
    directorOutput.sunoDuration = input.totalDuration;

    // 8. Ensure voiceoverTimestamps is always an array
    // WHY: Downstream consumers (AudioGenerator) expect a consistent shape.
    if (!Array.isArray(directorOutput.voiceoverTimestamps)) {
      directorOutput.voiceoverTimestamps = [];
    }

    const durationMs = Date.now() - startTime;

    return success(directorOutput, { duration_ms: durationMs });
  } catch (err) {
    console.error('[SoundDirector] Error:', err);

    if (err instanceof SyntaxError) {
      // WHY: JSON parse failures from Gemini mean the model returned malformed
      // output — the caller should retry, not crash.
      return serverError('Gemini returned unparseable response. Retry.');
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return serverError(message);
  }
}
