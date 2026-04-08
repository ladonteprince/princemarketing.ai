import { NextRequest } from "next/server";
import { z } from "zod";
import { success, badRequest, serverError } from "@/lib/apiResponse";

// ---------------------------------------------------------------------------
// Gemini Score Marker Analyzer — /api/v1/analyze/score-markers
// WHY: After Lyria generates a track and the user picks it, we need real
// musical section boundaries so the Gemini Director can snap scene cuts to
// actual beats (not arbitrary sceneIndex guesses). Gemini 3.1 Pro accepts
// audio input via inlineData and returns structured JSON of section events
// with semantic labels (intro, verse, drop, climax, outro, etc.) plus
// precise timestamps in seconds. These feed the LOCKED MUSICAL TIMELINE
// block of the Director prompt — closing the score-first loop end to end.
// ---------------------------------------------------------------------------

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-3.1-pro-preview";

// Max audio size we'll analyze. A 3-minute stereo MP3 at 192kbps is ~4MB;
// Gemini's inlineData cap is 20MB. We guard at 15MB to leave headroom.
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

// Gemini audio analysis can take a moment for longer clips — give it time.
const GEMINI_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 15_000;

const schema = z.object({
  audioUrl: z.string().url(),
  // Frontend can pass these as hints so the analyzer knows what it's
  // looking at — improves semantic labeling for ambiguous genres.
  genre: z.string().max(100).optional(),
  bpm: z.number().min(40).max(220).optional(),
  // Expected duration in seconds — lets us sanity-check the returned
  // marker timestamps and reject obvious hallucinations.
  expectedDuration: z.number().min(1).max(600).optional(),
});

const ALLOWED_LABELS = [
  "intro",
  "verse",
  "pre-chorus",
  "chorus",
  "build",
  "drop",
  "breakdown",
  "bridge",
  "outro",
  "downbeat",
  "climax",
  "resolution",
  "stinger",
  "silence",
] as const;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function inferMimeType(url: string): string {
  const u = url.toLowerCase();
  if (u.endsWith(".mp3")) return "audio/mp3";
  if (u.endsWith(".wav")) return "audio/wav";
  if (u.endsWith(".m4a") || u.endsWith(".mp4")) return "audio/mp4";
  if (u.endsWith(".ogg") || u.endsWith(".oga")) return "audio/ogg";
  if (u.endsWith(".flac")) return "audio/flac";
  return "audio/mpeg";
}

function buildAnalyzerPrompt(input: {
  genre?: string;
  bpm?: number;
  expectedDuration?: number;
}): string {
  return `You are an elite music producer and commercial editor analyzing a short music cue for video production. Your job is to identify the precise timestamps of every musical section boundary and significant sonic event in the attached audio so that video cuts can land on real beats instead of drifting.

${input.genre ? `Genre hint: ${input.genre}.` : ""}
${input.bpm ? `Tempo hint: approximately ${input.bpm} BPM.` : ""}
${input.expectedDuration ? `Duration hint: approximately ${input.expectedDuration} seconds.` : ""}

LISTEN CAREFULLY to the full track and return a structured list of markers.

For each marker return:
- time: seconds from track start (float, 2 decimals, ±0.15s precision)
- label: one of [${ALLOWED_LABELS.join(", ")}]

RULES:
1. Return 3–12 markers total. Enough to lock scene cuts, not so many it becomes noise.
2. The first marker MUST be at time 0 with an appropriate label (intro, downbeat, or the first identifiable section).
3. Include every major section transition: verse→chorus, build→drop, breakdown→return, bridge, outro.
4. For EDM / trap / hip-hop: identify the PRIMARY drop explicitly with label "drop". If there are multiple drops, the biggest one.
5. For cinematic / orchestral: identify the climax moment explicitly with label "climax".
6. Include downbeats that land on strong musical hits even if they don't change sections — these are prime visual cut points.
7. Timestamps MUST be in strict ascending order with no duplicates.
8. Be precise. These markers drive video cuts — ±0.15s is the tolerance. Listen, don't guess.
9. Do not fabricate events that aren't in the audio. If the track is short and uniform, return fewer markers (minimum 3).
10. Do not return a marker beyond the track's actual end.

Return ONLY valid JSON matching the schema. No prose, no commentary.`;
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

    // 1. Download the audio file. Lyria output URLs are public VPS paths.
    const audioRes = await fetchWithTimeout(
      parsed.data.audioUrl,
      {},
      DOWNLOAD_TIMEOUT_MS,
    );
    if (!audioRes.ok) {
      return serverError(
        `Failed to download audio: ${audioRes.status} ${audioRes.statusText}`,
      );
    }

    const audioBuffer = await audioRes.arrayBuffer();
    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      return badRequest(
        `Audio file too large: ${audioBuffer.byteLength} bytes (max ${MAX_AUDIO_BYTES})`,
      );
    }

    // 2. Encode as base64 for Gemini inlineData.
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const mimeType =
      audioRes.headers.get("content-type") ?? inferMimeType(parsed.data.audioUrl);

    // 3. Call Gemini with structured output. The responseSchema forces
    //    valid JSON so we don't have to parse free-form text.
    const geminiRes = await fetchWithTimeout(
      `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: buildAnalyzerPrompt(parsed.data) },
                { inlineData: { mimeType, data: audioBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                markers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "number" },
                      label: {
                        type: "string",
                        enum: ALLOWED_LABELS as unknown as string[],
                      },
                    },
                    required: ["time", "label"],
                  },
                },
              },
              required: ["markers"],
            },
          },
        }),
      },
      GEMINI_TIMEOUT_MS,
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error("[ScoreMarkers] Gemini error:", geminiRes.status, errText);
      return serverError(`Gemini analysis failed: ${geminiRes.status}`);
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawText) {
      return serverError("Gemini returned no content");
    }

    let parsedJson: { markers?: Array<{ time: number; label: string }> };
    try {
      parsedJson = JSON.parse(rawText);
    } catch (err) {
      console.error("[ScoreMarkers] Failed to parse Gemini JSON:", rawText);
      return serverError("Gemini returned invalid JSON");
    }

    const rawMarkers = parsedJson.markers ?? [];

    // 4. Validate and sanitize — enforce the rules we told Gemini about,
    //    just in case it fudged them. Drop out-of-range times, dedupe,
    //    sort ascending, and cap at 12.
    const seenTimes = new Set<number>();
    const cleaned = rawMarkers
      .filter((m): m is { time: number; label: string } => {
        return (
          typeof m?.time === "number" &&
          m.time >= 0 &&
          Number.isFinite(m.time) &&
          typeof m?.label === "string" &&
          (ALLOWED_LABELS as readonly string[]).includes(m.label)
        );
      })
      .filter((m) => {
        if (
          parsed.data.expectedDuration &&
          m.time > parsed.data.expectedDuration + 1
        ) {
          return false; // past end of track
        }
        return true;
      })
      .map((m) => ({
        time: Math.round(m.time * 100) / 100,
        label: m.label,
      }))
      .filter((m) => {
        if (seenTimes.has(m.time)) return false;
        seenTimes.add(m.time);
        return true;
      })
      .sort((a, b) => a.time - b.time)
      .slice(0, 12);

    // 5. Guarantee a zero-marker even if Gemini missed it.
    if (cleaned.length === 0 || cleaned[0].time > 0.5) {
      cleaned.unshift({ time: 0, label: "intro" });
    }

    if (cleaned.length < 3) {
      console.warn(
        "[ScoreMarkers] Only",
        cleaned.length,
        "valid markers — falling back to heuristic supplement",
      );
      // Supplement sparse results with heuristic markers based on expected
      // duration. Better than returning nothing the Director can use.
      if (parsed.data.expectedDuration) {
        const d = parsed.data.expectedDuration;
        const heuristic = [
          { time: d * 0.25, label: "verse" as const },
          { time: d * 0.5, label: "drop" as const },
          { time: d * 0.75, label: "outro" as const },
        ];
        for (const h of heuristic) {
          if (!cleaned.some((m) => Math.abs(m.time - h.time) < 1)) {
            cleaned.push(h);
          }
        }
        cleaned.sort((a, b) => a.time - b.time);
      }
    }

    return success({
      audioUrl: parsed.data.audioUrl,
      markers: cleaned,
      count: cleaned.length,
      source: "gemini-audio-analysis",
    });
  } catch (err) {
    console.error("[ScoreMarkers] Error:", err);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return serverError(
      isAbort
        ? "Analysis timed out"
        : err instanceof Error
          ? err.message
          : "Marker analysis failed",
    );
  }
}
