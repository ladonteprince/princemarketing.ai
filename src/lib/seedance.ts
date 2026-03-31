// Seedance 2.0 Omni integration via MuAPI
// Model: seedance-2.0-omni-reference
// Cost: $0.30/sec

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

type SeedanceCreateParams = {
  prompt: string;
  negativePrompt?: string;
  duration: 5 | 10 | 15;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImages?: ReadonlyArray<string>;
};

type SeedancePrediction = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output?: string;
  error?: string;
};

// 1. Create a new video generation prediction
export async function createPrediction(params: SeedanceCreateParams): Promise<string> {
  const apiKey = process.env.MUAPI_API_KEY;
  if (!apiKey) {
    throw new Error('MUAPI_API_KEY is not configured.');
  }

  // Build negative prompt — always prevent text overlays
  const negativePrompt = [
    'NO TEXT, NO SUBTITLES, NO CAPTIONS',
    params.negativePrompt,
  ].filter(Boolean).join(', ');

  // Build images_list from reference images with @image tags
  const imagesList = params.referenceImages?.map((url, i) => ({
    url,
    tag: `@image${i + 1}`,
  })) ?? [];

  const response = await fetch(`${MUAPI_BASE_URL}/seedance-2.0-omni-reference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      negative_prompt: negativePrompt,
      duration: params.duration,
      aspect_ratio: params.aspectRatio,
      ...(imagesList.length > 0 ? { images_list: imagesList } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Seedance API error (${response.status}): ${body}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
}

// 2. Poll for prediction result — returns the output URL when complete
export async function pollPrediction(
  predictionId: string,
  options?: { maxAttempts?: number; intervalMs?: number }
): Promise<SeedancePrediction> {
  const apiKey = process.env.MUAPI_API_KEY;
  if (!apiKey) {
    throw new Error('MUAPI_API_KEY is not configured.');
  }

  const maxAttempts = options?.maxAttempts ?? 120; // ~20 min at 10s intervals
  const intervalMs = options?.intervalMs ?? 10_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      {
        headers: { 'x-api-key': apiKey },
      },
    );

    if (!response.ok) {
      throw new Error(`Seedance poll error (${response.status}): ${await response.text()}`);
    }

    const prediction = await response.json() as SeedancePrediction;

    if (prediction.status === 'completed') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Video generation failed: ${prediction.error ?? 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Video generation timed out after ${maxAttempts} attempts.`);
}

// 3. Estimate cost for a given duration
export function estimateCost(durationSeconds: number): number {
  return durationSeconds * 0.30;
}

// 4. Convert duration string to credits consumed
export function durationToCredits(duration: 5 | 10 | 15): number {
  const CREDIT_COST_MAP = { 5: 15, 10: 30, 15: 45 } as const;
  return CREDIT_COST_MAP[duration];
}
