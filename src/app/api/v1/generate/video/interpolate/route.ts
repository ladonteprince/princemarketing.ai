import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateInterpolation } from '@/engine/VideoGenerator/InterpolateGenerator';
import { getCreditsRequired } from '@/engine/VideoGenerator/VideoGenerator';
import { badRequest, unauthorized, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { emitGenerationEvent } from '@/lib/generation-events';
import { prisma } from '@/lib/db';
import type { VideoDuration } from '@/engine/VideoGenerator/constants';

// ─── Zod validation ────────────────────────────────────────────────────────
// WHY: Strict validation at the edge prevents bad payloads from burning
// credits or hitting the upstream model with invalid parameters.

const interpolateSchema = z.object({
  prompt: z.string().min(1).max(4000),
  firstFrameUrl: z.string().url(),
  lastFrameUrl: z.string().url(),
  duration: z.number().min(5).max(15).default(5),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  fast: z.boolean().default(true),
});

type InterpolateInput = z.infer<typeof interpolateSchema>;

// ─── Background generation ─────────────────────────────────────────────────
// WHY: Mirror /generate/video — return 202 immediately, run actual video
// rendering in the background, emit SSE events, refund on failure.

async function generateInterpolationInBackground(
  generationId: string,
  input: InterpolateInput,
  userId: string,
  creditsRequired: number,
) {
  const startTime = performance.now();

  emitGenerationEvent(generationId, 'status_change', {
    status: 'processing',
    previousStatus: 'queued',
    message: 'Frame interpolation started.',
  });

  try {
    const result = await generateInterpolation({
      prompt: input.prompt,
      firstFrameUrl: input.firstFrameUrl,
      lastFrameUrl: input.lastFrameUrl,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      fast: input.fast,
      generationId,
    });

    const durationMs = Math.round(performance.now() - startTime);

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'passed',
        resultUrl: result.videoUrl,
        durationMs,
        metadata: {
          predictionId: result.predictionId,
          model: input.fast
            ? 'seedance-2-first-last-frame-fast'
            : 'seedance-2-first-last-frame',
          firstFrameUrl: input.firstFrameUrl,
          lastFrameUrl: input.lastFrameUrl,
        },
      },
    });

    emitGenerationEvent(generationId, 'completed', {
      status: 'passed',
      previousStatus: 'processing',
      resultUrl: result.videoUrl,
      predictionId: result.predictionId,
      durationMs,
      progress: 100,
      stage: 'Complete',
      message: 'Interpolation complete.',
    });

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId,
      apiKey: '',
      endpoint: '/v1/generate/video/interpolate',
      model: input.fast
        ? 'seedance-2-first-last-frame-fast'
        : 'seedance-2-first-last-frame',
      costToUs: input.duration === 5 ? 15 : input.duration === 10 ? 30 : 45,
      priceCharged: creditsRequired,
      success: true,
      tier: 'pro',
      durationMs,
    });
  } catch (err) {
    console.error(`[InterpolateBackground] Generation ${generationId} failed:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: 'failed', errorMessage },
    }).catch(console.error);

    emitGenerationEvent(generationId, 'failed', {
      status: 'failed',
      error: errorMessage,
      message: `Interpolation failed: ${errorMessage}`,
      progress: 0,
    });

    // Refund credits — user shouldn't pay for our failures
    await prisma.creditBalance.update({
      where: { userId },
      data: { videoCredits: { increment: creditsRequired } },
    }).catch(console.error);
  }
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawKey =
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    request.headers.get('x-api-key') ??
    '';

  try {
    // 1. Auth
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Validate body
    const body = await request.json();
    const parsed = interpolateSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return badRequest(
        `Invalid request parameters. ${fieldErrors.join('; ')}`,
        parsed.error.flatten(),
      );
    }

    const input = parsed.data;
    const tier = (apiKeyRecord.user.plan ?? 'starter') as Tier;

    // 3. Credits — interpolation uses 2 frames, charge 1.5x normal video credits
    // WHY: Two-frame interpolation costs more upstream and produces a more
    // controlled (higher value) output than text-to-video.
    const baseCredits = getCreditsRequired(input.duration as VideoDuration);
    const creditsRequired = Math.ceil(baseCredits * 1.5);

    const creditBalance = apiKeyRecord.user.creditBalance;
    if (!creditBalance || creditBalance.videoCredits < creditsRequired) {
      return NextResponse.json(
        {
          type: 'error',
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'Insufficient video credits.',
          },
        },
        { status: 402 },
      );
    }

    // 4. Rate limit
    const rateCheck = checkRateLimit(rawKey, tier);
    if (!rateCheck.allowed) {
      const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
      const response = rateLimited('Rate limit exceeded. Try again later.');
      response.headers.set('Retry-After', String(retryAfter));
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
      return response;
    }

    // 5. Deduct credits upfront (refunded on background failure)
    await prisma.creditBalance.update({
      where: { userId: apiKeyRecord.user.id },
      data: { videoCredits: { decrement: creditsRequired } },
    });

    // 6. Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: apiKeyRecord.userId,
        type: 'video',
        status: 'processing',
        prompt: input.prompt,
        creditsConsumed: creditsRequired,
      },
    });

    // 7. Spawn background generation (fire-and-forget)
    generateInterpolationInBackground(
      generation.id,
      input,
      apiKeyRecord.userId,
      creditsRequired,
    ).catch(console.error);

    // 8. Return 202 Accepted
    const response = NextResponse.json(
      {
        type: 'success',
        data: {
          generationId: generation.id,
          status: 'processing',
          message:
            'Interpolation started. Stream real-time progress or poll for status.',
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
    console.error('[API] POST /v1/generate/video/interpolate error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/video/interpolate',
      model: 'seedance-2-first-last-frame',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return serverError('Failed to start interpolation. Please try again.');
  }
}
