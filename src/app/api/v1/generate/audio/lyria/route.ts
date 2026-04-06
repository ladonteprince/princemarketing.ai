import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateWithLyria } from '@/engine/AudioGenerator/LyriaGenerator';
import { badRequest, unauthorized, rateLimited, serverError, success } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { emitGenerationEvent } from '@/lib/generation-events';
import { prisma } from '@/lib/db';

// ─── Lyria 3 Music Generation Endpoint ─────────────────────────────────────
//
// WHY a separate route from /audio (Suno):
//   Lyria has fundamentally different params (model variants, image-to-music,
//   output format) and a synchronous response shape. Forcing it through the
//   Suno schema would leak Suno-specific fields into a Google API call.
//
// WHY synchronous (no background task) unlike the Suno route:
//   Lyria returns audio bytes inline in a single Gemini call (typically
//   10-40s). There's no polling loop, so the 202+stream pattern adds
//   complexity without benefit. We still emit generation events so the
//   frontend's existing event stream stays consistent.

// WHY Zod inline rather than importing from types/generation:
//   Lyria's schema is unique to this endpoint and not shared with the Suno
//   pipeline. Co-locating it keeps the contract obvious at the call site.
const lyriaSchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
  duration: z.number().min(5).max(180),
  model: z.enum(['clip', 'pro']).optional(),
  outputFormat: z.enum(['mp3', 'wav']).optional(),
  // WHY url() validation: LyriaGenerator fetches each URL server-side; bad
  // input would surface as a confusing 500 instead of a clean 400.
  images: z.array(z.string().url()).max(10).optional(),
});

// WHY a flat credit formula instead of importing getAudioCreditsRequired:
//   The Suno helper assumes Suno's tier+duration matrix. Lyria runs on a
//   different cost model (direct Gemini call, no MuAPI markup), so we use
//   a simple per-second rate. 1 credit per 5 seconds, minimum 5 credits.
function getLyriaCreditsRequired(duration: number, model: 'clip' | 'pro'): number {
  const base = Math.max(5, Math.ceil(duration / 5));
  // WHY pro costs 2x: pro model uses more compute and supports longer tracks
  return model === 'pro' ? base * 2 : base;
}

export async function POST(request: NextRequest) {
  const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? request.headers.get('x-api-key') ?? '';

  const startTime = performance.now();
  let generationId: string | null = null;
  let userIdForRefund: string | null = null;
  let creditsToRefund = 0;

  try {
    // 1. Validate API key
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Parse and validate input
    const body = await request.json();
    const parsed = lyriaSchema.safeParse(body);

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
    const model = input.model ?? 'clip';
    const outputFormat = input.outputFormat ?? 'mp3';
    const tier = (apiKeyRecord.user.plan ?? 'starter') as Tier;
    const creditsRequired = getLyriaCreditsRequired(input.duration, model);

    // WHY enforce clip duration here as well as in LyriaGenerator:
    //   We want a clean 400 response, not a 500 from a thrown error deep in
    //   the generator. Defense in depth — both layers validate.
    if (model === 'clip' && input.duration > 30) {
      return badRequest(
        `Lyria clip model supports max 30 seconds. Use model: 'pro' for longer tracks.`,
      );
    }

    // 3. Credit balance check
    const creditBalance = apiKeyRecord.user.creditBalance;
    if (!creditBalance || creditBalance.audioCredits < creditsRequired) {
      return NextResponse.json(
        { type: 'error', error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient audio credits.' } },
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

    // 5. Deduct credits upfront (refunded in catch block on failure)
    await prisma.creditBalance.update({
      where: { userId: apiKeyRecord.user.id },
      data: { audioCredits: { decrement: creditsRequired } },
    });
    userIdForRefund = apiKeyRecord.user.id;
    creditsToRefund = creditsRequired;

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
    generationId = generation.id;

    // WHY emit a status event even though we run synchronously:
    //   Frontend code subscribes to the same event stream for all generation
    //   types. Emitting keeps the UI consistent with Suno's lifecycle.
    emitGenerationEvent(generationId, 'status_change', {
      status: 'processing',
      previousStatus: 'queued',
      message: 'Lyria music generation started.',
    });

    // 7. Run Lyria synchronously — single Gemini call, no polling
    const result = await generateWithLyria({
      prompt: input.prompt,
      duration: input.duration,
      model,
      outputFormat,
      images: input.images,
    });

    const durationMs = Math.round(performance.now() - startTime);

    // 8. Mark generation passed (no CriticAgent — audio has no visual to score)
    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'passed',
        resultUrl: result.audioUrl,
        durationMs,
        metadata: {
          model: `lyria-${model}`,
          outputFormat,
          hasLyrics: Boolean(result.lyrics),
        },
      },
    });

    emitGenerationEvent(generationId, 'completed', {
      status: 'passed',
      previousStatus: 'processing',
      resultUrl: result.audioUrl,
      model: `lyria-${model}`,
      durationMs,
      progress: 100,
      stage: 'Complete',
      message: 'Lyria music generation complete.',
    });

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: apiKeyRecord.userId,
      apiKey: '',
      endpoint: '/v1/generate/audio/lyria',
      model: `lyria-${model}`,
      // WHY 0.3 ratio: direct Gemini API is much cheaper than MuAPI/Suno
      costToUs: creditsRequired * 0.3,
      priceCharged: creditsRequired,
      success: true,
      tier,
      durationMs,
    });

    // WHY mark refund vars null: success path, nothing to refund in catch
    userIdForRefund = null;
    creditsToRefund = 0;

    // 9. Return synchronous success — audioUrl + lyrics ready immediately
    const response = success(
      {
        generationId: generation.id,
        status: 'passed',
        audioUrl: result.audioUrl,
        lyrics: result.lyrics,
        model: `lyria-${model}`,
        outputFormat,
      },
      {
        generationId: generation.id,
        creditsConsumed: creditsRequired,
        duration_ms: durationMs,
      },
    );
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
    return response;
  } catch (err) {
    console.error('[API] POST /v1/generate/audio/lyria error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // WHY refund here rather than in a separate background handler:
    //   Synchronous endpoint means we know the failure happened inside this
    //   request. We can refund credits and update the generation record
    //   atomically before responding.
    if (userIdForRefund && creditsToRefund > 0) {
      await prisma.creditBalance.update({
        where: { userId: userIdForRefund },
        data: { audioCredits: { increment: creditsToRefund } },
      }).catch(console.error);
    }

    if (generationId) {
      await prisma.generation.update({
        where: { id: generationId },
        data: { status: 'failed', errorMessage },
      }).catch(console.error);

      emitGenerationEvent(generationId, 'failed', {
        status: 'failed',
        error: errorMessage,
        message: `Lyria generation failed: ${errorMessage}`,
        progress: 0,
      });
    }

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/audio/lyria',
      model: 'lyria',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: errorMessage,
    });

    return serverError('Failed to generate music with Lyria. Please try again.');
  }
}
