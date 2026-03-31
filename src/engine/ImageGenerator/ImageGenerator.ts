import { refinePrompt } from '@/lib/claude';
import { createGenerationId } from '@/types/ids';
import type { ImageGenerationRequest, ImageGenerationResult } from './types';
import { CREDITS_PER_IMAGE, DEFAULT_ASPECT_RATIO, DEFAULT_STYLE } from './constants';

// Image generation pipeline:
// 1. Refine prompt via Claude
// 2. Generate image (placeholder — swap in real provider)
// 3. Return result with metadata

export async function generateImage(
  request: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
  const startTime = performance.now();

  // Step 1: Refine the prompt for production quality
  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'image',
    style: request.style ?? DEFAULT_STYLE,
  });

  // Step 2: Generate image
  // TODO: Integrate real image generation provider
  // For now, return a placeholder that indicates the system is working
  const imageUrl = `https://api.princemarketing.ai/v1/generations/placeholder-${Date.now()}.png`;

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    imageUrl,
    refinedPrompt,
    durationMs,
  };
}

export function getCreditsRequired(): number {
  return CREDITS_PER_IMAGE;
}

export { DEFAULT_ASPECT_RATIO, DEFAULT_STYLE };
