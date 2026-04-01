// Webhook delivery system for PrinceMarketing.ai API engine.
// WHY: Server-to-server integrations need push notifications when video
// generations complete or fail, instead of polling or holding SSE connections.
//
// Architecture: Subscribes to the existing GenerationEventBus so webhook
// delivery is decoupled from the video route — no route modifications needed.

import crypto from 'crypto';
import { prisma } from './db';
import { generationEvents, type GenerationEvent } from './generation-events';

// ─── Types ──────────────────────────────────────────────────────────────────

export type WebhookEvent =
  | 'generation.started'
  | 'generation.progress'
  | 'generation.completed'
  | 'generation.failed'
  | 'credits.low'
  | 'credits.depleted';

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

// ─── Signature ──────────────────────────────────────────────────────────────

/**
 * HMAC-SHA256 signature so customers can verify payloads are authentic.
 * They compare: X-PrinceMarketing-Signature header === signPayload(body, secret)
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// ─── Delivery ───────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000; // 1s, 2s, 4s exponential backoff

/**
 * Deliver a webhook to a user's registered URL.
 *
 * 1. Look up user's webhook config from database
 *    NOTE: The User model needs `webhookUrl` and `webhookSecret` fields added
 *    to the Prisma schema. Until then, this reads from `user.metadata` or
 *    a future WebhookConfig table. For now we query raw fields — the schema
 *    migration is documented below.
 *
 *    TODO: Add to prisma/schema.prisma User model:
 *      webhookUrl    String?  @map("webhook_url")
 *      webhookSecret String?  @map("webhook_secret")
 *
 * 2. If no URL configured, return silently
 * 3. POST the payload with HMAC signature header
 * 4. Retry up to 3 times with exponential backoff on failure
 * 5. Log delivery attempts
 */
export async function deliverWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    // Fetch user's webhook configuration
    // Using $queryRawUnsafe because webhookUrl/webhookSecret may not be in
    // the Prisma client types yet. Once the schema migration runs, switch
    // to prisma.user.findUnique().
    const rows = await prisma.$queryRaw<
      Array<{ webhook_url: string | null; webhook_secret: string | null }>
    >`SELECT webhook_url, webhook_secret FROM users WHERE id = ${userId} LIMIT 1`;

    const user = rows[0];
    if (!user?.webhook_url) return; // No webhook configured — silent return

    const webhookUrl = user.webhook_url;
    const webhookSecret = user.webhook_secret ?? '';

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const body = JSON.stringify(payload);
    const signature = signPayload(body, webhookSecret);

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PrinceMarketing-Signature': signature,
            'X-PrinceMarketing-Event': event,
            'X-PrinceMarketing-Delivery-Attempt': String(attempt),
            'User-Agent': 'PrinceMarketing-Webhooks/1.0',
          },
          body,
          signal: AbortSignal.timeout(10_000), // 10s timeout per attempt
        });

        if (response.ok) {
          console.log(
            `[Webhooks] Delivered ${event} to ${webhookUrl} (attempt ${attempt}, status ${response.status})`,
          );
          return; // Success — done
        }

        // Non-2xx: log and retry
        console.warn(
          `[Webhooks] ${event} delivery to ${webhookUrl} returned ${response.status} (attempt ${attempt}/${MAX_RETRIES})`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn(
          `[Webhooks] ${event} delivery to ${webhookUrl} failed (attempt ${attempt}/${MAX_RETRIES}): ${message}`,
        );
      }

      // Exponential backoff before next retry (skip after last attempt)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt - 1)));
      }
    }

    // All retries exhausted
    console.error(
      `[Webhooks] FAILED to deliver ${event} to ${webhookUrl} after ${MAX_RETRIES} attempts`,
    );
  } catch (err) {
    // Don't let webhook failures crash background generation
    console.error('[Webhooks] Unexpected error in deliverWebhook:', err);
  }
}

// ─── Event Bus Listener ─────────────────────────────────────────────────────

/**
 * Maps GenerationEventBus events to webhook events and delivers them.
 * Call `initWebhookListener()` once at app startup (e.g., in layout.tsx or
 * an instrumentation file) to wire up automatic webhook delivery.
 */

const EVENT_TYPE_MAP: Record<string, WebhookEvent | null> = {
  status_change: 'generation.started',   // Overridden below for specific statuses
  progress: null,                         // Too noisy for webhooks — SSE only
  scoring: null,                          // Internal state — not surfaced
  completed: 'generation.completed',
  failed: 'generation.failed',
  heartbeat: null,                        // SSE-only
};

async function handleGenerationEvent(event: GenerationEvent): Promise<void> {
  // Look up the generation to get the userId
  const generation = await prisma.generation.findUnique({
    where: { id: event.generationId },
    select: { userId: true },
  });

  if (!generation) return;

  let webhookEvent: WebhookEvent | null = null;

  // Map event types to webhook events
  switch (event.type) {
    case 'status_change':
      // Only fire generation.started for the processing transition
      if (event.data.status === 'processing' && event.data.previousStatus === 'queued') {
        webhookEvent = 'generation.started';
      }
      break;
    case 'completed':
      webhookEvent = 'generation.completed';
      break;
    case 'failed':
      webhookEvent = 'generation.failed';
      break;
    default:
      // progress, scoring, heartbeat — skip for webhooks
      return;
  }

  if (!webhookEvent) return;

  await deliverWebhook(generation.userId, webhookEvent, {
    generationId: event.generationId,
    status: event.data.status ?? event.type,
    resultUrl: event.data.resultUrl ?? null,
    score: event.data.score ?? null,
    feedback: event.data.feedback ?? null,
    error: event.data.error ?? null,
    model: event.data.model ?? null,
    durationMs: event.data.durationMs ?? null,
    message: event.data.message ?? null,
  });
}

let listenerInitialized = false;

/**
 * Initialize the webhook listener on the GenerationEventBus.
 * Safe to call multiple times — only attaches once.
 *
 * Uses a wildcard approach: listens to the 'newListener' pattern to catch
 * any generation events. Since GenerationEventBus emits using generationId
 * as the event name, we hook into the underlying EventEmitter to intercept
 * all events.
 */
export function initWebhookListener(): void {
  if (listenerInitialized) return;
  listenerInitialized = true;

  // Override the emit method to intercept all generation events
  const originalEmit = generationEvents.emit.bind(generationEvents);

  // Monkey-patch emit to also fire webhook delivery
  (generationEvents as any).emit = function (
    generationId: string,
    event: GenerationEvent,
  ): boolean {
    // Fire the webhook delivery asynchronously (don't block the event bus)
    if (event && typeof event === 'object' && 'type' in event) {
      handleGenerationEvent(event).catch((err) => {
        console.error('[Webhooks] Error handling generation event:', err);
      });
    }

    // Call the original emit so SSE and other listeners still work
    return originalEmit(generationId, event);
  };

  console.log('[Webhooks] Listener initialized on GenerationEventBus');
}
