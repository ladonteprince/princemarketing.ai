import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Voice Sample Preview — /api/v1/generate/voice-sample?voiceId=...
// WHY: The inline voiceover picker lets the user hear each voice before
// committing. This endpoint generates a short, fixed sample phrase for
// any of the three preset voices and streams the audio directly so the
// client can use it as an <audio> src or Audio element.
//
// Samples are not saved to disk — they're ephemeral previews. Client-side
// caching (sessionStorage blob URLs) keeps repeat-click cost low.
// ---------------------------------------------------------------------------

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

// Must mirror VOICE_PRESETS in the .com picker component.
const ALLOWED_VOICE_IDS = new Set([
  "21m00Tcm4TlvDq8ikWAM", // Rachel
  "pNInz6obpgDQGcFmaJgB", // Adam
  "AZnzlk1XvdvUeBnXmlld", // Domi
]);

// WHY: A deliberately neutral sample line that doesn't bias the user's
// perception of a voice toward a specific emotion. Same length, same
// rhythm across all voices so the comparison is fair.
const SAMPLE_TEXT =
  "This is how your voiceover will sound. Crisp, present, and unmistakably yours.";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get("voiceId") ?? "";

    if (!ALLOWED_VOICE_IDS.has(voiceId)) {
      return new Response("Unknown voice ID", { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response("ELEVENLABS_API_KEY not configured", { status: 500 });
    }

    const ttsRes = await fetch(
      `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: SAMPLE_TEXT,
          model_id: "eleven_multilingual_v2",
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
      console.error("[VoiceSample] ElevenLabs error:", ttsRes.status, errText);
      return new Response("Sample generation failed", { status: 502 });
    }

    const buffer = await ttsRes.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        // Cache at the edge/browser — voice samples never change.
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("[VoiceSample] Error:", err);
    return new Response("Sample failed", { status: 500 });
  }
}
