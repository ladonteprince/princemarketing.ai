// Branded ID types — prevent mixing IDs across domains

export type GenerationId = string & { readonly __brand: 'GenerationId' };
export type ApiKeyId = string & { readonly __brand: 'ApiKeyId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type ScoringResultId = string & { readonly __brand: 'ScoringResultId' };
export type UsageRecordId = string & { readonly __brand: 'UsageRecordId' };

export function createGenerationId(id: string): GenerationId {
  return id as GenerationId;
}

export function createApiKeyId(id: string): ApiKeyId {
  return id as ApiKeyId;
}

export function createUserId(id: string): UserId {
  return id as UserId;
}

export function createScoringResultId(id: string): ScoringResultId {
  return id as ScoringResultId;
}

export function createUsageRecordId(id: string): UsageRecordId {
  return id as UsageRecordId;
}
