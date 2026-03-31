// ─── In-Memory Rate Limiter ────────────────────────────────────────────────
// Map-based sliding window rate limiter. Resets per minute.

export type Tier = 'free' | 'starter' | 'pro' | 'agency';

const TIER_LIMITS: Record<Tier, number> = {
  free: 3,
  starter: 10,
  pro: 30,
  agency: 100,
};

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Auto-cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const WINDOW_MS = 60 * 1000; // 1-minute sliding window

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (ms) when the oldest request in the window expires
};

/**
 * Check and consume one unit of rate limit for the given API key and tier.
 */
export function checkRateLimit(apiKey: string, tier: Tier): RateLimitResult {
  const now = Date.now();
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  let entry = store.get(apiKey);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(apiKey, entry);
  }

  // Remove timestamps outside the 1-minute window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  const remaining = Math.max(0, limit - entry.timestamps.length);
  const resetAt =
    entry.timestamps.length > 0
      ? entry.timestamps[0] + WINDOW_MS
      : now + WINDOW_MS;

  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Consume one request
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: remaining - 1,
    resetAt,
  };
}

/**
 * Get the per-minute limit for a tier.
 */
export function getLimitForTier(tier: Tier): number {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}
