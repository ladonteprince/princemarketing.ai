import { refinePrompt } from '@/lib/claude';
import { saveAudio } from '@/lib/storage';
import { createGenerationId } from '@/types/ids';
import { emitGenerationEvent } from '@/lib/generation-events';
import type { AudioGenerationRequest, AudioGenerationResult, AudioMode } from './types';
import {
  CREDITS_PER_AUDIO_MODE,
  DEFAULT_AUDIO_DURATION,
  AUDIO_POLL_INTERVAL_MS,
  AUDIO_MAX_POLL_ATTEMPTS,
} from './constants';
import type { AudioDuration } from './constants';

// ─── MuAPI Suno Integration ───────────────────────────────────────────────

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

// Retry configuration (matches VideoGenerator pattern)
const BASE_DELAY_MS = 500;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_OVERLOAD = 3;

// Suno models available through MuAPI
const SUNO_ENDPOINTS = {
  'create-music': 'suno-create-music',
  'remix': 'suno-remix-music',
  'extend': 'suno-extend-music',
  'sounds': 'suno-generate-sounds',
  'lyrics': 'suno-generate-lyrics',
  'add-vocals': 'suno-add-vocals',
  'add-instrumental': 'suno-add-instrumental',
  'mashup': 'suno-generate-mashup',
} as const;

type MuApiPrediction = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output?: string;
  error?: string;
};

// ─── Retry with Exponential Backoff ───────────────────────────────────────

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

// ─── MuAPI Helpers ────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.MUAPI_API_KEY;
  if (!key || key === 'mu-') {
    throw new Error('MUAPI_API_KEY is not configured. Set a valid key in .env.');
  }
  return key;
}

async function createAudioPrediction(params: {
  mode: AudioMode;
  prompt: string;
  duration?: AudioDuration;
  style?: string;
  sourceAudio?: string;
  lyrics?: string;
}): Promise<string> {
  const apiKey = getApiKey();
  const endpoint = SUNO_ENDPOINTS[params.mode];

  const body: Record<string, unknown> = {
    prompt: params.prompt,
  };

  // Duration (not all endpoints support it, but we pass it consistently)
  if (params.duration) {
    body.duration = params.duration;
  }

  // Style hint — appended to prompt for best results with Suno
  if (params.style) {
    body.style = params.style;
  }

  // Source audio for remix/extend/mashup
  if (params.sourceAudio) {
    body.audio = params.sourceAudio;
  }

  // Custom lyrics for add-vocals or create-music
  if (params.lyrics) {
    body.lyrics = params.lyrics;
  }

  const response = await fetchWithRetry(
    `${MUAPI_BASE_URL}/${endpoint}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    },
    `MuAPI Suno ${params.mode}`,
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
  const maxAttempts = options?.maxAttempts ?? AUDIO_MAX_POLL_ATTEMPTS;
  const intervalMs = options?.intervalMs ?? AUDIO_POLL_INTERVAL_MS;
  const onProgress = options?.onProgress;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithRetry(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      { headers: { 'x-api-key': apiKey } },
      'MuAPI poll (audio)',
    );

    const prediction = (await response.json()) as MuApiPrediction;

    // Calculate approximate progress based on attempt count
    const progressPercent = Math.min(
      Math.round((attempt / Math.max(maxAttempts * 0.6, 1)) * 85),
      85,
    );

    if (onProgress) {
      onProgress({
        percent: prediction.status === 'completed' ? 90 : progressPercent,
        stage: prediction.status === 'pending' ? 'Queued' : 'Generating audio',
        message: prediction.status === 'pending'
          ? 'Waiting for audio generation slot...'
          : 'Composing audio...',
        predictionStatus: prediction.status,
      });
    }

    if (prediction.status === 'completed') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Audio generation failed: ${prediction.error ?? 'Unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Audio generation timed out after ${maxAttempts} attempts.`);
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function generateAudio(
  request: AudioGenerationRequest,
  options?: { generationId?: string },
): Promise<AudioGenerationResult> {
  const startTime = performance.now();
  const trackingId = options?.generationId;
  const duration = request.duration ?? DEFAULT_AUDIO_DURATION;

  // Step 1: Refine prompt for production quality
  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 5,
      stage: 'Refining prompt',
      message: 'Enhancing your audio prompt for production quality...',
    });
  }

  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'copy', // Use copy refinement for audio descriptions (text-based)
  });

  // Step 2: Create prediction
  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 10,
      stage: 'Submitting to audio model',
      message: `Submitting to Suno ${request.mode}...`,
    });
  }

  const predictionId = await createAudioPrediction({
    mode: request.mode,
    prompt: refinedPrompt,
    duration,
    style: request.style,
    sourceAudio: request.sourceAudio,
    lyrics: request.lyrics,
  });

  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 15,
      stage: 'Generating audio',
      message: 'Audio generation in progress. Composing...',
      predictionId,
      model: SUNO_ENDPOINTS[request.mode],
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
            model: SUNO_ENDPOINTS[request.mode],
          });
        }
      : undefined,
  });

  // Step 4: Download audio from MuAPI and save locally
  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 90,
      stage: 'Downloading audio',
      message: 'Audio composed. Downloading to storage...',
      predictionId,
      model: SUNO_ENDPOINTS[request.mode],
    });
  }

  const remoteUrl = prediction.output ?? '';
  const audioUrl = remoteUrl ? await saveAudio(remoteUrl) : '';

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    audioUrl,
    durationMs,
    mode: request.mode,
    predictionId,
  };
}

export function getAudioCreditsRequired(
  duration: AudioDuration,
  mode: AudioMode,
): number {
  return CREDITS_PER_AUDIO_MODE[mode][duration];
}

export { SUNO_ENDPOINTS, DEFAULT_AUDIO_DURATION };

// WHY re-export here: allows the existing API route to import from a single module
// and choose between Suno (generateAudio) and Lyria (generateWithLyria) at runtime.
// The existing generateAudio function and all its callers remain untouched.
export { generateWithLyria } from './LyriaGenerator';
