import { NextRequest, NextResponse } from 'next/server';
import { generateAudioSchema } from '@/types/generation';
import { generateAudio, getAudioCreditsRequired } from '@/engine/AudioGenerator/AudioGenerator';
import { badRequest, unauthorized, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { emitGenerationEvent } from '@/lib/generation-events';
import { prisma } from '@/lib/db';
import type { AudioDuration } from '@/engine/AudioGenerator/constants';
import type { AudioMode } from '@/engine/AudioGenerator/types';

// Background audio generation — runs after 202 is returned
async function generateAudioInBackground(generationId: string, input: {
  prompt: string;
  mode: AudioMode;
  duration: AudioDuration;
  style?: string;
  sourceAudio?: string;
  lyrics?: string;
  qualityTier: 'starter' | 'pro' | 'agency';
}, userId: string) {
  const startTime = performance.now();

  emitGenerationEvent(generationId, 'status_change', {
    status: 'processing',
    previousStatus: 'queued',
    message: 'Audio generation started.',
  });

  try {
    const result = await generateAudio({
      prompt: input.prompt,
      mode: input.mode,
      duration: input.duration,
      style: input.style,
      sourceAudio: input.sourceAudio,
      lyrics: input.lyrics,
      qualityTier: input.qualityTier,
    }, { generationId });

    const durationMs = Math.round(performance.now() - startTime);

    // Audio doesn't go through CriticAgent scoring (no visual quality to score)
    // Mark as passed directly
    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'passed',
        resultUrl: result.audioUrl,
        durationMs,
        metadata: {
          predictionId: result.predictionId,
          mode: result.mode,
        },
      },
    });

    emitGenerationEvent(generationId, 'completed', {
      status: 'passed',
      previousStatus: 'processing',
      resultUrl: result.audioUrl,
      model: result.mode,
      predictionId: result.predictionId,
      durationMs,
      progress: 100,
      stage: 'Complete',
      message: 'Audio generation complete.',
    });

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId,
      apiKey: '',
      endpoint: '/v1/generate/audio',
      model: `suno-${input.mode}`,
      costToUs: getAudioCreditsRequired(input.duration, input.mode) * 0.5, // Estimated cost ratio
      priceCharged: getAudioCreditsRequired(input.duration, input.mode),
      success: true,
      tier: 'pro',
      durationMs,
    });
  } catch (err) {
    console.error(`[AudioBackground] Generation ${generationId} failed:`, err);
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
      message: `Audio generation failed: ${errorMessage}`,
      progress: 0,
    });

    // Refund credits on failure
    await prisma.creditBalance.update({
      where: { userId },
      data: { videoCredits: { increment: getAudioCreditsRequired(input.duration, input.mode) } },
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
    const parsed = generateAudioSchema.safeParse(body);

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
    const duration = Number(input.duration) as AudioDuration;
    const mode = input.mode as AudioMode;
    const creditsRequired = getAudioCreditsRequired(duration, mode);

    // 3. Check credit balance
    const creditBalance = apiKeyRecord.user.creditBalance;
    if (!creditBalance || creditBalance.videoCredits < creditsRequired) {
      return NextResponse.json(
        { type: 'error', error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient audio credits.' } },
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

    // 6. Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: apiKeyRecord.userId,
        type: 'audio',
        status: 'processing',
        prompt: input.prompt,
        creditsConsumed: creditsRequired,
      },
    });

    // 7. Start generation in background (don't await)
    generateAudioInBackground(generation.id, {
      prompt: input.prompt,
      mode,
      duration,
      style: input.style,
      sourceAudio: input.sourceAudio,
      lyrics: input.lyrics,
      qualityTier: (input.qualityTier ?? tier) as 'starter' | 'pro' | 'agency',
    }, apiKeyRecord.userId).catch(console.error);

    // 8. Return immediately with 202 Accepted + stream URL
    const response = NextResponse.json(
      {
        type: 'success',
        data: {
          generationId: generation.id,
          status: 'processing',
          message: 'Audio generation started. Stream real-time progress or poll for status.',
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
    console.error('[API] POST /v1/generate/audio error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/audio',
      model: 'suno',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return serverError('Failed to generate audio. Please try again.');
  }
}
