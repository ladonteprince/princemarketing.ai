import { NextRequest } from 'next/server';
import { generateCopySchema } from '@/types/generation';
import { generateCopyContent, getCreditsRequired } from '@/engine/CopyGenerator/CopyGenerator';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { success, badRequest, serverError } from '@/lib/apiResponse';
import type { CopyType, Tone } from '@/engine/CopyGenerator/constants';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate
    const body = await request.json();
    const parsed = generateCopySchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      return badRequest(
        `Invalid request parameters. ${fieldErrors.join('; ')}`,
        parsed.error.flatten(),
      );
    }

    const input = parsed.data;
    const creditsRequired = getCreditsRequired();

    // 2. Generate copy
    const result = await generateCopyContent({
      prompt: input.prompt,
      copyType: input.copyType as CopyType,
      tone: input.tone as Tone,
      maxLength: input.maxLength,
      brand: input.brand,
      qualityTier: input.qualityTier,
    });

    // 3. Score the output
    const verdict = await evaluateGeneration({
      generationId: result.generationId,
      type: 'copy',
      prompt: input.prompt,
      resultContent: result.content,
      qualityTier: input.qualityTier,
    });

    // 4. Return response
    return success(
      {
        content: result.content,
        refinedPrompt: result.refinedPrompt,
        score: {
          aggregate: verdict.aggregateScore,
          passed: verdict.passed,
          dimensions: verdict.dimensions,
          feedback: verdict.feedback,
        },
      },
      {
        generationId: result.generationId,
        creditsConsumed: creditsRequired,
        duration_ms: result.durationMs,
      },
    );
  } catch (err) {
    console.error('[API] POST /v1/generate/copy error:', err);
    return serverError('Failed to generate copy. Please try again.');
  }
}
