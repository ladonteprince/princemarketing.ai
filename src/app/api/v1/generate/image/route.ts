import { NextRequest, NextResponse } from 'next/server';
import { generateImageSchema } from '@/types/generation';
import { generateImage, getCreditsRequired } from '@/engine/ImageGenerator/ImageGenerator';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { success, badRequest, unauthorized, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? request.headers.get('x-api-key') ?? '';

  try {
    // 1. Validate API key against database
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Parse and validate request body
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
    // Get tier from the user's subscription/plan, NOT from the request body
    const tier = (apiKeyRecord.user.plan ?? 'starter') as Tier;
    const creditsRequired = getCreditsRequired();

    // 3. Check credit balance
    const creditBalance = apiKeyRecord.user.creditBalance;
    if (!creditBalance || creditBalance.imageCredits < creditsRequired) {
      return NextResponse.json(
        { type: 'error', error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient image credits.' } },
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

    // 5. Generate image
    const result = await generateImage({
      prompt: input.prompt,
      style: input.style,
      aspectRatio: input.aspectRatio,
      qualityTier: input.qualityTier,
    });

    // 6. Score the output via Critic Agent
    const verdict = await evaluateGeneration({
      generationId: result.generationId,
      type: 'image',
      prompt: input.prompt,
      resultUrl: result.imageUrl,
      qualityTier: input.qualityTier,
    });

    // 7. Deduct credits after successful generation
    await prisma.creditBalance.update({
      where: { userId: apiKeyRecord.user.id },
      data: { imageCredits: { decrement: creditsRequired } },
    });

    // 8. Log analytics (non-blocking)
    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: apiKeyRecord.userId,
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/image',
      model: result.model ?? 'gemini-image',
      costToUs: tier === 'pro' ? 4 : 1, // cents
      priceCharged: creditsRequired,
      success: true,
      tier,
      durationMs: result.durationMs,
    });

    // 9. Return response
    const response = success(
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
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
    return response;
  } catch (err) {
    console.error('[API] POST /v1/generate/image error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/image',
      model: 'gemini-image',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return serverError('Failed to generate image. Please try again.');
  }
}
