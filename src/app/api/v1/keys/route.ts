import { NextRequest } from 'next/server';
import { createApiKeySchema } from '@/types/apiKey';
import { generateApiKey } from '@/lib/apiKeys';
import { success, badRequest, unauthorized, serverError } from '@/lib/apiResponse';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/v1/keys — create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized('You must be signed in to create API keys.');
    }

    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        `Invalid request. ${parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
        parsed.error.flatten(),
      );
    }

    const input = parsed.data;
    const { fullKey, prefix, hashedKey } = generateApiKey(input.environment);

    // Calculate expiration if provided
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Store in database
    const keyRecord = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: input.name,
        environment: input.environment,
        prefix,
        hashedKey,
        expiresAt,
      },
    });

    return success({
      id: keyRecord.id,
      name: keyRecord.name,
      key: fullKey, // Shown once, never again
      environment: keyRecord.environment,
      prefix: keyRecord.prefix,
      createdAt: keyRecord.createdAt.toISOString(),
    }, {}, 201);
  } catch (err) {
    console.error('[API] POST /v1/keys error:', err);
    return serverError('Failed to create API key.');
  }
}

// GET /api/v1/keys — list API keys (masked)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized('You must be signed in to view API keys.');
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        environment: true,
        prefix: true,
        lastUsedAt: true,
        createdAt: true,
        revoked: true,
        expiresAt: true,
      },
    });

    return success({ keys });
  } catch (err) {
    console.error('[API] GET /v1/keys error:', err);
    return serverError();
  }
}

// DELETE /api/v1/keys — revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized('You must be signed in to revoke API keys.');
    }

    const url = new URL(request.url);
    const keyId = url.searchParams.get('id');

    if (!keyId) {
      return badRequest('Missing required parameter: id');
    }

    // Ensure the key belongs to the current user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: session.user.id },
    });

    if (!existingKey) {
      return badRequest('API key not found or does not belong to you.');
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true },
    });

    return success({ id: keyId, revoked: true });
  } catch (err) {
    console.error('[API] DELETE /v1/keys error:', err);
    return serverError();
  }
}
