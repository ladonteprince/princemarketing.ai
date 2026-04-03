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

// WHY: Matching the exact Gemini calling pattern from GeminiCritic.ts
// so we get structured JSON output without markdown wrapping.
function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('[GeminiDirector] GEMINI_API_KEY is not set');
  return key;
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

RAW SCENE PROMPT:
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

REVELATION (brand positioning):
→ Steadicam or arc, center framing, leitmotif callback, sound bridge to next piece
→ Goal: Position content as part of a larger ongoing value system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Using the frameworks above, enrich the raw scene prompt into a production-ready prompt. Consider:
1. The ATTENTION ROLE determines the production approach (see mapping above)
2. The TARGET EMOTION determines shot selection (see emotional shot table above)
3. The SCENE POSITION (${input.sceneIndex + 1}/${input.totalScenes}) affects pacing — early scenes establish, middle scenes build, final scenes resolve
4. The DURATION (${input.duration}s) constrains complexity — shorter scenes need simpler camera moves

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
  "negativePrompt": "NO TEXT. NO SUBTITLES. NO CAPTIONS."
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

    // 2. Build the director prompt and call Gemini
    const systemPrompt = buildDirectorPrompt(input);
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
