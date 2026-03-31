import { NextRequest } from 'next/server';
import { generateVideoSchema } from '@/types/generation';
import { generateVideo, getCreditsRequired } from '@/engine/VideoGenerator/VideoGenerator';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { success, badRequest, serverError } from '@/lib/apiResponse';
import type { VideoDuration } from '@/engine/VideoGenerator/constants';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate
    const body = await request.json();
    const parsed = generateVideoSchema.safeParse(body);

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
    const duration = Number(input.duration) as VideoDuration;
    const creditsRequired = getCreditsRequired(duration);

    // 2. Generate video via Seedance 2.0 Omni
    const result = await generateVideo({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      duration,
      aspectRatio: input.aspectRatio as '16:9' | '9:16' | '1:1',
      referenceImages: input.referenceImages,
      qualityTier: input.qualityTier,
    });

    // 3. Score the output
    const verdict = await evaluateGeneration({
      generationId: result.generationId,
      type: 'video',
      prompt: input.prompt,
      resultUrl: result.videoUrl,
      qualityTier: input.qualityTier,
    });

    // 4. Return response
    return success(
      {
        videoUrl: result.videoUrl,
        refinedPrompt: result.refinedPrompt,
        predictionId: result.predictionId,
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
    console.error('[API] POST /v1/generate/video error:', err);
    return serverError('Failed to generate video. Please try again.');
  }
}
