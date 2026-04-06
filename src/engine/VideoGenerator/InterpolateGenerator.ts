import { saveVideo } from '@/lib/storage';
import { emitGenerationEvent } from '@/lib/generation-events';

// ─── Seedance 2 First-Last-Frame Interpolation ─────────────────────────────
// WHY: Interpolation generates a video that smoothly transitions from a
// first-frame image to a last-frame image. Perfect for keyframe-driven
// cinematic workflows (Sanchit/Flow style). We mirror VideoGenerator.ts
// patterns (retry, polling, SSE) but DUPLICATE the helpers locally to avoid
// circular imports back into the main VideoGenerator module.

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

// Retry configuration — same constants as VideoGenerator.ts
const BASE_DELAY_MS = 500;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_OVERLOAD = 3;

// Polling configuration
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

export type InterpolateAspectRatio = '16:9' | '9:16' | '1:1';

export type InterpolateParams = {
  prompt: string;
  firstFrameUrl: string;
  lastFrameUrl: string;
  duration: number;
  aspectRatio: InterpolateAspectRatio;
  fast?: boolean;
  generationId?: string;
};

export type InterpolateResult = {
  generationId: string;
  videoUrl: string;
  durationMs: number;
  predictionId: string;
};

type MuApiPrediction = {
  id?: string;
  request_id?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'succeeded';
  output?: string;
  outputs?: string[];
  result?: { video_url?: string; url?: string; output?: string } | string;
  video_url?: string;
  error?: string | null;
};

// ─── Retry with Exponential Backoff (duplicated from VideoGenerator.ts) ───

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

      if (response.ok) return response;

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

      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000);
      const jitter = Math.random() * delay * 0.2;
      console.warn(`[Retry] ${label} attempt ${attempt + 1}/${MAX_RETRIES} after ${response.status}, waiting ${Math.round(delay + jitter)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && !lastError.message.includes('consecutive overload')) {
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

function getApiKey(): string {
  const key = process.env.MUAPI_API_KEY;
  if (!key || key === 'mu-') {
    throw new Error('MUAPI_API_KEY is not configured. Set a valid key in .env.');
  }
  return key;
}

// ─── Polling helper ────────────────────────────────────────────────────────
// WHY: MuAPI returns a prediction id immediately; the actual video URL is
// only available after the model finishes. We poll the result endpoint until
// status === completed/succeeded or we time out.

async function pollPrediction(
  predictionId: string,
  generationId?: string,
): Promise<string> {
  const apiKey = getApiKey();

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetchWithRetry(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
      },
      'MuAPI poll prediction',
    );

    const data = (await response.json()) as MuApiPrediction;
    const status = data.status;

    // Emit incremental progress (10% → 85%) so the UI sees movement
    if (generationId) {
      const progress = Math.min(10 + Math.floor((attempt / MAX_POLL_ATTEMPTS) * 75), 85);
      emitGenerationEvent(generationId, 'progress', {
        progress,
        stage: 'Interpolating frames',
        message: `Seedance interpolating between frames... (${status ?? 'processing'})`,
      });
    }

    if (status === 'completed' || status === 'succeeded') {
      // Extract video URL from various possible response shapes
      const videoUrl =
        data.video_url ??
        data.output ??
        (typeof data.result === 'string' ? data.result : data.result?.video_url ?? data.result?.url ?? data.result?.output) ??
        (Array.isArray(data.outputs) ? data.outputs[0] : undefined);

      if (!videoUrl) {
        throw new Error(`Prediction ${predictionId} completed but no video URL in response: ${JSON.stringify(data)}`);
      }
      return videoUrl;
    }

    if (status === 'failed') {
      throw new Error(`Prediction ${predictionId} failed: ${data.error ?? 'unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Prediction ${predictionId} timed out after ${MAX_POLL_ATTEMPTS} attempts`);
}

// ─── Public entry: generateInterpolation ───────────────────────────────────

export async function generateInterpolation(
  params: InterpolateParams,
): Promise<InterpolateResult> {
  const startTime = performance.now();
  const {
    prompt,
    firstFrameUrl,
    lastFrameUrl,
    duration,
    aspectRatio,
    fast = true, // WHY: default to fast variant for cost — quality is great
    generationId,
  } = params;

  const apiKey = getApiKey();

  // Pick model variant
  const model = fast
    ? 'seedance-2-first-last-frame-fast'
    : 'seedance-2-first-last-frame';

  if (generationId) {
    emitGenerationEvent(generationId, 'progress', {
      progress: 5,
      stage: 'Submitting',
      message: `Submitting interpolation to Seedance (${fast ? 'fast' : 'quality'})...`,
    });
  }

  // ─── 1. Create prediction ────────────────────────────────────────────
  const body = {
    prompt,
    first_frame_image: firstFrameUrl,
    last_frame_image: lastFrameUrl,
    duration,
    aspect_ratio: aspectRatio,
  };

  const createResponse = await fetchWithRetry(
    `${MUAPI_BASE_URL}/${model}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    },
    'MuAPI create interpolation',
  );

  const created = (await createResponse.json()) as MuApiPrediction;
  const predictionId = created.request_id ?? created.id ?? '';

  if (!predictionId) {
    throw new Error(`MuAPI did not return a prediction id: ${JSON.stringify(created)}`);
  }

  if (generationId) {
    emitGenerationEvent(generationId, 'progress', {
      progress: 10,
      stage: 'Queued',
      message: `Prediction ${predictionId} queued. Polling for result...`,
    });
  }

  // ─── 2. Poll for completion ──────────────────────────────────────────
  const remoteVideoUrl = await pollPrediction(predictionId, generationId);

  if (generationId) {
    emitGenerationEvent(generationId, 'progress', {
      progress: 88,
      stage: 'Downloading',
      message: 'Downloading video from Seedance...',
    });
  }

  // ─── 3. Persist to our storage ───────────────────────────────────────
  // WHY: MuAPI URLs expire. We always download + rehost so generations
  // remain stable for users long after the prediction TTL.
  const videoUrl = await saveVideo(remoteVideoUrl);

  const durationMs = Math.round(performance.now() - startTime);

  if (generationId) {
    emitGenerationEvent(generationId, 'progress', {
      progress: 95,
      stage: 'Stored',
      message: 'Video stored. Finalizing...',
    });
  }

  return {
    generationId: generationId ?? predictionId,
    videoUrl,
    durationMs,
    predictionId,
  };
}
