import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// ─── Lyria 3 Music Generation ──────────────────────────────────────────────
//
// WHY Lyria over Suno/MuAPI:
//   - Direct Gemini API call eliminates MuAPI middleman latency and cost markup
//   - Lyria 3 Pro supports timestamp-based composition (maps 1:1 to our Sound Skeleton)
//   - Image-to-music enables visual-driven scoring (product photos -> brand music)
//   - No polling needed: single synchronous request returns audio bytes inline
//

// ─── Configuration ─────────────────────────────────────────────────────────

// WHY separate storage config here instead of importing from storage.ts:
//   storage.ts's saveAudio downloads from a URL, but Lyria returns raw base64 bytes.
//   We write directly to disk using the same directory structure for consistency.
const STORAGE_DIR = process.env.STORAGE_DIR ?? '/var/www/princemarketing.ai/public/uploads';
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://princemarketing.ai/uploads';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// WHY two models:
//   - clip: fast 30s max, good for previews and social media snippets
//   - pro: full-length with timestamp control, maps to our Sound Skeleton format
const LYRIA_MODELS = {
  clip: 'lyria-3-clip-preview',
  pro: 'lyria-3-pro-preview',
} as const;

// WHY 120s timeout: Lyria Pro can generate multi-minute tracks.
// The Gemini API processes synchronously (no polling), so the HTTP call itself
// can take a while for longer compositions.
const REQUEST_TIMEOUT_MS = 120_000;

// ─── Types ─────────────────────────────────────────────────────────────────

export type LyriaModel = 'clip' | 'pro';

export type LyriaGenerationParams = {
  prompt: string;
  duration: number;            // seconds
  model?: LyriaModel;          // clip = 30s max, pro = full-length with timestamps
  outputFormat?: 'mp3' | 'wav';
  images?: string[];           // up to 10 image URLs to inspire the music (image-to-music)
};

export type LyriaGenerationResult = {
  audioUrl: string;
  lyrics?: string;
};

// WHY a separate Gemini response type instead of reusing existing types:
//   The Lyria response shape is specific to generateContent with AUDIO modality.
//   Parts can be text (lyrics) or inlineData (audio bytes), and we need both.
type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiContentPart[];
    };
  }>;
  error?: { message: string; code: number };
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getGeminiApiKey(): string {
  // WHY GEMINI_API_KEY specifically: this is the same key already deployed on VPS
  // for other Gemini features (text generation, image generation). No new secret needed.
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Set a valid Gemini API key in .env.',
    );
  }
  return key;
}

function getDateFolder(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Download an image from a URL and return its base64 encoding + MIME type.
 *
 * WHY we download and inline images instead of passing URLs:
 *   The Gemini generateContent API requires inline_data for image parts.
 *   It cannot fetch external URLs on its own.
 */
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  // WHY we normalize MIME type: some servers return charset suffixes or unusual types.
  // Gemini expects clean MIME types like image/jpeg or image/png.
  const mimeType = contentType.split(';')[0].trim();

  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer).toString('base64');

  return { data, mimeType };
}

/**
 * Save raw audio bytes to the uploads directory and return the public URL.
 *
 * WHY not use storage.ts's saveAudio:
 *   saveAudio expects a remote URL to download from. Lyria returns audio as
 *   base64 inline data in the API response, so we write bytes directly to disk.
 *   We mirror the same directory structure (uploads/audio/YYYY-MM-DD/) for consistency.
 */
async function saveAudioBytes(
  base64Data: string,
  ext: 'mp3' | 'wav',
): Promise<string> {
  const dateFolder = getDateFolder();
  const filename = `${crypto.randomUUID()}.${ext}`;

  const dirPath = join(STORAGE_DIR, 'audio', dateFolder);
  const filePath = join(dirPath, filename);

  await ensureDir(dirPath);
  await writeFile(filePath, Buffer.from(base64Data, 'base64'));

  return `${PUBLIC_URL}/audio/${dateFolder}/${filename}`;
}

// ─── Prompt Engineering ────────────────────────────────────────────────────

/**
 * Enhance the user prompt with instrumental guard and duration hint.
 *
 * WHY we append "Instrumental only, no vocals." by default:
 *   Most marketing/production use cases need background music, not songs with vocals.
 *   If the user explicitly mentions vocals or lyrics, we respect that and skip the guard.
 */
function buildLyriaPrompt(prompt: string, duration: number): string {
  const trimmed = prompt.trim();

  // WHY regex check: detect if user intentionally wants vocals/lyrics
  const wantsVocals = /\b(vocal|vocals|sing|singing|lyrics|verse|chorus|rap)\b/i.test(trimmed);

  const instrumentalGuard = wantsVocals ? '' : '\nInstrumental only, no vocals.';

  // WHY duration hint: Lyria uses this to plan the composition structure.
  // Without it, clip defaults to ~15s and pro may generate arbitrary length.
  const durationHint = `\nTarget duration: approximately ${duration} seconds.`;

  return `${trimmed}${instrumentalGuard}${durationHint}`;
}

// ─── Core API Call ─────────────────────────────────────────────────────────

/**
 * Build the Gemini API request body for Lyria music generation.
 *
 * WHY this structure:
 *   - contents[].parts: text prompt + optional image parts for image-to-music
 *   - generationConfig.responseModalities: ["AUDIO", "TEXT"] requests both audio bytes
 *     and any lyrics/metadata the model generates
 *   - responseMimeType: controls output format (wav for lossless, mp3 for smaller files)
 */
function buildRequestBody(
  prompt: string,
  outputFormat: 'mp3' | 'wav',
  imageParts: Array<{ inline_data: { mime_type: string; data: string } }>,
) {
  const textPart = imageParts.length > 0
    ? { text: `An atmospheric track inspired by these visuals. ${prompt}` }
    : { text: prompt };

  const parts: Array<Record<string, unknown>> = [textPart, ...imageParts];

  return {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['AUDIO', 'TEXT'],
      // WHY we set responseMimeType: without it the API may return either format.
      // Explicit control ensures consistent output for downstream processing.
      responseMimeType: outputFormat === 'wav' ? 'audio/wav' : 'audio/mp3',
    },
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Generate music using Google's Lyria 3 model via the Gemini API.
 *
 * WHY Lyria 3 as a Suno replacement:
 *   1. Direct API = no MuAPI middleman (lower latency, lower cost)
 *   2. Synchronous response = no polling loop needed
 *   3. Image-to-music = unique capability for visual-driven brand scoring
 *   4. Timestamp control (Pro) = maps directly to our Sound Skeleton pipeline
 *   5. Same GEMINI_API_KEY already deployed on VPS
 *
 * @param params - Generation parameters
 * @returns Audio URL and optional lyrics
 */
export async function generateWithLyria(
  params: LyriaGenerationParams,
): Promise<LyriaGenerationResult> {
  const {
    prompt,
    duration,
    model = 'clip',
    outputFormat = 'mp3',
    images,
  } = params;

  const apiKey = getGeminiApiKey();
  const modelId = LYRIA_MODELS[model];

  // WHY we validate clip duration: the clip model hard-caps at 30 seconds.
  // Sending a longer duration silently truncates, which confuses users.
  if (model === 'clip' && duration > 30) {
    throw new Error(
      `Lyria clip model supports max 30 seconds. Got ${duration}s. Use model: 'pro' for longer tracks.`,
    );
  }

  // ── Step 1: Prepare image parts (if any) for image-to-music ──

  let imageParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];

  if (images && images.length > 0) {
    // WHY cap at 10: Gemini API limit for inline image parts per request
    if (images.length > 10) {
      throw new Error(`Lyria supports up to 10 reference images. Got ${images.length}.`);
    }

    // WHY parallel download: images are independent, no reason to serialize
    const imageResults = await Promise.all(
      images.map((url) => imageUrlToBase64(url)),
    );

    imageParts = imageResults.map(({ data, mimeType }) => ({
      inline_data: { mime_type: mimeType, data },
    }));
  }

  // ── Step 2: Build prompt with instrumental guard and duration hint ──

  const enhancedPrompt = buildLyriaPrompt(prompt, duration);

  // ── Step 3: Call Gemini API ──

  const requestBody = buildRequestBody(enhancedPrompt, outputFormat, imageParts);
  const url = `${GEMINI_API_BASE}/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Lyria API error (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as GeminiResponse;

  // WHY we check for API-level errors: Gemini wraps some errors in the response body
  // with a 200 status code (e.g., safety filters, quota exceeded).
  if (data.error) {
    throw new Error(
      `Lyria API error (${data.error.code}): ${data.error.message}`,
    );
  }

  // ── Step 4: Parse response — extract audio bytes and optional lyrics ──

  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error(
      'Lyria returned empty response. The prompt may have been filtered by safety checks.',
    );
  }

  let audioBase64: string | null = null;
  let lyrics: string | undefined;

  // WHY we iterate all parts: Lyria may return multiple parts in any order.
  // Text parts contain lyrics/metadata, inlineData parts contain audio bytes.
  for (const part of parts) {
    if ('text' in part && part.text) {
      // WHY we concatenate: Pro model may return lyrics across multiple text parts
      lyrics = lyrics ? `${lyrics}\n${part.text}` : part.text;
    }

    if ('inlineData' in part && part.inlineData) {
      // WHY we take the first audio part only: Lyria returns one audio track per request.
      // Multiple inlineData parts would be unexpected but we guard against it.
      if (!audioBase64) {
        audioBase64 = part.inlineData.data;
      }
    }
  }

  if (!audioBase64) {
    throw new Error(
      'Lyria response contained no audio data. The prompt may need adjustment.',
    );
  }

  // ── Step 5: Save audio to disk ──

  const audioUrl = await saveAudioBytes(audioBase64, outputFormat);

  return { audioUrl, lyrics };
}
