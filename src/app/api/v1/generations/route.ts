import { NextRequest } from 'next/server';
import { success, unauthorized, serverError } from '@/lib/apiResponse';
import { validateApiKey } from '@/lib/validateApiKey';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// GET /api/v1/generations — list recent generations

export async function GET(request: NextRequest) {
  try {
    const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
      ?? request.headers.get('x-api-key') ?? '';

    // Validate API key
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    // Build where clause
    const where: Prisma.GenerationWhereInput = {
      userId: apiKeyRecord.userId,
    };
    if (type) where.type = type;
    if (status) where.status = status;

    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          status: true,
          prompt: true,
          resultUrl: true,
          score: true,
          creditsConsumed: true,
          durationMs: true,
          createdAt: true,
        },
      }),
      prisma.generation.count({ where }),
    ]);

    return success({
      generations,
      pagination: { limit, offset, total },
    });
  } catch (err) {
    console.error('[API] GET /v1/generations error:', err);
    return serverError();
  }
}
