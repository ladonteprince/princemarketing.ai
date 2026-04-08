import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, badRequest, serverError } from '@/lib/apiResponse';

// ---------------------------------------------------------------------------
// Gemini Director — /api/v1/direct
// WHY: Takes a raw scene description from the AI Strategist and enriches it
// with professional cinematography, lighting, composition, and sound design
// direction. This bridges the gap between creative intent and production-ready
// Seedance prompts by applying research-backed frameworks (Attention
// Architecture, emotional shot selection, music/SFX decision trees).
// ---------------------------------------------------------------------------

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-3.1-pro-preview';
const PINECONE_HOST = 'https://prince-production-brain-ya8e9us.svc.aped-4627-b74a.pinecone.io';
const PINECONE_NS = 'production-research';

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('[GeminiDirector] GEMINI_API_KEY is not set');
  return key;
}

// ---------------------------------------------------------------------------
// RAG: Query the Production Brain vector store
// WHY: Every scene decision is informed by the full research corpus — 125
// vectors across neurochemical mapping, cinematography, music/sound design,
// and attention architecture. The Director never operates from memory alone;
// it always consults the primary literature via semantic search.
// ---------------------------------------------------------------------------

async function queryProductionBrain(
  scenePrompt: string,
  emotion: string,
  attentionRole: string,
  topK: number = 5,
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const pineconeKey = process.env.PINECONE_API_KEY;

  if (!openaiKey || !pineconeKey) {
    console.warn('[GeminiDirector] Missing OPENAI_API_KEY or PINECONE_API_KEY — skipping RAG');
    return '';
  }

  try {
    // Construct a rich query that captures the scene's needs
    const query = `${attentionRole} scene targeting ${emotion}: ${scenePrompt}. What camera, lighting, sound design, and neurochemical techniques should be used?`;

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
      console.error('[GeminiDirector] OpenAI embedding failed:', embedRes.status);
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
      console.error('[GeminiDirector] Pinecone search failed:', searchRes.status);
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

    // Format the retrieved context for injection into the Director prompt
    const context = matches
      .filter((m) => m.score > 0.35) // Only relevant matches
      .map((m, i) => {
        const src = m.metadata?.source ?? 'unknown';
        const sec = m.metadata?.section ?? '';
        const content = m.metadata?.content ?? '';
        return `[Source ${i + 1}: ${src} — ${sec}] (relevance: ${m.score.toFixed(2)})\n${content}`;
      })
      .join('\n\n---\n\n');

    return context;
  } catch (err) {
    console.error('[GeminiDirector] RAG query failed:', err);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Input validation
// WHY: Zod ensures the .com frontend sends exactly what we need — no partial
// payloads, no invalid attention roles. Fail fast, fail clearly.
// ---------------------------------------------------------------------------

const AttentionRole = z.enum([
  'stimulation',
  'captivation',
  'anticipation',
  'validation',
  'revelation',
]);

const Format = z.enum(['short-form', 'long-form', 'ad', 'commercial']);

const DirectRequestSchema = z.object({
  scenePrompt: z.string().min(10, 'Scene prompt must be at least 10 characters'),
  attentionRole: AttentionRole,
  emotion: z.string().min(1, 'Emotion is required'),
  format: Format,
  sceneIndex: z.number().int().min(0),
  totalScenes: z.number().int().min(1),
  duration: z.number().min(1).max(120),
  // WHY: Score-first production. When the project has a locked track, the
  // frontend passes the musical section markers plus this scene's start
  // time on the timeline. Gemini uses them to snap camera moves, emotional
  // beats, and audio cues to actual musical boundaries (verse→drop, etc.)
  // instead of arbitrary sceneIndex guesses.
  scoreMarkers: z
    .array(
      z.object({
        time: z.number().min(0),
        label: z.string().max(100),
      }),
    )
    .max(32)
    .optional(),
  sceneStartTime: z.number().min(0).optional(),
});

type DirectRequest = z.infer<typeof DirectRequestSchema>;

// ---------------------------------------------------------------------------
// The Director system prompt
// WHY: Compresses the full cinematography + music/sound design frameworks
// into a single prompt that Gemini can use to make production decisions.
// Every field is backed by the emotional shot selection table and the
// Attention Architecture → production mapping from our internal docs.
// ---------------------------------------------------------------------------

function buildDirectorPrompt(input: DirectRequest): string {
  return `You are the Gemini Director — an elite cinematographer, sound designer, and production director for AI-generated video. Your job is to take a raw scene description and enrich it into a production-ready prompt with precise camera, lighting, composition, and sound direction.

SCENE CONTEXT:
- Scene ${input.sceneIndex + 1} of ${input.totalScenes}
- Duration: ${input.duration}s
- Format: ${input.format}
- Target emotion: ${input.emotion}
- Attention Architecture role: ${input.attentionRole.toUpperCase()}

${input.scoreMarkers && input.scoreMarkers.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCKED MUSICAL TIMELINE — The track is already chosen. Snap to its beats:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Musical section markers (in seconds from track start):
${input.scoreMarkers.map((m) => `  ${m.time.toFixed(2)}s — ${m.label}`).join('\n')}

This scene occupies the window ${(input.sceneStartTime ?? 0).toFixed(2)}s → ${((input.sceneStartTime ?? 0) + input.duration).toFixed(2)}s.

CRITICAL timing rules:
1. Any stinger SFX, impact cut, dolly zoom, crash zoom, or camera hit you
   prescribe MUST land on the nearest marker inside this window — not
   "somewhere in the middle" or "at around 3s". Name the exact timestamp.
2. Musical-section transitions (intro→verse, verse→drop, drop→outro) are
   the strongest cut points — if the boundary falls inside this scene,
   schedule the reveal/climax there, not before or after.
3. For VALIDATION and REVELATION scenes, the payoff frame must land on a
   drop, downbeat, or resolving cadence marker — never on a dead beat.
4. If no marker falls inside this scene's window, the scene is a "sustain"
   beat — prescribe continuous motion (dolly, tracking, steadicam) rather
   than a cut-heavy treatment, because there's no musical event to cut to.

` : ''}RAW SCENE PROMPT:
"${input.scenePrompt}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CINEMATOGRAPHY DECISION TREE — Use this to select shot, camera, and lighting:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SHOT SIZES (emotional effect):
- EWS (Extreme Wide): isolation, scale, insignificance
- WS (Wide): context, environment, establishing
- MLS (Medium Long): full body action, spatial relationship
- MS (Medium): conversational, neutral engagement
- MCU (Medium Close-Up): subtle emotion, intimacy beginning
- CU (Close-Up): deep emotion, forced intimacy, focus on reaction
- ECU (Extreme Close-Up): maximum intensity, detail revelation, tension

CAMERA ANGLES (psychological effect):
- Eye Level: neutral, trustworthy, relatable
- Low Angle: power, dominance, aspiration, heroism
- High Angle: vulnerability, smallness, overview
- Dutch Angle: unease, disorientation, psychological instability
- OTS (Over the Shoulder): POV connection, dialogue intimacy
- POV: immersion, first-person experience

CAMERA MOVEMENTS (storytelling effect):
- Pan: reveal, survey, connection between subjects
- Tilt: reveal height/scale, dramatic unveiling
- Dolly In: increasing intimacy/tension, drawing viewer closer
- Dolly Out: isolation, retreat, context revelation
- Tracking: following action, sustained engagement
- Arc: dimensional reveal, circling subject for authority
- Crane: grand reveal, transcendence, overview to intimate
- Steadicam: fluid, dreamlike, sustained immersion
- Handheld: urgency, chaos, documentary realism
- Dolly Zoom (Vertigo): disorientation, realization, psychological shift

FOCUS (when to use):
- Rack Focus: redirect attention, reveal, transition between subjects
- Shallow DOF: isolate subject, dreamy intimacy, bokeh beauty
- Deep Focus: everything matters, environmental storytelling

LIGHTING (mood mapping):
- Three-Point: professional, clean, controlled
- High-Key: joy, optimism, openness, commercial appeal
- Low-Key: drama, mystery, tension, cinematic depth
- Rembrandt: classic portrait, subtle drama, warmth
- Practical: naturalistic, authentic, motivated light
- Silhouette: mystery, anonymity, dramatic shape
- Color Gels: emotional coding (warm=comfort, cool=tension, magenta=surreal)

COMPOSITION (purpose):
- Rule of Thirds: dynamic balance, natural eye flow
- Center Frame: power, confrontation, symmetry emphasis
- Leading Lines: guide eye, depth, directional energy
- Frame-in-Frame: layered depth, voyeurism, isolation
- Negative Space: isolation, breathing room, emphasis
- Symmetry: order, control, formality, obsession
- Depth Layering: foreground/mid/background for cinematic richness

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMOTIONAL SHOT SELECTION TABLE — Match the target emotion to production:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Intimacy: CU/ECU, slow dolly in, 85mm+, shallow DOF, warm key
- Power: Low angle, MS, slow arc, wide lens 24-35mm, dramatic lighting
- Vulnerability: High angle, CU, slight dolly out, 50mm, soft fill
- Tension: Tight ECU, slow push in or dolly zoom, 85-135mm, Dutch tilt optional, low-key
- Chaos: Varies rapidly, handheld, whip pans, wide 24mm, deep focus, harsh lighting
- Isolation: EWS with negative space, static or slow dolly out, wide 24-35mm, cool tones
- Joy: Wide/medium, crane up or arc, 35-50mm, low angle, bright high-key
- Mystery: Medium to CU, slow tracking, partial reveals, rack focus, low-key with practicals
- Romance: MCU to CU, gentle dolly in, arc, 85mm+, shallow DOF, warm gels
- Shock: Smash cut to CU/ECU, crash zoom or whip pan, dead static, stinger SFX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MUSIC / SOUND DESIGN DECISION TREE:
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

AUDIO TRANSITIONS:
- J-Cut: audio leads before visual cut (anticipation)
- L-Cut: audio lingers after visual cut (resonance)
- Sound Bridge: shared sound connects two scenes
- Crossfade: smooth emotional blending
- Hard Cut: abrupt impact, shock, scene break
- Music Swell: emotional crescendo into next scene

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATTENTION ARCHITECTURE → PRODUCTION MAPPING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STIMULATION (bottom-up attentional capture):
→ High-contrast lighting, camera push-in, stinger/impact SFX, wide to CU transition
→ Goal: Stop the scroll in <2 seconds

CAPTIVATION (information gap):
→ Rack focus reveals, slow tracking, rising ostinato, J-cut audio
→ Goal: Open a question the viewer NEEDS answered

ANTICIPATION (reward prediction building):
→ Dolly in, tightening framing, drone underscore, visual foreshadowing through composition
→ Goal: Build prediction without premature resolution

VALIDATION (payoff/resolution):
→ Lighting shift warm, wider shot reveals, crescendo resolving to silence, posture relaxation
→ Goal: Deliver a payoff MORE surprising than predicted
→ SUGGEST "Lock Endpoints" (interpolate mode) when the final frame composition matters — the user controls exactly where the payoff lands. +50% cost but eliminates AI misalignment on the most important moment.

REVELATION (brand positioning):
→ Steadicam or arc, center framing, leitmotif callback, sound bridge to next piece
→ Goal: Position content as part of a larger ongoing value system
→ STRONGLY SUGGEST "Lock Endpoints" — for brand reveals (logo placement, hero product shot, character pose) the final frame is non-negotiable. Locking endpoints guarantees the brand frame lands as designed. Mention the +50% cost trade-off. Do NOT auto-apply — surface as a recommendation in the suggestionLockEndpoints field below.

LOCK ENDPOINTS RECOMMENDATION RULES:
- Recommend ONLY for VALIDATION and REVELATION scenes
- Recommend when there are exact composition requirements (logo, brand element, specific pose)
- Recommend when this scene needs to match-cut into the next scene (predictable handoff)
- NEVER recommend for STIMULATION/CAPTIVATION/ANTICIPATION scenes — those benefit from organic motion
- Always include the cost note ("+50% cost") so the user makes an informed choice
- The user opts in via the "Lock Endpoints" button on the scene card; you only suggest, never auto-apply

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEUROCHEMICAL PRODUCTION MAPPING — The WHY behind each technique choice:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this to select techniques based on which neurochemical response you want to trigger. Prioritize Priority 1 (well-replicated) over lower tiers.

DOPAMINE (reward prediction error — engagement, "wanting"):
[Priority 1] Musical tension-resolution structure → caudate (anticipation) + NAcc (peak)
[Priority 1] Harmonic expectation violation (deceptive cadences) → striatal prediction error
[Priority 3] Plot twist / visual reveal timing → RPE maximization (theoretical but sound)
Techniques: Ostinato building to unexpected resolution, withhold payoff, misdirection then reveal

NOREPINEPHRINE (arousal — attention, alertness, orienting):
[Priority 2] Sudden high-intensity audio stingers → LC phasic burst → cortical arousal
[Priority 2] Darkness/low-key lighting → amygdala → LC → NE → sympathetic arousal
[Priority 1] Abrupt visual transients (jump cuts, crash zooms) → orienting response
Techniques: Stingers, impacts, hard cuts, handheld, high-contrast shadows, sudden silence

CORTISOL (sustained threat — enhanced threat memory encoding):
[Priority 2] Sustained narrative threat (20+ min, not individual jump scares)
[Priority 1] Cool light (5000K+) → melanopsin → SCN → HPA axis → cortisol
Techniques: Low-key lighting, cool color temperature, unresolvable dread, Dutch angles

OXYTOCIN (social bonding — trust, empathy, prosocial behavior):
[Priority 2] Close-up faces in character-driven emotional narrative → OT-permissive context
[Priority 2] Steadicam footage → rolandic mu desynchronization → embodied simulation
[Priority 1] Warm lighting (2700K) → melatonin-permissive → relaxation + safety
Techniques: CU/MCU of faces, warm practicals, shallow DOF, gentle dolly in, familiar voices

SEROTONIN (mood regulation — satisfaction, well-being):
[Priority 1] Bright, high-luminance scenes → retinal-raphe pathway → DRN serotonin
[Priority 1] Warm color temperature → melatonin-permissive → serotonin-dominant state
Techniques: High-key lighting, bright exteriors, golden hour, resolved musical phrases

ENDORPHINS (pleasure/relief — catharsis, "chills"):
[Priority 1] Musical climax with opioid-mediated emotional peak (Mallik 2017, causal)
[Priority 1] Emotional drama → pain threshold increase (Dunbar 2016, direct measurement)
[Priority 1] Laughter → endorphin release (multiple labs)
Techniques: Crescendo resolving to emotional payoff, comedic smash cuts, cathartic release

ACETYLCHOLINE (focused attention — cue detection, selective processing):
[Priority 3] Rack focus → attentional spotlight redirect (FEF/SPL pathway)
[Priority 3] Selective lighting on one subject → pre-filtered attention
[Priority 3] Audio ducking (music dips for dialogue) → signal-to-noise enhancement
Techniques: Rack focus, shallow DOF, spotlight/practical lighting, audio ducking, isolation

GABA (calming — parasympathetic dominance, cognitive rest):
[Priority 3] Achieved by REMOVING arousal triggers, not by active techniques
[Priority 3] Slow pacing, long takes, ambient drones → auditory habituation
Techniques: Wide shots with negative space, slow dissolves, ambient room tone, silence

EVIDENCE-BASED DECISION HIERARCHY:
Priority 1 — USE DIRECTLY: Shot size→FFA/PPA, AV sync within TBW, musical anticipation-resolution→dopamine, continuity editing, cool vs warm color temperature
Priority 2 — USE WITH MODERATE CONFIDENCE: Bass→somatosensory, silence after sound→orienting, stingers→NE/LC, close-up face+narrative→OT, darkness→amygdala
Priority 3 — USE AS HEURISTICS: Rack focus→ACh, Steadicam→embodied simulation, Dutch angle→stress, GABA via slow pacing
Priority 4 — AVOID STRONG CLAIMS: Specific color hues→amygdala (not supported), infrasound→dread (null in controlled studies)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Using ALL THREE frameworks above (Cinematography + Music/Sound + Neurochemical Mapping), enrich the raw scene prompt. Your decisions should be:
1. WHAT technique to use → from the Cinematography + Music decision trees
2. WHY that technique → from the Neurochemical Mapping (which brain system does it target?)
3. WHEN in the scene → from the Attention Architecture role mapping
4. The SCENE POSITION (${input.sceneIndex + 1}/${input.totalScenes}) affects pacing — early scenes establish, middle scenes build, final scenes resolve
5. The DURATION (${input.duration}s) constrains complexity — shorter scenes need simpler camera moves
6. Prefer Priority 1-2 neurochemical techniques over Priority 3-4

CAMERA SPEC (always include): "Shot on Phase One XF IQ4 150MP medium format, Schneider Kreuznach 80mm f/2.8"
NEGATIVE PROMPT (always include): "NO TEXT. NO SUBTITLES. NO CAPTIONS."

Return ONLY valid JSON:
{
  "enrichedPrompt": "The full production-ready prompt for video generation. Weave together the scene description with all production choices into a cohesive, vivid paragraph. Include the camera spec. End with the negative prompt.",
  "cameraSpec": "Phase One XF IQ4 150MP medium format, Schneider Kreuznach 80mm f/2.8",
  "shotType": "The selected shot size (e.g. ECU, CU, MS, WS)",
  "cameraMovement": "The selected camera movement with speed/direction",
  "lighting": "Lighting setup with color temperature and style",
  "composition": "Composition technique with specific placement details",
  "soundDesign": "Non-diegetic scoring approach and ambient sound",
  "sfx": "Specific sound effects and their timing",
  "negativePrompt": "NO TEXT. NO SUBTITLES. NO CAPTIONS.",
  "neurochemicalTargets": ["List the primary neurochemicals this scene is designed to trigger, e.g. dopamine, oxytocin, norepinephrine"],
  "evidenceTier": "The lowest confidence tier used in your technique selection (Priority 1, 2, 3, or 4)",
  "suggestLockEndpoints": false,
  "lockEndpointsReason": "Only set if suggestLockEndpoints is true. One-sentence why: the exact composition that needs to land + the +50% cost note. Empty string if not suggesting."
}`;
}

// ---------------------------------------------------------------------------
// Gemini API call — mirrors callGemini from GeminiCritic.ts
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
          // WHY: Low temperature for consistent, professional production choices.
          // We want reliable cinematographic decisions, not creative gambling.
          temperature: 0.3,
          maxOutputTokens: 4096,
          // WHY: Forces Gemini to return parseable JSON without markdown wrapping.
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`[GeminiDirector] API error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`[GeminiDirector] No text in response: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return text;
}

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------

type DirectorOutput = {
  enrichedPrompt: string;
  cameraSpec: string;
  shotType: string;
  cameraMovement: string;
  lighting: string;
  composition: string;
  soundDesign: string;
  sfx: string;
  negativePrompt: string;
  neurochemicalTargets: string[];
  evidenceTier: string;
  // WHY: Lock Endpoints recommendation — surfaced to the user as a suggestion
  // for VALIDATION/REVELATION scenes where the final frame composition matters.
  // Never auto-applied. The user opts in via the Lock Endpoints button.
  suggestLockEndpoints?: boolean;
  lockEndpointsReason?: string;
};

// ---------------------------------------------------------------------------
// POST /api/v1/direct
// WHY: The .com frontend calls this after the AI Strategist generates scene
// descriptions. This endpoint enriches each scene with professional production
// direction before the scene is sent to Seedance for video generation.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Parse and validate input
    const body = await request.json();
    const parsed = DirectRequestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        'Invalid request body',
        parsed.error.flatten().fieldErrors,
      );
    }

    const input = parsed.data;

    // 2. RAG: Query the Production Brain for relevant research
    // WHY: This is the black box. Every scene decision is informed by the full
    // research corpus — neurochemistry, cinematography, music, psychology.
    // The Director NEVER operates without consulting the primary literature.
    const retrievedContext = await queryProductionBrain(
      input.scenePrompt,
      input.emotion,
      input.attentionRole,
      5, // top-k results
    );

    // 3. Build the director prompt with RAG context injected
    let systemPrompt = buildDirectorPrompt(input);

    if (retrievedContext) {
      systemPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETRIEVED RESEARCH CONTEXT — Primary literature retrieved for this specific scene:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL: Use the following research findings to inform your production decisions. These are the most relevant passages from the primary neuroscience, cinematography, music/sound design, and attention architecture literature for THIS specific scene. Ground your technique choices in this evidence.

${retrievedContext}`;
    }

    const parts: Array<Record<string, unknown>> = [{ text: systemPrompt }];

    const rawResponse = await callGemini(parts);

    // 3. Parse the structured JSON response
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const directorOutput = JSON.parse(cleaned) as DirectorOutput;

    // 4. Ensure the negative prompt and camera spec are always present
    // WHY: Even if Gemini forgets, we enforce these — they are non-negotiable
    // production requirements (no text overlays, consistent camera identity).
    directorOutput.negativePrompt = 'NO TEXT. NO SUBTITLES. NO CAPTIONS.';
    directorOutput.cameraSpec = 'Phase One XF IQ4 150MP medium format, Schneider Kreuznach 80mm f/2.8';

    const durationMs = Date.now() - startTime;

    return success(directorOutput, { duration_ms: durationMs });
  } catch (err) {
    console.error('[GeminiDirector] Error:', err);

    if (err instanceof SyntaxError) {
      // WHY: JSON parse failures from Gemini mean the model returned malformed
      // output — the frontend should retry, not crash.
      return serverError('Gemini returned unparseable response. Retry.');
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return serverError(message);
  }
}
