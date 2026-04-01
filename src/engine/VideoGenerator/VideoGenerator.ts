import { refinePrompt } from '@/lib/claude';
import { saveVideo } from '@/lib/storage';
import { createGenerationId } from '@/types/ids';
import { emitGenerationEvent } from '@/lib/generation-events';
import type { VideoGenerationRequest, VideoGenerationResult } from './types';
import { CREDITS_PER_DURATION, DEFAULT_ASPECT_RATIO, DEFAULT_DURATION } from './constants';
import type { VideoDuration } from './constants';

// ─── MuAPI Seedance Integration ─────────────────────────────────────────────
// All models go through MuAPI at https://api.muapi.ai/api/v1

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

// Retry configuration (inspired by Claude Code's withRetry.ts)
const BASE_DELAY_MS = 500;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_OVERLOAD = 3;

// Supported Seedance models
const SEEDANCE_MODELS = {
  'omni-reference': 'seedance-v2.0-omni-reference',
  't2v': 'seedance-v2.0-t2v',
  'i2v': 'seedance-v2.0-i2v',
  'extend': 'seedance-v2.0-extend',
  'character': 'seedance-v2.0-character',
} as const;

export type SeedanceModelKey = keyof typeof SEEDANCE_MODELS;

type MuApiPrediction = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output?: string;
  error?: string;
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
}): Promise<string> {
  const apiKey = getApiKey();

  const negativePrompt = [
    'NO TEXT, NO SUBTITLES, NO CAPTIONS',
    params.negativePrompt,
  ].filter(Boolean).join(', ');

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    negative_prompt: negativePrompt,
    duration: params.duration,
    aspect_ratio: params.aspectRatio,
  };

  // Add reference images if provided (for omni-reference and character models)
  if (params.referenceImages && params.referenceImages.length > 0) {
    body.images_list = params.referenceImages.map((url) => url);
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

  const data = (await response.json()) as { id: string };
  return data.id;
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

  // Auto-select based on inputs
  if (request.referenceImages && request.referenceImages.length > 0) {
    return SEEDANCE_MODELS['omni-reference'];
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

  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'video',
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

  const remoteUrl = prediction.output ?? '';
  const videoUrl = remoteUrl ? await saveVideo(remoteUrl) : '';

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

export function getCreditsRequired(duration: VideoDuration): number {
  return CREDITS_PER_DURATION[duration];
}

export { DEFAULT_ASPECT_RATIO, DEFAULT_DURATION, SEEDANCE_MODELS };
