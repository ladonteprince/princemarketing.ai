import { refinePrompt } from '@/lib/claude';
import { createGenerationId } from '@/types/ids';
import type { ImageGenerationRequest, ImageGenerationResult } from './types';
import { CREDITS_PER_IMAGE, DEFAULT_ASPECT_RATIO, DEFAULT_STYLE } from './constants';

// ─── Gemini Model Mapping ───────────────────────────────────────────────────
// "Nano Banana Pro" = gemini-3-pro-image-preview   (high-fidelity, ~$0.04/img)
// "Nano Banana 2"   = gemini-3.1-flash-image-preview (fast, ~$0.01/img)

const GEMINI_MODELS = {
  pro: 'gemini-3-pro-image-preview',
  standard: 'gemini-3.1-flash-image-preview',
} as const;

type GeminiQuality = keyof typeof GEMINI_MODELS;

function qualityTierToGeminiQuality(tier: 'starter' | 'pro' | 'agency'): GeminiQuality {
  // Agency and pro tiers get the best model; starter gets the fast model
  return tier === 'starter' ? 'standard' : 'pro';
}

// ─── Gemini Image Generation ────────────────────────────────────────────────

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: { message: string; code: number };
};

async function generateImageWithGemini(
  prompt: string,
  quality: GeminiQuality,
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const model = GEMINI_MODELS[quality];
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as GeminiResponse;

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  // Find the image part in the response
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData) {
    throw new Error('Gemini returned no image data. The model may have refused the prompt.');
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generateImage(
  request: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
  const startTime = performance.now();

  // Step 1: Refine the prompt for production quality
  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'image',
    style: request.style ?? DEFAULT_STYLE,
  });

  // Step 2: Generate image via Gemini
  const quality = qualityTierToGeminiQuality(request.qualityTier);
  const { base64, mimeType } = await generateImageWithGemini(refinedPrompt, quality);

  // Step 3: Build a data URL for the image
  // In production, you'd upload to R2/S3 and return a CDN URL.
  // For now, return as a base64 data URL.
  const imageUrl = `data:${mimeType};base64,${base64}`;

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    imageUrl,
    refinedPrompt,
    model: GEMINI_MODELS[quality],
    durationMs,
  };
}

export function getCreditsRequired(): number {
  return CREDITS_PER_IMAGE;
}

export { DEFAULT_ASPECT_RATIO, DEFAULT_STYLE };
