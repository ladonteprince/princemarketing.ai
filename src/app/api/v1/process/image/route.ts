import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processImage, getCreditsRequired, type ImageTool } from '@/engine/ImageProcessor/ImageProcessor';
import { success, badRequest, unauthorized, rateLimited, serverError } from '@/lib/apiResponse';
import { checkRateLimit, type Tier } from '@/lib/rate-limiter';
import { logAnalyticsEvent } from '@/lib/analytics';
import { validateApiKey } from '@/lib/validateApiKey';
import { prisma } from '@/lib/db';

// ─── Validation Schema ────────────────────────────────────────────────────

const processImageSchema = z.object({
  tool: z.enum([
    'upscale',
    'remove-bg',
    'product-shot',
    'face-swap',
    'skin-enhance',
    'extend',
    'erase-object',
    'product-photography',
  ]),
  imageUrl: z.string().url(),
  prompt: z.string().max(2_000).optional(),
  targetImageUrl: z.string().url().optional(),
}).refine(
  (data) => {
    // face-swap requires targetImageUrl
    if (data.tool === 'face-swap' && !data.targetImageUrl) return false;
    return true;
  },
  { message: 'face-swap tool requires targetImageUrl (the face source image).' },
);

// ─── Route Handler ────────────────────────────────────────────────────────

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
    const parsed = processImageSchema.safeParse(body);

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
    const creditsRequired = getCreditsRequired(input.tool as ImageTool);

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

    // 5. Process image via MuAPI
    const result = await processImage({
      tool: input.tool as ImageTool,
      imageUrl: input.imageUrl,
      prompt: input.prompt,
      targetImageUrl: input.targetImageUrl,
    });

    // 6. Deduct credits after successful processing
    await prisma.creditBalance.update({
      where: { userId: apiKeyRecord.user.id },
      data: { imageCredits: { decrement: creditsRequired } },
    });

    // 7. Log analytics (non-blocking)
    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: apiKeyRecord.userId,
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/process/image',
      model: `muapi-${input.tool}`,
      costToUs: 1, // cents estimate
      priceCharged: creditsRequired,
      success: true,
      tier,
      durationMs: result.durationMs,
    });

    // 8. Return response
    const response = success(
      {
        imageUrl: result.imageUrl,
        tool: result.tool,
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
    console.error('[API] POST /v1/process/image error:', err);

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      apiKey: rawKey.slice(0, 12),
      endpoint: '/v1/process/image',
      model: 'muapi-image-processor',
      costToUs: 0,
      priceCharged: 0,
      success: false,
      tier: 'pro',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return serverError('Failed to process image. Please try again.');
  }
}
