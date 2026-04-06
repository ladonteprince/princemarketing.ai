import { refinePrompt } from '@/lib/claude';
import { saveVideo } from '@/lib/storage';
import { createGenerationId } from '@/types/ids';
import { emitGenerationEvent } from '@/lib/generation-events';
import type { VideoGenerationRequest, VideoGenerationResult, VideoGenerationMode } from './types';
import { CREDITS_PER_DURATION, CREDITS_PER_MODE, DEFAULT_ASPECT_RATIO, DEFAULT_DURATION } from './constants';
import type { VideoDuration } from './constants';

// ─── MuAPI Seedance Integration ─────────────────────────────────────────────
// All models go through MuAPI at https://api.muapi.ai/api/v1

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

// Retry configuration (inspired by Claude Code's withRetry.ts)
const BASE_DELAY_MS = 500;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_OVERLOAD = 3;

// Supported Seedance models
// WHY: MuAPI partial endpoint rename (verified via probe Apr 2026):
//   - omni-reference → dropped 'v' prefix: 'seedance-2.0-omni-reference'
//   - watermark-remover → dropped 'v' prefix: 'seedance-2.0-watermark-remover'
//   - t2v / i2v / extend → STILL use 'seedance-v2.0-*' (NOT changed)
//   - character / new-omni → deprecated entirely, route to omni-reference
const SEEDANCE_MODELS = {
  'omni-reference': 'seedance-2.0-omni-reference', // Changed: dropped 'v'
  'new-omni': 'seedance-2.0-omni-reference',       // Deprecated → fallback
  't2v': 'seedance-v2.0-t2v',                      // Unchanged
  'i2v': 'seedance-v2.0-i2v',                      // Unchanged
  'extend': 'seedance-v2.0-extend',                // Unchanged
  'character': 'seedance-2.0-omni-reference',      // Deprecated → use omni-reference
  'video-edit': 'seedance-v2.0-video-edit',        // Unchanged (assuming same pattern)
} as const;

export type SeedanceModelKey = keyof typeof SEEDANCE_MODELS;

type MuApiPrediction = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output?: string;
  outputs?: string[];
  error?: string | null;
};

// ─── Retry with Exponential Backoff ─────────────────────────────────────────

function isTransientError(status: number): boolean {
  return status === 429 || status === 503 || status === 529 || status >= 500;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let lastError: Error | null = null;
  let consecutiveOverload = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      // Track overload errors separately (like Claude Code's 529 tracking)
      if (response.status === 429 || response.status === 529) {
        consecutiveOverload++;
        if (consecutiveOverload >= MAX_CONSECUTIVE_OVERLOAD) {
          const text = await response.text();
          throw new Error(`${label}: ${MAX_CONSECUTIVE_OVERLOAD} consecutive overload errors (${response.status}): ${text}`);
        }
      } else {
        consecutiveOverload = 0;
      }

      if (!isTransientError(response.status) || attempt === MAX_RETRIES) {
        const text = await response.text();
        throw new Error(`${label} error (${response.status}): ${text}`);
      }

      // Exponential backoff: 500ms, 1s, 2s, capped at 30s
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000);
      const jitter = Math.random() * delay * 0.2; // 20% jitter
      console.warn(`[Retry] ${label} attempt ${attempt + 1}/${MAX_RETRIES} after ${response.status}, waiting ${Math.round(delay + jitter)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Network errors are retryable
      if (attempt < MAX_RETRIES && !(lastError.message.includes('consecutive overload'))) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000);
        console.warn(`[Retry] ${label} attempt ${attempt + 1}/${MAX_RETRIES} after network error, waiting ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error(`${label}: exhausted retries`);
}

// ─── MuAPI Helpers ──────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.MUAPI_API_KEY;
  if (!key || key === 'mu-') {
    throw new Error('MUAPI_API_KEY is not configured. Set a valid key in .env.');
  }
  return key;
}

async function createPrediction(params: {
  model: string;
  prompt: string;
  negativePrompt?: string;
  duration: VideoDuration;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImages?: ReadonlyArray<string>;
  sourceImage?: string;
  sourceVideo?: string;
  seed?: number;
  includeAudio?: boolean;
}): Promise<string> {
  const apiKey = getApiKey();

  const negativePrompt = [
    'NO TEXT, NO SUBTITLES, NO CAPTIONS',
    params.negativePrompt,
    params.includeAudio === false ? 'NO BACKGROUND MUSIC, NO SOUND, NO AUDIO, SILENT VIDEO' : undefined,
  ].filter(Boolean).join(', ');

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    negative_prompt: negativePrompt,
    duration: params.duration,
    aspect_ratio: params.aspectRatio,
  };

  // i2v mode: pass source image as `image` parameter
  if (params.sourceImage) {
    body.image = params.sourceImage;
  }

  // extend mode: pass source video as `video` parameter
  if (params.sourceVideo) {
    body.video = params.sourceVideo;
  }

  // Add reference images if provided (for omni-reference and character models)
  if (params.referenceImages && params.referenceImages.length > 0) {
    body.images_list = params.referenceImages.map((url) => url);
  }

  // Seed for reproducible generations
  if (params.seed !== undefined) {
    body.seed = params.seed;
  }

  const response = await fetchWithRetry(
    `${MUAPI_BASE_URL}/${params.model}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    },
    'MuAPI create prediction',
  );

  const data = (await response.json()) as { id?: string; request_id?: string };
  return data.request_id ?? data.id ?? '';
}

// ─── Auto Watermark Removal ────────────────────────────────────────────────
// Runs automatically after every generation. Cost: ~$0.003/clip.

async function removeWatermark(videoUrl: string): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetchWithRetry(
    `${MUAPI_BASE_URL}/seedance-2.0-watermark-remover`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ video: videoUrl }),
    },
    'MuAPI watermark removal',
  );

  const data = (await response.json()) as { id: string };
  const predictionId = data.id;

  const result = await pollPrediction(predictionId, {
    maxAttempts: 60,       // Watermark removal is faster than generation
    intervalMs: 5_000,
  });

  // If watermark removal succeeds, save the clean video; otherwise fall back to original
  if (result.output) {
    try {
      return await saveVideo(result.output);
    } catch (err) {
      console.warn('[Watermark] Failed to save cleaned video, using original:', err);
      return videoUrl;
    }
  }

  return videoUrl;
}

// Progress callback type for streaming updates
export type ProgressCallback = (progress: {
  percent: number;
  stage: string;
  message: string;
  predictionStatus?: string;
}) => void;

async function pollPrediction(
  predictionId: string,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: ProgressCallback;
  },
): Promise<MuApiPrediction> {
  const apiKey = getApiKey();
  const maxAttempts = options?.maxAttempts ?? 120;
  const intervalMs = options?.intervalMs ?? 12_000; // 12s between polls
  const onProgress = options?.onProgress;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithRetry(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      { headers: { 'x-api-key': apiKey } },
      'MuAPI poll',
    );

    const prediction = (await response.json()) as MuApiPrediction;

    // Calculate approximate progress based on attempt count and typical generation time
    const progressPercent = Math.min(
      Math.round((attempt / Math.max(maxAttempts * 0.6, 1)) * 85), // Cap at 85% during generation
      85,
    );

    if (onProgress) {
      onProgress({
        percent: prediction.status === 'completed' ? 90 : progressPercent,
        stage: prediction.status === 'pending' ? 'Queued' : 'Generating video',
        message: prediction.status === 'pending'
          ? 'Waiting for generation slot...'
          : 'Rendering frames...',
        predictionStatus: prediction.status,
      });
    }

    if (prediction.status === 'completed') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Video generation failed: ${prediction.error ?? 'Unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Video generation timed out after ${maxAttempts} attempts.`);
}

// ─── Model Selection Logic ──────────────────────────────────────────────────

function selectModel(request: VideoGenerationRequest): string {
  // If the caller specified a model, use it
  if (request.model && request.model in SEEDANCE_MODELS) {
    return SEEDANCE_MODELS[request.model as SeedanceModelKey];
  }

  // Auto-select based on mode and inputs
  if (request.mode === 'video-edit' && request.sourceVideo) {
    return SEEDANCE_MODELS['video-edit'];
  }

  if (request.mode === 'i2v' && request.sourceImage) {
    return SEEDANCE_MODELS['i2v'];
  }

  if (request.mode === 'extend' && request.sourceVideo) {
    return SEEDANCE_MODELS['extend'];
  }

  if (request.mode === 'character') {
    return SEEDANCE_MODELS['character'];
  }

  // When reference images are provided and no explicit model requested,
  // prefer new-omni (newer model, potentially better quality) over omni-reference
  if (request.referenceImages && request.referenceImages.length > 0) {
    return SEEDANCE_MODELS['new-omni'];
  }

  // Default: text-to-video
  return SEEDANCE_MODELS['t2v'];
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generateVideo(
  request: VideoGenerationRequest,
  options?: { generationId?: string },
): Promise<VideoGenerationResult> {
  const startTime = performance.now();
  const trackingId = options?.generationId;

  // Step 1: Refine prompt for cinematic quality
  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 5,
      stage: 'Refining prompt',
      message: 'Enhancing your prompt for cinematic quality...',
    });
  }

  // Pass reference image tags to prompt refinement so Claude uses @imageN syntax
  const referenceImageContext = request.referenceImages?.map((url, i) => ({
    url,
    label: request.imageLabels?.[i] ?? `reference ${i + 1}`,
  }));

  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'video',
    referenceImages: referenceImageContext,
  });

  // Step 2: Select model and create prediction
  const model = selectModel(request);

  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 10,
      stage: 'Submitting to video model',
      message: 'Submitting to video model...',
    });
  }

  const predictionId = await createPrediction({
    model,
    prompt: refinedPrompt,
    negativePrompt: request.negativePrompt,
    duration: request.duration,
    aspectRatio: request.aspectRatio,
    referenceImages: request.referenceImages,
    sourceImage: request.sourceImage,
    sourceVideo: request.sourceVideo,
    seed: request.seed,
    includeAudio: request.includeAudio,
  });

  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 15,
      stage: 'Rendering video',
      message: 'Video generation in progress. Rendering frames...',
      predictionId,
      model,
    });
  }

  // Step 3: Poll until complete — with progress streaming
  const prediction = await pollPrediction(predictionId, {
    onProgress: trackingId
      ? (progress) => {
          emitGenerationEvent(trackingId, 'progress', {
            progress: progress.percent,
            stage: progress.stage,
            message: progress.message,
            predictionId,
            model,
          });
        }
      : undefined,
  });

  // Step 4: Download video from MuAPI and save locally
  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 90,
      stage: 'Downloading video',
      message: 'Video rendered. Downloading to storage...',
      predictionId,
      model,
    });
  }

  const remoteUrl = prediction.output ?? prediction.outputs?.[0] ?? '';
  let videoUrl = remoteUrl ? await saveVideo(remoteUrl) : '';

  // Step 5: Auto watermark removal (runs on every generation, ~$0.003/clip)
  if (videoUrl) {
    if (trackingId) {
      emitGenerationEvent(trackingId, 'progress', {
        progress: 93,
        stage: 'Removing watermark',
        message: 'Cleaning up watermark...',
        predictionId,
        model,
      });
    }

    try {
      videoUrl = await removeWatermark(videoUrl);
    } catch (err) {
      // Watermark removal is best-effort — don't fail the whole generation
      console.warn('[Watermark] Removal failed, using original video:', err);
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    videoUrl,
    refinedPrompt,
    predictionId,
    model,
    durationMs,
  };
}

export function getCreditsRequired(duration: VideoDuration, mode?: VideoGenerationMode): number {
  if (mode && mode in CREDITS_PER_MODE) {
    return CREDITS_PER_MODE[mode as keyof typeof CREDITS_PER_MODE][duration];
  }
  // Fallback to legacy flat pricing (t2v/i2v rates)
  return CREDITS_PER_DURATION[duration];
}

export { DEFAULT_ASPECT_RATIO, DEFAULT_DURATION, SEEDANCE_MODELS };
