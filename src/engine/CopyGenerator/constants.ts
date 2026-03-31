export const COPY_TYPES = ['ad', 'social', 'email', 'headline', 'landing', 'product'] as const;
export type CopyType = (typeof COPY_TYPES)[number];

export const TONES = ['professional', 'casual', 'bold', 'empathetic', 'technical'] as const;
export type Tone = (typeof TONES)[number];

export const DEFAULT_TONE: Tone = 'professional';
export const DEFAULT_MAX_LENGTH = 500;
export const CREDITS_PER_COPY = 2;
