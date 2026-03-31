import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

// ─── JSONL Analytics Logger ────────────────────────────────────────────────
// Non-blocking, fire-and-forget logging to daily JSONL files.

const LOGS_DIR = process.env.ANALYTICS_LOGS_DIR ?? '/var/www/princemarketing.ai/logs';

export type AnalyticsEvent = {
  timestamp: string;
  userId: string;
  apiKey: string;
  endpoint: string;
  model: string;
  costToUs: number;       // What we pay the upstream provider (cents)
  priceCharged: number;   // What we charge the customer (credits)
  success: boolean;
  tier: string;
  durationMs?: number;
  error?: string;
};

function getLogFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `analytics-${yyyy}-${mm}-${dd}.jsonl`;
}

/**
 * Log an analytics event. Non-blocking — errors are swallowed to prevent
 * analytics from crashing generation requests.
 */
export function logAnalyticsEvent(event: AnalyticsEvent): void {
  const line = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  }) + '\n';

  const filePath = join(LOGS_DIR, getLogFilename());

  // Fire and forget — do not await
  mkdir(LOGS_DIR, { recursive: true })
    .then(() => appendFile(filePath, line))
    .catch((err) => {
      console.error('[Analytics] Failed to write event:', err);
    });
}
