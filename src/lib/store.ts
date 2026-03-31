// Minimal in-memory store for development/demo without database
// In production, all state flows through Prisma/PostgreSQL

import type { Generation } from '@/types/generation';
import type { ApiKeyListItem } from '@/types/apiKey';

type Store = {
  generations: Map<string, Generation>;
  apiKeys: Map<string, ApiKeyListItem & { hashedKey: string; userId: string }>;
};

const globalForStore = globalThis as unknown as { store: Store | undefined };

export const store: Store = globalForStore.store ?? {
  generations: new Map(),
  apiKeys: new Map(),
};

if (process.env.NODE_ENV !== 'production') {
  globalForStore.store = store;
}
