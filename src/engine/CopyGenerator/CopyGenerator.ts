import { generateCopy, refinePrompt } from '@/lib/claude';
import { createGenerationId } from '@/types/ids';
import type { CopyGenerationRequest, CopyGenerationResult } from './types';
import { CREDITS_PER_COPY, DEFAULT_MAX_LENGTH, DEFAULT_TONE } from './constants';

// Copy generation pipeline:
// 1. Refine prompt via Claude
// 2. Generate copy via Claude
// 3. Return result

export async function generateCopyContent(
  request: CopyGenerationRequest,
): Promise<CopyGenerationResult> {
  const startTime = performance.now();

  // Step 1: Refine prompt for the specific copy type
  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'copy',
    tone: request.tone,
  });

  // Step 2: Generate the actual copy
  const content = await generateCopy({
    prompt: refinedPrompt,
    copyType: request.copyType,
    tone: request.tone,
    maxLength: request.maxLength,
    brand: request.brand,
  });

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    content,
    refinedPrompt,
    durationMs,
  };
}

export function getCreditsRequired(): number {
  return CREDITS_PER_COPY;
}

export { DEFAULT_TONE, DEFAULT_MAX_LENGTH };
