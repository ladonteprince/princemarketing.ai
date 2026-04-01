import { NextRequest } from 'next/server';
import { success, badRequest, unauthorized, serverError } from '@/lib/apiResponse';
import { validateApiKey } from '@/lib/validateApiKey';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// ─── GET /api/v1/webhooks ───────────────────────────────────────────────────
// Return current webhook config for the API key owner

export async function GET(request: NextRequest) {
  try {
    const rawKey =
      request.headers.get('authorization')?.replace('Bearer ', '') ??
      request.headers.get('x-api-key') ??
      '';

    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // Query webhook fields directly since they may not be in Prisma types yet
    // TODO: Once schema migration adds webhookUrl/webhookSecret to User model,
    //       use prisma.user.findUnique() with proper typed fields instead.
    const rows = await prisma.$queryRaw<
      Array<{ webhook_url: string | null }>
    >`SELECT webhook_url FROM users WHERE id = ${apiKeyRecord.userId} LIMIT 1`;

    const user = rows[0];

    return success({
      webhookUrl: user?.webhook_url ?? null,
      configured: !!user?.webhook_url,
      events: [
        'generation.started',
        'generation.completed',
        'generation.failed',
        'credits.low',
        'credits.depleted',
      ],
    });
  } catch (err) {
    console.error('[API] GET /v1/webhooks error:', err);
    return serverError('Failed to retrieve webhook configuration.');
  }
}

// ─── POST /api/v1/webhooks ──────────────────────────────────────────────────
// Register or update a webhook URL

export async function POST(request: NextRequest) {
  try {
    const rawKey =
      request.headers.get('authorization')?.replace('Bearer ', '') ??
      request.headers.get('x-api-key') ??
      '';

    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return badRequest('Missing required field: url (must be a valid HTTPS URL).');
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return badRequest('Invalid URL format. Must be a fully qualified URL.');
    }

    // Enforce HTTPS in production (allow HTTP for localhost/dev)
    const isLocalhost =
      parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    if (parsedUrl.protocol !== 'https:' && !isLocalhost) {
      return badRequest('Webhook URL must use HTTPS for security.');
    }

    // Generate a signing secret for this webhook
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Update user's webhook config
    // TODO: Once schema migration adds webhookUrl/webhookSecret to User model,
    //       use prisma.user.update() with proper typed fields instead.
    await prisma.$executeRaw`
      UPDATE users
      SET webhook_url = ${url}, webhook_secret = ${webhookSecret}, updated_at = NOW()
      WHERE id = ${apiKeyRecord.userId}
    `;

    return success(
      {
        webhookUrl: url,
        webhookSecret, // Shown once — customer stores this to verify signatures
        configured: true,
        message:
          'Webhook registered. Store the webhookSecret securely — it is shown only once. ' +
          'Use it to verify the X-PrinceMarketing-Signature header on incoming payloads.',
      },
      {},
      201,
    );
  } catch (err) {
    console.error('[API] POST /v1/webhooks error:', err);
    return serverError('Failed to register webhook.');
  }
}

// ─── DELETE /api/v1/webhooks ────────────────────────────────────────────────
// Remove webhook URL (stop receiving notifications)

export async function DELETE(request: NextRequest) {
  try {
    const rawKey =
      request.headers.get('authorization')?.replace('Bearer ', '') ??
      request.headers.get('x-api-key') ??
      '';

    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // Clear webhook config
    // TODO: Once schema migration adds webhookUrl/webhookSecret to User model,
    //       use prisma.user.update() with proper typed fields instead.
    await prisma.$executeRaw`
      UPDATE users
      SET webhook_url = NULL, webhook_secret = NULL, updated_at = NOW()
      WHERE id = ${apiKeyRecord.userId}
    `;

    return success({
      webhookUrl: null,
      configured: false,
      message: 'Webhook removed. You will no longer receive notifications.',
    });
  } catch (err) {
    console.error('[API] DELETE /v1/webhooks error:', err);
    return serverError('Failed to remove webhook.');
  }
}
