import { NextRequest } from 'next/server';
import { generateImageSchema } from '@/types/generation';
import { generateImage, getCreditsRequired } from '@/engine/ImageGenerator/ImageGenerator';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { success, badRequest, serverError } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const parsed = generateImageSchema.safeParse(body);

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

    // 2. Generate image
    const result = await generateImage({
      prompt: input.prompt,
      style: input.style,
      aspectRatio: input.aspectRatio,
      qualityTier: input.qualityTier,
    });

    // 3. Score the output via Critic Agent
    const verdict = await evaluateGeneration({
      generationId: result.generationId,
      type: 'image',
      prompt: input.prompt,
      resultUrl: result.imageUrl,
      qualityTier: input.qualityTier,
    });

    // 4. Return response
    return success(
      {
        imageUrl: result.imageUrl,
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
    console.error('[API] POST /v1/generate/image error:', err);
    return serverError('Failed to generate image. Please try again.');
  }
}
