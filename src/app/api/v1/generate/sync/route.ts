import { NextRequest, NextResponse } from 'next/server';
import { generateSyncSchema } from '@/types/generation';
import { syncAudioToVideo, getSyncCreditsRequired } from '@/engine/TimelineSync/TimelineSync';
import { badRequest, unauthorized, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { emitGenerationEvent } from '@/lib/generation-events';
import { prisma } from '@/lib/db';

// Background sync — runs after 202 is returned
async function syncInBackground(generationId: string, input: {
  videoUrl: string;
  audioDescription?: string;
}, userId: string) {
  const startTime = performance.now();
  const creditsRequired = getSyncCreditsRequired('video-to-video');

  emitGenerationEvent(generationId, 'status_change', {
    status: 'processing',
    previousStatus: 'queued',
    message: 'Audio-video sync started.',
  });

  try {
    const syncedVideoUrl = await syncAudioToVideo(
      input.videoUrl,
      input.audioDescription,
      { generationId },
    );

    const durationMs = Math.round(performance.now() - startTime);

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'passed',
        resultUrl: syncedVideoUrl,
        durationMs,
        metadata: {
          mode: 'video-to-video',
          sourceVideoUrl: input.videoUrl,
        },
      },
    });

    emitGenerationEvent(generationId, 'completed', {
      status: 'passed',
      previousStatus: 'processing',
      resultUrl: syncedVideoUrl,
      model: 'mmaudio-v2',
      durationMs,
      progress: 100,
      stage: 'Complete',
      message: 'Audio-video sync complete.',
    });

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId,
      apiKey: '',
      endpoint: '/v1/generate/sync',
      model: 'mmaudio-v2',
      costToUs: creditsRequired * 0.5,
      priceCharged: creditsRequired,
      success: true,
      tier: 'pro',
      durationMs,
    });
  } catch (err) {
    console.error(`[SyncBackground] Generation ${generationId} failed:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'failed',
        errorMessage,
      },
    }).catch(console.error);

    emitGenerationEvent(generationId, 'failed', {
      status: 'failed',
      error: errorMessage,
      message: `Audio sync failed: ${errorMessage}`,
      progress: 0,
    });

    // Refund credits on failure
    await prisma.creditBalance.update({
      where: { userId },
      data: { audioCredits: { increment: creditsRequired } },
    }).catch(console.error);
  }
}

export async function POST(request: NextRequest) {
  const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? request.headers.get('x-api-key') ?? '';

  try {
    // 1. Validate API key
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Parse and validate
    const body = await request.json();
    const parsed = generateSyncSchema.safeParse(body);

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
    const creditsRequired = getSyncCreditsRequired('video-to-video');

    // 3. Check credit balance
    const creditBalance = apiKeyRecord.user.creditBalance;
    if (!creditBalance || creditBalance.audioCredits < creditsRequired) {
      return NextResponse.json(
        { type: 'error', error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient audio credits for sync.' } },
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

    // 5. Deduct credits
    await prisma.creditBalance.update({
      where: { userId: apiKeyRecord.user.id },
      data: { audioCredits: { decrement: creditsRequired } },
    });

    // 6. Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: apiKeyRecord.userId,
        type: 'audio',
        status: 'processing',
        prompt: input.audioDescription ?? `Sync audio to video: ${input.videoUrl}`,
        creditsConsumed: creditsRequired,
      },
    });

    // 7. Start sync in background
    syncInBackground(generation.id, {
      videoUrl: input.videoUrl,
      audioDescription: input.audioDescription,
    }, apiKeyRecord.userId).catch(console.error);

    // 8. Return 202 Accepted
    const response = NextResponse.json(
      {
        type: 'success',
        data: {
          generationId: generation.id,
          status: 'processing',
          message: 'Audio-video sync started. Stream real-time progress or poll for status.',
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
    console.error('[API] POST /v1/generate/sync error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/sync',
      model: 'mmaudio-v2',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return serverError('Failed to sync audio. Please try again.');
  }
}
