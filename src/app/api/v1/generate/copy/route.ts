import { NextRequest, NextResponse } from 'next/server';
import { generateCopySchema } from '@/types/generation';
import { generateCopyContent, getCreditsRequired } from '@/engine/CopyGenerator/CopyGenerator';
import { evaluateGeneration } from '@/engine/CriticAgent/CriticAgent';
import { success, badRequest, unauthorized, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { prisma } from '@/lib/db';
import type { CopyType, Tone } from '@/engine/CopyGenerator/constants';

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
    const parsed = generateCopySchema.safeParse(body);

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
    const creditsRequired = getCreditsRequired();

    // 3. Check credit balance
    const creditBalance = apiKeyRecord.user.creditBalance;
    if (!creditBalance || creditBalance.copyCredits < creditsRequired) {
      return NextResponse.json(
        { type: 'error', error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient copy credits.' } },
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

    // 5. Generate copy
    const result = await generateCopyContent({
      prompt: input.prompt,
      copyType: input.copyType as CopyType,
      tone: input.tone as Tone,
      maxLength: input.maxLength,
      brand: input.brand,
      qualityTier: input.qualityTier,
    });

    // 6. Score the output
    const verdict = await evaluateGeneration({
      generationId: result.generationId,
      type: 'copy',
      prompt: input.prompt,
      resultContent: result.content,
      qualityTier: input.qualityTier,
    });

    // 7. Deduct credits after successful generation
    await prisma.creditBalance.update({
      where: { userId: apiKeyRecord.user.id },
      data: { copyCredits: { decrement: creditsRequired } },
    });

    // 8. Log analytics (non-blocking)
    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: apiKeyRecord.userId,
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/copy',
      model: 'claude-copy',
      costToUs: 1,
      priceCharged: creditsRequired,
      success: true,
      tier,
      durationMs: result.durationMs,
    });

    // 9. Return response
    const response = success(
      {
        content: result.content,
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
    console.error('[API] POST /v1/generate/copy error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/generate/copy',
      model: 'claude-copy',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return serverError('Failed to generate copy. Please try again.');
  }
}
