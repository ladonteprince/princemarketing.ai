import { NextRequest } from 'next/server';
import { success, notFound, unauthorized, badRequest, serverError } from '@/lib/apiResponse';
import { validateApiKey } from '@/lib/validateApiKey';
import { prisma } from '@/lib/db';

// GET /api/v1/generations/:id — get a single generation by ID

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
      ?? request.headers.get('x-api-key') ?? '';

    // Validate API key
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    const { id } = await params;

    const generation = await prisma.generation.findFirst({
      where: { id, userId: apiKeyRecord.userId },
      include: { scoringResult: true },
    });

    if (!generation) {
      return notFound(`Generation ${id} not found.`);
    }

    return success(generation);
  } catch (err) {
    const { id } = await params;
    console.error(`[API] GET /v1/generations/${id} error:`, err);
    return serverError();
  }
}

// PATCH /api/v1/generations/:id — update generation metadata (e.g. category tag)

const VALID_CATEGORIES = ['character', 'prop', 'environment'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
      ?? request.headers.get('x-api-key') ?? '';

    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    const { id } = await params;
    const body = await request.json();
    const { category } = body;

    // category must be a valid value or null (to clear)
    if (category !== null && category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return badRequest(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}, or null.`);
    }

    // Fetch current generation to merge metadata
    const gen = await prisma.generation.findFirst({
      where: { id, userId: apiKeyRecord.userId },
    });

    if (!gen) {
      return notFound(`Generation ${id} not found.`);
    }

    const currentMeta = (gen.metadata && typeof gen.metadata === 'object' && !Array.isArray(gen.metadata))
      ? gen.metadata as Record<string, unknown>
      : {};

    const updated = await prisma.generation.update({
      where: { id },
      data: {
        metadata: { ...currentMeta, category: category ?? null },
      },
    });

    return success({ id: updated.id, category: category ?? null });
  } catch (err) {
    const { id } = await params;
    console.error(`[API] PATCH /v1/generations/${id} error:`, err);
    return serverError();
  }
}
