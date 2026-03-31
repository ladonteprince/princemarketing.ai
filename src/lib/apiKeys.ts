import { createHash, randomBytes } from 'crypto';
import { KEY_PREFIXES, type KeyEnvironment } from '@/types/apiKey';

// 1. Generate a new API key with the appropriate prefix
export function generateApiKey(environment: KeyEnvironment): {
  fullKey: string;
  prefix: string;
  hashedKey: string;
} {
  const prefix = KEY_PREFIXES[environment];
  const randomPart = randomBytes(32).toString('base64url');
  const fullKey = `${prefix}${randomPart}`;

  return {
    fullKey,
    prefix: fullKey.slice(0, 12),
    hashedKey: hashApiKey(fullKey),
  };
}

// 2. Hash an API key for storage — SHA-256
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// 3. Validate key format — must start with pk_live_ or pk_test_
export function isValidKeyFormat(key: string): boolean {
  return key.startsWith('pk_live_') || key.startsWith('pk_test_');
}

// 4. Extract environment from key
export function getKeyEnvironment(key: string): KeyEnvironment | null {
  if (key.startsWith('pk_live_')) return 'live';
  if (key.startsWith('pk_test_')) return 'test';
  return null;
}

// 5. Credit costs per generation type
export const CREDIT_COSTS = {
  image: 5,
  video_5: 15,
  video_10: 30,
  video_15: 45,
  copy: 2,
  score: 1,
} as const;
