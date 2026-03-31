import { NextRequest } from 'next/server';
import { success, notFound, unauthorized, serverError } from '@/lib/apiResponse';
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
