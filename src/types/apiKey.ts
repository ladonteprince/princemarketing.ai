import { z } from 'zod';
import type { ApiKeyId, UserId } from './ids';

// 1. Key environment — live keys hit real APIs, test keys return mock data
export const KEY_ENVIRONMENTS = ['live', 'test'] as const;
export type KeyEnvironment = (typeof KEY_ENVIRONMENTS)[number];

// 2. Key prefix convention
export const KEY_PREFIXES = {
  live: 'pk_live_',
  test: 'pk_test_',
} as const satisfies Record<KeyEnvironment, string>;

// 3. API key record
export type ApiKey = {
  id: ApiKeyId;
  userId: UserId;
  name: string;
  environment: KeyEnvironment;
  prefix: string; // First 12 chars stored for display (pk_live_xxxx)
  hashedKey: string; // SHA-256 hash of the full key
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
  createdAt: Date;
};

// 4. Validation schemas
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(KEY_ENVIRONMENTS),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// 5. API response shape — full key shown only on creation
export type ApiKeyCreatedResponse = {
  id: ApiKeyId;
  name: string;
  key: string; // Full key — shown once, never again
  environment: KeyEnvironment;
  prefix: string;
  createdAt: Date;
};

export type ApiKeyListItem = {
  id: ApiKeyId;
  name: string;
  environment: KeyEnvironment;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  revoked: boolean;
};
