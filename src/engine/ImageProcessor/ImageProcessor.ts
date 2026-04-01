import { createGenerationId } from '@/types/ids';

// ─── MuAPI Image Processing Integration ────────────────────────────────────
// All image tools go through MuAPI at https://api.muapi.ai/api/v1

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

// Retry configuration (matches VideoGenerator pattern)
const BASE_DELAY_MS = 500;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_OVERLOAD = 3;

const IMAGE_TOOLS = {
  'upscale': 'ai-image-upscale',
  'remove-bg': 'ai-background-remover',
  'product-shot': 'ai-product-shot',
  'face-swap': 'ai-image-face-swap',
  'skin-enhance': 'ai-skin-enhancer',
  'extend': 'ai-image-extension',
  'erase-object': 'ai-object-eraser',
  'product-photography': 'ai-product-photography',
} as const;

export type ImageTool = keyof typeof IMAGE_TOOLS;

export type ImageProcessRequest = {
  tool: ImageTool;
  imageUrl: string;         // Source image URL
  prompt?: string;          // For tools that need guidance (product-shot, extend)
  targetImageUrl?: string;  // For face-swap (face source)
};

export type ImageProcessResult = {
  generationId: string;
  imageUrl: string;
  tool: ImageTool;
  durationMs: number;
};

// Credits per image processing tool
const CREDITS_PER_TOOL: Record<ImageTool, number> = {
  'upscale': 2,
  'remove-bg': 1,
  'product-shot': 3,
  'face-swap': 3,
  'skin-enhance': 2,
  'extend': 2,
  'erase-object': 2,
  'product-photography': 3,
};

type MuApiPrediction = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output?: string;
  error?: string;
};

// ─── Retry with Exponential Backoff ─────────────────────────────────────────
// Copied from VideoGenerator — same pattern, same reliability guarantees.

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

// ─── MuAPI Helpers ──────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.MUAPI_API_KEY;
  if (!key || key === 'mu-') {
    throw new Error('MUAPI_API_KEY is not configured. Set a valid key in .env.');
  }
  return key;
}

async function createPrediction(request: ImageProcessRequest): Promise<string> {
  const apiKey = getApiKey();
  const endpoint = IMAGE_TOOLS[request.tool];

  const body: Record<string, unknown> = {
    image: request.imageUrl,
  };

  // Add prompt for tools that accept guidance
  if (request.prompt) {
    body.prompt = request.prompt;
  }

  // Face-swap needs a target face image
  if (request.tool === 'face-swap' && request.targetImageUrl) {
    body.target_image = request.targetImageUrl;
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
    `MuAPI ${request.tool}`,
  );

  const data = (await response.json()) as { id: string };
  return data.id;
}

async function pollPrediction(predictionId: string): Promise<MuApiPrediction> {
  const apiKey = getApiKey();
  const maxAttempts = 60;      // Image processing is faster than video
  const intervalMs = 5_000;    // 5s between polls

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithRetry(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      { headers: { 'x-api-key': apiKey } },
      'MuAPI poll',
    );

    const prediction = (await response.json()) as MuApiPrediction;

    if (prediction.status === 'completed') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Image processing failed: ${prediction.error ?? 'Unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Image processing timed out after ${maxAttempts} attempts.`);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function processImage(request: ImageProcessRequest): Promise<ImageProcessResult> {
  const startTime = performance.now();

  // Step 1: Submit to MuAPI
  const predictionId = await createPrediction(request);

  // Step 2: Poll until complete
  const prediction = await pollPrediction(predictionId);

  const imageUrl = prediction.output ?? '';
  if (!imageUrl) {
    throw new Error('Image processing returned no output.');
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    imageUrl,
    tool: request.tool,
    durationMs,
  };
}

export function getCreditsRequired(tool: ImageTool): number {
  return CREDITS_PER_TOOL[tool];
}

export { IMAGE_TOOLS };
