// Seedance 2.0 integration via MuAPI — re-exported for backward compatibility.
// The primary integration is now in src/engine/VideoGenerator/VideoGenerator.ts
// This file is kept for any direct imports from other modules.

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

export async function createPrediction(params: SeedanceCreateParams): Promise<string> {
  const apiKey = process.env.MUAPI_API_KEY;
  if (!apiKey || apiKey === 'mu-') {
    throw new Error('MUAPI_API_KEY is not configured.');
  }

  const negativePrompt = [
    'NO TEXT, NO SUBTITLES, NO CAPTIONS',
    params.negativePrompt,
  ].filter(Boolean).join(', ');

  const imagesList = params.referenceImages?.map((url) => url) ?? [];

  const response = await fetch(`${MUAPI_BASE_URL}/seedance-v2.0-omni-reference`, {
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

export async function pollPrediction(
  predictionId: string,
  options?: { maxAttempts?: number; intervalMs?: number }
): Promise<SeedancePrediction> {
  const apiKey = process.env.MUAPI_API_KEY;
  if (!apiKey || apiKey === 'mu-') {
    throw new Error('MUAPI_API_KEY is not configured.');
  }

  const maxAttempts = options?.maxAttempts ?? 120;
  const intervalMs = options?.intervalMs ?? 10_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${MUAPI_BASE_URL}/predictions/${predictionId}/result`,
      { headers: { 'x-api-key': apiKey } },
    );

    if (!response.ok) {
      throw new Error(`Seedance poll error (${response.status}): ${await response.text()}`);
    }

    const prediction = await response.json() as SeedancePrediction;

    if (prediction.status === 'completed') return prediction;
    if (prediction.status === 'failed') {
      throw new Error(`Video generation failed: ${prediction.error ?? 'Unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Video generation timed out after ${maxAttempts} attempts.`);
}

export function estimateCost(durationSeconds: number): number {
  return durationSeconds * 0.30;
}

export function durationToCredits(duration: 5 | 10 | 15): number {
  const CREDIT_COST_MAP = { 5: 15, 10: 30, 15: 45 } as const;
  return CREDIT_COST_MAP[duration];
}
