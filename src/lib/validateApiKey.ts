import { prisma } from '@/lib/db';
import { hashApiKey } from '@/lib/apiKeys';

/**
 * Validate an API key against the database.
 * Returns the full API key record with user, subscription, and credit balance,
 * or null if the key is invalid, revoked, or expired.
 */
export async function validateApiKey(rawKey: string) {
  const hashedKey = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findFirst({
    where: { hashedKey, revoked: false },
    include: {
      user: {
        include: {
          subscription: true,
          creditBalance: true,
        },
      },
    },
  });

  if (!apiKey) return null;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update lastUsedAt (non-blocking)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch((err) => console.error('[validateApiKey] Failed to update lastUsedAt:', err));

  return apiKey;
}
