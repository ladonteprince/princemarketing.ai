// ─── Audio Generation Constants ────────────────────────────────────────────

export const AUDIO_DURATIONS = [15, 30, 60, 120] as const;
export type AudioDuration = (typeof AUDIO_DURATIONS)[number];

export const DEFAULT_AUDIO_DURATION: AudioDuration = 30;

// Credits per audio mode
export const CREDITS_PER_AUDIO_MODE = {
  'create-music': { 15: 5, 30: 10, 60: 18, 120: 30 },
  'remix': { 15: 5, 30: 10, 60: 18, 120: 30 },
  'extend': { 15: 5, 30: 10, 60: 18, 120: 30 },
  'sounds': { 15: 3, 30: 5, 60: 8, 120: 12 },
  'lyrics': { 15: 2, 30: 2, 60: 2, 120: 2 },           // Flat rate — text only
  'add-vocals': { 15: 8, 30: 15, 60: 25, 120: 40 },
  'add-instrumental': { 15: 8, 30: 15, 60: 25, 120: 40 },
  'mashup': { 15: 10, 30: 18, 60: 30, 120: 50 },
} as const satisfies Record<string, Record<AudioDuration, number>>;

// MmAudio credit costs
export const CREDITS_PER_SYNC_MODE = {
  'text-to-audio': 5,
  'video-to-video': 10,
} as const;

// Polling configuration
export const AUDIO_POLL_INTERVAL_MS = 8_000;
export const AUDIO_MAX_POLL_ATTEMPTS = 90;
