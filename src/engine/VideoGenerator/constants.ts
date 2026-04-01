export const VIDEO_DURATIONS = [5, 10, 15] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const;

export const DEFAULT_DURATION: VideoDuration = 5;
export const DEFAULT_ASPECT_RATIO = '16:9' as const;

// Credits per duration tier (legacy — used as default for t2v/i2v)
export const CREDITS_PER_DURATION = {
  5: 15,
  10: 30,
  15: 45,
} as const satisfies Record<VideoDuration, number>;

// Credits per mode per duration tier
export const CREDITS_PER_MODE = {
  't2v': CREDITS_PER_DURATION,
  'i2v': CREDITS_PER_DURATION,
  'extend': { 5: 15, 10: 30, 15: 45 },
  'character': { 5: 20, 10: 40, 15: 60 },
  'video-edit': { 5: 10, 10: 20, 15: 30 },
} as const satisfies Record<string, Record<VideoDuration, number>>;

// Polling configuration
export const POLL_INTERVAL_MS = 10_000;
export const MAX_POLL_ATTEMPTS = 120;
