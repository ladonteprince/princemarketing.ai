import { NextRequest } from "next/server";
import { z } from "zod";
import { success, badRequest, serverError } from "@/lib/apiResponse";

// ---------------------------------------------------------------------------
// Final Video Critic — /api/v1/critic/review-final
// WHY: After the full pipeline runs (plan → score → VO → clips → stitch),
// the user gets a final MP4 but no feedback on whether it actually WORKS.
// This endpoint takes the stitched video + the original brief + scene
// outline, sends it to Gemini 3.1 Pro as multimodal input, and returns
// structured per-scene critique: attention-architecture score 1-10,
// what works, what doesn't, and a specific regeneration prompt if the
// scene failed its job. The ChatPanel renders this as an inline card
// with "Regenerate this scene" buttons tied to each weak spot.
// ---------------------------------------------------------------------------

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-3.1-pro-preview";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20MB inline limit
const DOWNLOAD_TIMEOUT_MS = 30_000;
const GEMINI_TIMEOUT_MS = 120_000; // Video analysis is slow — give it time.

const schema = z.object({
  videoUrl: z.string().url(),
  brief: z.string().min(10).max(4000),
  scenes: z
    .array(
      z.object({
        index: z.number().int().min(0),
        prompt: z.string().max(2000),
        duration: z.number().min(0),
        attentionRole: z.string().max(50).optional(),
      }),
    )
    .min(1)
    .max(30),
});

const ATTENTION_ROLES = [
  "stimulation",
  "captivation",
  "anticipation",
  "validation",
  "revelation",
] as const;

function buildCriticPrompt(input: {
  brief: string;
  scenes: Array<{ index: number; prompt: string; duration: number; attentionRole?: string }>;
}): string {
  return `You are the Critic — an elite advertising creative director and video editor analyzing a finished commercial against its original brief. You WATCH the attached video and judge whether each scene accomplishes its Attention Architecture role. You are honest, specific, and constructive — but unsparing when something is off.

ORIGINAL BRIEF:
"${input.brief}"

SCENE OUTLINE (in order):
${input.scenes
  .map(
    (s) =>
      `Scene ${s.index + 1} (${s.duration}s${s.attentionRole ? `, ${s.attentionRole.toUpperCase()}` : ""}): ${s.prompt}`,
  )
  .join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATTENTION ARCHITECTURE ROLE GOALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- STIMULATION: Stop the scroll in <2 seconds via high-contrast visual, motion, or pattern break
- CAPTIVATION: Open an information gap the viewer NEEDS answered
- ANTICIPATION: Build reward prediction without premature resolution
- VALIDATION: Deliver a payoff MORE surprising than the viewer predicted
- REVELATION: Position the content as part of a larger ongoing value system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Watch the full video. For each scene, return:
- sceneIndex: which scene (0-indexed)
- score: integer 1-10 (10 = nails the brief AND its attention role; 6 = acceptable; ≤5 = failing)
- strengths: one sentence on what's working
- weaknesses: one sentence on what's failing — concrete visual/audio specifics, not vibes
- fixSuggestion: ONE actionable regeneration prompt delta. Start with "Regenerate with..." if score ≤ 7, otherwise null.

Also return:
- overallScore: integer 1-10 — the commercial as a cohesive whole, not an average
- overallVerdict: ≤50 words — does this commercial land? Would you sign off on it going to air?

RULES:
1. Base every judgment on what you actually see and hear, not on the scene prompt. If the prompt said "Rolex on marble" but the video shows a generic watch on concrete, call it out.
2. Check audio-visual sync: do cuts land on musical beats? Does the voiceover match the visual rhythm?
3. Check reference consistency: if the brief mentions a character/product, does it persist across scenes?
4. Be unsparing on score ≤ 7 scenes. Those are the ones the user will regenerate — vague feedback wastes iterations.
5. Never recommend regenerating a scene that scored ≥ 8. Trust your own grade.

Return ONLY valid JSON matching the schema. No markdown fences, no prose.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten());
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return serverError("GEMINI_API_KEY not configured");
    }

    // 1. Download the stitched video
    const dlController = new AbortController();
    const dlTimer = setTimeout(() => dlController.abort(), DOWNLOAD_TIMEOUT_MS);
    let videoBuffer: ArrayBuffer;
    try {
      const videoRes = await fetch(parsed.data.videoUrl, {
        signal: dlController.signal,
      });
      if (!videoRes.ok) {
        return serverError(`Video download failed: ${videoRes.status}`);
      }
      videoBuffer = await videoRes.arrayBuffer();
    } finally {
      clearTimeout(dlTimer);
    }

    if (videoBuffer.byteLength > MAX_VIDEO_BYTES) {
      return badRequest(
        `Video too large for inline analysis: ${videoBuffer.byteLength} bytes (max ${MAX_VIDEO_BYTES}). Upload via Files API not yet wired for this endpoint.`,
      );
    }

    const videoBase64 = Buffer.from(videoBuffer).toString("base64");

    // 2. Call Gemini with structured JSON output
    const gemController = new AbortController();
    const gemTimer = setTimeout(() => gemController.abort(), GEMINI_TIMEOUT_MS);
    let geminiRes: Response;
    try {
      geminiRes = await fetch(
        `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: gemController.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: buildCriticPrompt(parsed.data) },
                  { inlineData: { mimeType: "video/mp4", data: videoBase64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sceneIndex: { type: "integer" },
                        score: { type: "integer" },
                        strengths: { type: "string" },
                        weaknesses: { type: "string" },
                        fixSuggestion: { type: "string" },
                      },
                      required: ["sceneIndex", "score", "strengths", "weaknesses"],
                    },
                  },
                  overallScore: { type: "integer" },
                  overallVerdict: { type: "string" },
                },
                required: ["scenes", "overallScore", "overallVerdict"],
              },
            },
          }),
        },
      );
    } finally {
      clearTimeout(gemTimer);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error("[FinalCritic] Gemini error:", geminiRes.status, errText);
      return serverError(`Gemini critic failed: ${geminiRes.status}`);
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawText) {
      return serverError("Gemini returned no content");
    }

    let verdict: {
      scenes: Array<{
        sceneIndex: number;
        score: number;
        strengths: string;
        weaknesses: string;
        fixSuggestion?: string;
      }>;
      overallScore: number;
      overallVerdict: string;
    };
    try {
      verdict = JSON.parse(rawText);
    } catch {
      console.error("[FinalCritic] Failed to parse Gemini JSON:", rawText);
      return serverError("Gemini returned invalid JSON");
    }

    // Validate + clamp scores
    const cleanedScenes = (verdict.scenes ?? [])
      .filter((s) => typeof s.sceneIndex === "number" && typeof s.score === "number")
      .map((s) => ({
        sceneIndex: s.sceneIndex,
        score: Math.max(1, Math.min(10, Math.round(s.score))),
        strengths: String(s.strengths ?? ""),
        weaknesses: String(s.weaknesses ?? ""),
        fixSuggestion:
          s.fixSuggestion && s.score <= 7 ? String(s.fixSuggestion) : undefined,
      }))
      .sort((a, b) => a.sceneIndex - b.sceneIndex);

    return success({
      videoUrl: parsed.data.videoUrl,
      scenes: cleanedScenes,
      overallScore: Math.max(1, Math.min(10, Math.round(verdict.overallScore ?? 5))),
      overallVerdict: String(verdict.overallVerdict ?? ""),
      weakSceneCount: cleanedScenes.filter((s) => s.score <= 7).length,
    });
  } catch (err) {
    console.error("[FinalCritic] Error:", err);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return serverError(
      isAbort
        ? "Critic timed out"
        : err instanceof Error
          ? err.message
          : "Critic failed",
    );
  }
}
// Silence the unused warning — ATTENTION_ROLES is referenced in the prompt
// text and kept as a typed export hook for future callers.
void ATTENTION_ROLES;
