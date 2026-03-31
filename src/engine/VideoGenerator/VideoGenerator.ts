import { refinePrompt } from '@/lib/claude';
import { createGenerationId } from '@/types/ids';
import type { VideoGenerationRequest, VideoGenerationResult } from './types';
import { CREDITS_PER_DURATION, DEFAULT_ASPECT_RATIO, DEFAULT_DURATION } from './constants';
import type { VideoDuration } from './constants';

// ─── MuAPI Seedance Integration ─────────────────────────────────────────────
// All models go through MuAPI at https://api.muapi.ai/api/v1

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

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

  const response = await fetch(`${MUAPI_BASE_URL}/${params.model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MuAPI create prediction error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

async function pollPrediction(
  predictionId: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<MuApiPrediction> {
  const apiKey = getApiKey();
  const maxAttempts = options?.maxAttempts ?? 120;
  const intervalMs = options?.intervalMs ?? 12_000; // 12s between polls

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      { headers: { 'x-api-key': apiKey } },
    );

    if (!response.ok) {
      throw new Error(`MuAPI poll error (${response.status}): ${await response.text()}`);
    }

    const prediction = (await response.json()) as MuApiPrediction;

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
): Promise<VideoGenerationResult> {
  const startTime = performance.now();

  // Step 1: Refine prompt for cinematic quality
  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'video',
  });

  // Step 2: Select model and create prediction
  const model = selectModel(request);
  const predictionId = await createPrediction({
    model,
    prompt: refinedPrompt,
    negativePrompt: request.negativePrompt,
    duration: request.duration,
    aspectRatio: request.aspectRatio,
    referenceImages: request.referenceImages,
  });

  // Step 3: Poll until complete
  const prediction = await pollPrediction(predictionId);

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    videoUrl: prediction.output ?? '',
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
