import { NextRequest } from 'next/server';
import { generateVideoSchema } from '@/types/generation';
import { generateVideo, getCreditsRequired } from '@/engine/VideoGenerator/VideoGenerator';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { success, badRequest, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import type { VideoDuration } from '@/engine/VideoGenerator/constants';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? request.headers.get('x-api-key') ?? '';

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
    const tier = (input.qualityTier ?? 'pro') as Tier;
    const duration = Number(input.duration) as VideoDuration;
    const creditsRequired = getCreditsRequired(duration);

    // 2. Rate limit check
    const rateCheck = checkRateLimit(apiKey, tier);
    if (!rateCheck.allowed) {
      const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
      const response = rateLimited('Rate limit exceeded. Try again later.');
      response.headers.set('Retry-After', String(retryAfter));
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
      return response;
    }

    // 3. Generate video via Seedance 2.0 Omni
    const result = await generateVideo({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      duration,
      aspectRatio: input.aspectRatio as '16:9' | '9:16' | '1:1',
      referenceImages: input.referenceImages,
      qualityTier: input.qualityTier,
    });

    // 4. Score the output
    const verdict = await evaluateGeneration({
      generationId: result.generationId,
      type: 'video',
      prompt: input.prompt,
      resultUrl: result.videoUrl,
      qualityTier: input.qualityTier,
    });

    // 5. Log analytics (non-blocking)
    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: apiKey.slice(0, 12),
      endpoint: '/v1/generate/video',
      model: result.model,
      costToUs: duration === 5 ? 10 : duration === 10 ? 20 : 30, // cents
      priceCharged: creditsRequired,
      success: true,
      tier,
      durationMs: result.durationMs,
    });

    // 6. Return response
    const response = success(
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
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
    return response;
  } catch (err) {
    console.error('[API] POST /v1/generate/video error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: apiKey.slice(0, 12),
      endpoint: '/v1/generate/video',
      model: 'seedance',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return serverError('Failed to generate video. Please try again.');
  }
}
