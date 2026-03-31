import { NextRequest } from 'next/server';
import { createApiKeySchema } from '@/types/apiKey';
import { generateApiKey } from '@/lib/apiKeys';
import { success, badRequest, serverError } from '@/lib/apiResponse';

// POST /api/v1/keys — create a new API key
export async function POST(request: NextRequest) {
  try {
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

    // In production, this would store in the database via Prisma
    const keyRecord = {
      id: `key_${crypto.randomUUID().slice(0, 8)}`,
      name: input.name,
      key: fullKey, // Shown once, never again
      environment: input.environment,
      prefix,
      createdAt: new Date().toISOString(),
    };

    return success(keyRecord, {}, 201);
  } catch (err) {
    console.error('[API] POST /v1/keys error:', err);
    return serverError('Failed to create API key.');
  }
}

// GET /api/v1/keys — list API keys (masked)
export async function GET() {
  try {
    // Demo data
    const keys = [
      {
        id: 'key_abc12345',
        name: 'Production',
        environment: 'live',
        prefix: 'pk_live_xxxx',
        lastUsedAt: '2026-03-30T15:30:00Z',
        createdAt: '2026-03-01T10:00:00Z',
        revoked: false,
      },
      {
        id: 'key_def67890',
        name: 'Development',
        environment: 'test',
        prefix: 'pk_test_xxxx',
        lastUsedAt: '2026-03-30T12:00:00Z',
        createdAt: '2026-03-15T08:00:00Z',
        revoked: false,
      },
    ];

    return success({ keys });
  } catch (err) {
    console.error('[API] GET /v1/keys error:', err);
    return serverError();
  }
}

// DELETE /api/v1/keys — revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const keyId = url.searchParams.get('id');

    if (!keyId) {
      return badRequest('Missing required parameter: id');
    }

    // In production, this would update the database
    return success({ id: keyId, revoked: true });
  } catch (err) {
    console.error('[API] DELETE /v1/keys error:', err);
    return serverError();
  }
}
