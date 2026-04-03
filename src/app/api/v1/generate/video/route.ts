import { NextRequest, NextResponse } from 'next/server';
import { generateVideoSchema } from '@/types/generation';
import { generateVideo, getCreditsRequired } from '@/engine/VideoGenerator/VideoGenerator';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { evaluateWithGemini } from '@/engine/CriticAgent/GeminiCritic';
import { badRequest, unauthorized, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { emitGenerationEvent } from '@/lib/generation-events';
import { prisma } from '@/lib/db';
import type { VideoDuration } from '@/engine/VideoGenerator/constants';

// Background video generation — runs after 202 is returned
// State machine: queued → processing → scoring → passed/failed
async function generateVideoInBackground(generationId: string, input: {
  prompt: string;
  negativePrompt?: string;
  duration: VideoDuration;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImages?: readonly string[];
  imageLabels?: readonly string[];
  qualityTier: 'starter' | 'pro' | 'agency';
  mode?: 't2v' | 'i2v' | 'extend' | 'character' | 'video-edit';
  sourceImage?: string;
  sourceVideo?: string;
  seed?: number;
}, userId: string) {
  const startTime = performance.now();

  // Emit: processing started
  emitGenerationEvent(generationId, 'status_change', {
    status: 'processing',
    previousStatus: 'queued',
    message: 'Video generation started.',
  });

  try {
    const result = await generateVideo({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      duration: input.duration,
      aspectRatio: input.aspectRatio as '16:9' | '9:16' | '1:1',
      referenceImages: input.referenceImages,
      imageLabels: input.imageLabels,
      qualityTier: input.qualityTier,
      mode: input.mode,
      sourceImage: input.sourceImage,
      sourceVideo: input.sourceVideo,
      seed: input.seed,
    }, { generationId }); // Pass generationId for progress tracking

    // Transition to scoring state
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: 'scoring' },
    });

    emitGenerationEvent(generationId, 'status_change', {
      status: 'scoring',
      previousStatus: 'processing',
      message: 'Video rendered. Running quality analysis...',
    });

    emitGenerationEvent(generationId, 'scoring', {
      progress: 92,
      stage: 'Quality scoring',
      message: 'Analyzing 12 quality dimensions...',
    });

    // Score the output — but never block a successful generation
    let verdict: any = { passed: true, aggregateScore: 0, dimensions: [], feedback: "Scoring skipped" };
    try {
      verdict = await evaluateGeneration({
        generationId: result.generationId,
        type: 'video',
        prompt: input.prompt,
        resultUrl: result.videoUrl,
        qualityTier: input.qualityTier,
      });
    } catch (scoringErr) {
      console.error(`[VideoBackground] Scoring failed for ${generationId}, marking as passed anyway:`, scoringErr);
    }

    // Enhanced Gemini multimodal scoring — actually watches the video
    // Gemini is more reliable for video analysis (temporal artifacts, flicker, motion)
    if (result.videoUrl) {
      try {
        const geminiVerdict = await evaluateWithGemini({
          generationId,
          type: 'video',
          prompt: input.prompt,
          resultUrl: result.videoUrl,
          qualityTier: input.qualityTier,
        });
        // For video, Gemini's multimodal analysis is superior — it watches every frame
        verdict = geminiVerdict;
        console.log(`[VideoBackground] Gemini scored ${generationId}: ${geminiVerdict.aggregateScore.toFixed(1)}/10`);
      } catch (geminiErr) {
        console.error(`[VideoBackground] Gemini scoring failed for ${generationId}, using Claude score:`, geminiErr);
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    // If the video was successfully generated (has a URL), always mark as passed
    // Scoring is advisory, not a gate
    const finalStatus = result.videoUrl ? 'passed' : (verdict.passed ? 'passed' : 'failed');

    // Update generation record with result
    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: finalStatus,
        resultUrl: result.videoUrl,
        refinedPrompt: result.refinedPrompt,
        score: verdict.aggregateScore,
        durationMs,
        metadata: {
          predictionId: result.predictionId,
          model: result.model,
          score: {
            aggregate: verdict.aggregateScore,
            passed: verdict.passed,
            dimensions: verdict.dimensions,
            feedback: verdict.feedback,
          },
        },
      },
    });

    // Emit: completed with results
    emitGenerationEvent(generationId, 'completed', {
      status: finalStatus,
      previousStatus: 'scoring',
      resultUrl: result.videoUrl,
      score: verdict.aggregateScore,
      feedback: verdict.feedback,
      model: result.model,
      predictionId: result.predictionId,
      durationMs,
      progress: 100,
      stage: 'Complete',
      message: verdict.passed
        ? `Video passed quality check (${verdict.aggregateScore.toFixed(1)}/10)`
        : `Video scored ${verdict.aggregateScore.toFixed(1)}/10 — below ${input.qualityTier} threshold`,
    });

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId,
      apiKey: '',
      endpoint: '/v1/generate/video',
      model: result.model,
      costToUs: input.duration === 5 ? 10 : input.duration === 10 ? 20 : 30,
      priceCharged: getCreditsRequired(input.duration),
      success: true,
      tier: 'pro',
      durationMs,
    });
  } catch (err) {
    console.error(`[VideoBackground] Generation ${generationId} failed:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'failed',
        errorMessage,
      },
    }).catch(console.error);

    // Emit: failed with error details
    emitGenerationEvent(generationId, 'failed', {
      status: 'failed',
      error: errorMessage,
      message: `Generation failed: ${errorMessage}`,
      progress: 0,
    });

    // Refund credits on failure
    await prisma.creditBalance.update({
      where: { userId },
      data: { videoCredits: { increment: getCreditsRequired(input.duration) } },
    }).catch(console.error);
  }
}

export async function POST(request: NextRequest) {
  const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? request.headers.get('x-api-key') ?? '';

  try {
    // 1. Validate API key against database
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Parse and validate
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
    const tier = (apiKeyRecord.user.plan ?? 'starter') as Tier;
    const duration = Number(input.duration) as VideoDuration;
    const creditsRequired = getCreditsRequired(duration);

    // 3. Check credit balance
    const creditBalance = apiKeyRecord.user.creditBalance;
    if (!creditBalance || creditBalance.videoCredits < creditsRequired) {
      return NextResponse.json(
        { type: 'error', error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient video credits.' } },
        { status: 402 },
      );
    }

    // 4. Rate limit check
    const rateCheck = checkRateLimit(rawKey, tier);
    if (!rateCheck.allowed) {
      const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
      const response = rateLimited('Rate limit exceeded. Try again later.');
      response.headers.set('Retry-After', String(retryAfter));
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
      return response;
    }

    // 5. Deduct credits upfront (refunded on failure in background)
    await prisma.creditBalance.update({
      where: { userId: apiKeyRecord.user.id },
      data: { videoCredits: { decrement: creditsRequired } },
    });

    // 6. Create generation record with 'processing' status
    const generation = await prisma.generation.create({
      data: {
        userId: apiKeyRecord.userId,
        type: 'video',
        status: 'processing',
        prompt: input.prompt,
        creditsConsumed: creditsRequired,
      },
    });

    // 7. Start generation in background (don't await)
    generateVideoInBackground(generation.id, {
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      duration,
      aspectRatio: (input.aspectRatio ?? '16:9') as '16:9' | '9:16' | '1:1',
      referenceImages: input.referenceImages,
      imageLabels: input.imageLabels,
      qualityTier: (input.qualityTier ?? tier) as 'starter' | 'pro' | 'agency',
      mode: input.mode,
      sourceImage: input.sourceImage,
      sourceVideo: input.sourceVideo,
      seed: input.seed,
    }, apiKeyRecord.userId).catch(console.error);

    // 8. Return immediately with 202 Accepted + stream URL
    const response = NextResponse.json(
      {
        type: 'success',
        data: {
          generationId: generation.id,
          status: 'processing',
          message: 'Video generation started. Stream real-time progress or poll for status.',
          streamUrl: `/api/v1/generations/${generation.id}/stream`,
          pollUrl: `/api/v1/generations/${generation.id}`,
        },
        meta: {
          generationId: generation.id,
          creditsConsumed: creditsRequired,
        },
      },
      { status: 202 },
    );
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
    return response;
  } catch (err) {
    console.error('[API] POST /v1/generate/video error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
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
