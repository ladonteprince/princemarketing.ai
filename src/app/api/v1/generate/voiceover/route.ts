import { NextRequest } from "next/server";
import { z } from "zod";
import { success, badRequest, serverError } from "@/lib/apiResponse";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// ElevenLabs Voiceover — /api/v1/generate/voiceover
// WHY: The AI voice branch of the voiceover fork. When the user picks
// "Generate AI voiceover" in the inline picker, this route takes the
// timestamped script Claude already drafted and renders it through
// ElevenLabs TTS using the chosen voice. Output is a single MP3 aligned
// to the project's musical timeline — the Sound Director mix layer
// then ducks the music bed under it.
// ---------------------------------------------------------------------------

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

// Pre-vetted voice IDs — three distinct characters covering most ad
// briefs. The AI recommends one based on brand tone; the user can still
// override from the picker.
const VOICE_PRESETS: Record<string, { name: string; description: string }> = {
  "21m00Tcm4TlvDq8ikWAM": { name: "Rachel", description: "Warm, conversational, trustworthy — luxury lifestyle, DTC" },
  "pNInz6obpgDQGcFmaJgB": { name: "Adam", description: "Deep, authoritative, cinematic — finance, sports, masculine brands" },
  "AZnzlk1XvdvUeBnXmlld": { name: "Domi", description: "Intimate, sultry, close-miked — beauty, romance, after-dark" },
};

const schema = z.object({
  videoProjectId: z.string(),
  voiceId: z.string().min(10).max(100),
  // Either pass pre-joined text or a timestamped script. If script is
  // provided we join it with natural pauses between entries.
  text: z.string().min(1).max(5000).optional(),
  script: z
    .array(
      z.object({
        startTime: z.number().min(0),
        endTime: z.number().min(0),
        text: z.string().min(1).max(1000),
      }),
    )
    .max(50)
    .optional(),
  modelId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten());
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return serverError("ELEVENLABS_API_KEY not configured");
    }

    // Build the final text. If a timestamped script is provided, join
    // entries with double-newlines — ElevenLabs reads those as pauses.
    const text =
      parsed.data.text ??
      parsed.data.script?.map((s) => s.text).join("\n\n") ??
      "";
    if (!text.trim()) {
      return badRequest("Empty voiceover text");
    }

    // Verify voiceId is in the preset list — we refuse arbitrary IDs so
    // the frontend can't accidentally hit expensive cloned voices.
    if (!VOICE_PRESETS[parsed.data.voiceId]) {
      return badRequest(
        `Unknown voice: ${parsed.data.voiceId}. Allowed: ${Object.keys(VOICE_PRESETS).join(", ")}`,
      );
    }

    const ttsRes = await fetch(
      `${ELEVENLABS_API}/text-to-speech/${parsed.data.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: parsed.data.modelId ?? "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => "");
      console.error("[Voiceover] ElevenLabs error:", ttsRes.status, errText);
      return serverError(`ElevenLabs failed: ${ttsRes.status}`);
    }

    // Save the MP3 to the uploads dir so it gets a stable URL the mix
    // pipeline can reference alongside the music track.
    const buf = Buffer.from(await ttsRes.arrayBuffer());
    const filename = `vo_${parsed.data.videoProjectId}_${Date.now()}.mp3`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "voiceovers");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), buf);

    const publicBase = process.env.PRINCE_PUBLIC_URL ?? "https://princemarketing.ai";
    const audioUrl = `${publicBase}/uploads/voiceovers/${filename}`;

    return success({
      videoProjectId: parsed.data.videoProjectId,
      voiceId: parsed.data.voiceId,
      voiceName: VOICE_PRESETS[parsed.data.voiceId].name,
      audioUrl,
      durationEstimate: Math.ceil(text.length / 15), // rough: ~15 chars/sec
    });
  } catch (err) {
    console.error("[Voiceover] Error:", err);
    return serverError(err instanceof Error ? err.message : "Voiceover failed");
  }
}
