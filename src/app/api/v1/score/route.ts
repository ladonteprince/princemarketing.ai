import { NextRequest } from 'next/server';
import { z } from 'zod';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { createGenerationId } from '@/types/ids';
import { success, badRequest, serverError } from '@/lib/apiResponse';

const scoreRequestSchema = z.object({
  type: z.enum(['image', 'video', 'copy']),
  prompt: z.string().min(1),
  resultUrl: z.string().url().optional(),
  resultContent: z.string().optional(),
  qualityTier: z.enum(['starter', 'pro', 'agency']).optional().default('pro'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = scoreRequestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        `Invalid request parameters. ${parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
        parsed.error.flatten(),
      );
    }

    const input = parsed.data;

    // Validate that image/video have resultUrl and copy has resultContent
    if ((input.type === 'image' || input.type === 'video') && !input.resultUrl) {
      return badRequest('resultUrl is required for image and video scoring.');
    }
    if (input.type === 'copy' && !input.resultContent) {
      return badRequest('resultContent is required for copy scoring.');
    }

    const verdict = await evaluateGeneration({
      generationId: createGenerationId(crypto.randomUUID()),
      type: input.type,
      prompt: input.prompt,
      resultUrl: input.resultUrl,
      resultContent: input.resultContent,
      qualityTier: input.qualityTier,
    });

    return success({
      aggregateScore: verdict.aggregateScore,
      passed: verdict.passed,
      qualityTier: verdict.qualityTier,
      dimensions: verdict.dimensions,
      feedback: verdict.feedback,
    }, {
      creditsConsumed: 1,
    });
  } catch (err) {
    console.error('[API] POST /v1/score error:', err);
    return serverError('Failed to score asset. Please try again.');
  }
}
