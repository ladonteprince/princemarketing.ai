import type { GenerationId, ScoringResultId } from '@/types/ids';
import type { GenerationType } from '@/types/generation';
import type { DimensionKey } from './dimensions';

export type CriticRequest = {
  generationId: GenerationId;
  type: GenerationType;
  prompt: string;
  resultUrl?: string | null;
  resultContent?: string | null;
  qualityTier: 'starter' | 'pro' | 'agency';
};

export type CriticDimensionScore = {
  dimension: DimensionKey;
  score: number;
  reasoning: string;
};

export type CriticVerdict = {
  id: ScoringResultId;
  generationId: GenerationId;
  dimensions: ReadonlyArray<CriticDimensionScore>;
  aggregateScore: number;
  passed: boolean;
  qualityTier: 'starter' | 'pro' | 'agency';
  feedback: string;
  scoredAt: Date;
};
