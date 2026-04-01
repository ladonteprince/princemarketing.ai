import { saveVideo, saveAudio } from '@/lib/storage';
import { emitGenerationEvent } from '@/lib/generation-events';
import { CREDITS_PER_SYNC_MODE } from '@/engine/AudioGenerator/constants';

// ─── MmAudio v2 Integration via MuAPI ─────────────────────────────────────

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

const MMAUDIO_ENDPOINTS = {
  'text-to-audio': 'mmaudio-v2/text-to-audio',
  'video-to-video': 'mmaudio-v2/video-to-video',
} as const;

export type SyncMode = keyof typeof MMAUDIO_ENDPOINTS;

// Retry configuration (matches engine-wide pattern)
const BASE_DELAY_MS = 500;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_OVERLOAD = 3;

// ─── Timeline Types ───────────────────────────────────────────────────────

export type TimelineTrack = {
  type: 'video' | 'audio' | 'sfx' | 'voiceover';
  url: string;
  startTime: number;    // ms offset from timeline start
  duration: number;     // ms
  label?: string;
};

export type Timeline = {
  tracks: TimelineTrack[];
  totalDuration: number; // ms
};

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

async function pollPrediction(
  predictionId: string,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: (progress: { percent: number; stage: string; message: string }) => void;
  },
): Promise<MuApiPrediction> {
  const apiKey = getApiKey();
  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 8_000;
  const onProgress = options?.onProgress;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithRetry(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      { headers: { 'x-api-key': apiKey } },
      'MuAPI poll (sync)',
    );

    const prediction = (await response.json()) as MuApiPrediction;

    const progressPercent = Math.min(
      Math.round((attempt / Math.max(maxAttempts * 0.6, 1)) * 85),
      85,
    );

    if (onProgress) {
      onProgress({
        percent: prediction.status === 'completed' ? 90 : progressPercent,
        stage: prediction.status === 'pending' ? 'Queued' : 'Syncing audio',
        message: prediction.status === 'pending'
          ? 'Waiting for sync slot...'
          : 'Analyzing video and generating synced audio...',
      });
    }

    if (prediction.status === 'completed') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Audio sync failed: ${prediction.error ?? 'Unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Audio sync timed out after ${maxAttempts} attempts.`);
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Sync audio to a video using MmAudio v2 video-to-video.
 * Takes a video URL and optionally an audio description for guidance.
 * Returns a new video URL with perfectly synced generated audio.
 */
export async function syncAudioToVideo(
  videoUrl: string,
  audioDescription?: string,
  options?: { generationId?: string },
): Promise<string> {
  const apiKey = getApiKey();
  const trackingId = options?.generationId;

  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 10,
      stage: 'Submitting to MmAudio',
      message: 'Submitting video for audio sync...',
    });
  }

  const body: Record<string, unknown> = {
    video: videoUrl,
  };

  if (audioDescription) {
    body.prompt = audioDescription;
  }

  const response = await fetchWithRetry(
    `${MUAPI_BASE_URL}/${MMAUDIO_ENDPOINTS['video-to-video']}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    },
    'MuAPI MmAudio video-to-video',
  );

  const data = (await response.json()) as { id: string };
  const predictionId = data.id;

  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 15,
      stage: 'Syncing audio',
      message: 'MmAudio analyzing video and generating synced audio...',
      predictionId,
      model: MMAUDIO_ENDPOINTS['video-to-video'],
    });
  }

  const prediction = await pollPrediction(predictionId, {
    onProgress: trackingId
      ? (progress) => {
          emitGenerationEvent(trackingId, 'progress', {
            progress: progress.percent,
            stage: progress.stage,
            message: progress.message,
            predictionId,
            model: MMAUDIO_ENDPOINTS['video-to-video'],
          });
        }
      : undefined,
  });

  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 90,
      stage: 'Downloading synced video',
      message: 'Audio synced. Downloading result...',
    });
  }

  const remoteUrl = prediction.output ?? '';
  if (!remoteUrl) {
    throw new Error('MmAudio returned no output URL.');
  }

  return await saveVideo(remoteUrl);
}

/**
 * Generate standalone sound effects from a text description using MmAudio v2.
 * Returns an audio URL.
 */
export async function generateSoundEffects(
  description: string,
  options?: { generationId?: string },
): Promise<string> {
  const apiKey = getApiKey();
  const trackingId = options?.generationId;

  if (trackingId) {
    emitGenerationEvent(trackingId, 'progress', {
      progress: 10,
      stage: 'Submitting to MmAudio',
      message: 'Generating sound effects...',
    });
  }

  const response = await fetchWithRetry(
    `${MUAPI_BASE_URL}/${MMAUDIO_ENDPOINTS['text-to-audio']}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ prompt: description }),
    },
    'MuAPI MmAudio text-to-audio',
  );

  const data = (await response.json()) as { id: string };
  const predictionId = data.id;

  const prediction = await pollPrediction(predictionId, {
    onProgress: trackingId
      ? (progress) => {
          emitGenerationEvent(trackingId, 'progress', {
            progress: progress.percent,
            stage: progress.stage,
            message: progress.message,
            predictionId,
            model: MMAUDIO_ENDPOINTS['text-to-audio'],
          });
        }
      : undefined,
  });

  const remoteUrl = prediction.output ?? '';
  if (!remoteUrl) {
    throw new Error('MmAudio returned no output URL.');
  }

  return await saveAudio(remoteUrl);
}

/**
 * Build a multi-track timeline from separate media assets.
 * This is a data-structure builder — no API calls, just organizes tracks
 * for downstream consumers (e.g. FFmpeg assembly, front-end timeline UI).
 */
export function buildTimeline(tracks: TimelineTrack[]): Timeline {
  const sorted = [...tracks].sort((a, b) => a.startTime - b.startTime);
  const totalDuration = sorted.reduce(
    (max, t) => Math.max(max, t.startTime + t.duration),
    0,
  );

  return { tracks: sorted, totalDuration };
}

export function getSyncCreditsRequired(mode: SyncMode): number {
  return CREDITS_PER_SYNC_MODE[mode];
}

export { MMAUDIO_ENDPOINTS };
