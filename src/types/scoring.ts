import type { GenerationId, ScoringResultId } from './ids';

// 1. The 12 scoring dimensions with their weights
export const SCORING_DIMENSIONS = [
  { key: 'clarity', label: 'Clarity', weight: 1.0 },
  { key: 'composition', label: 'Composition', weight: 1.0 },
  { key: 'brandAlignment', label: 'Brand Alignment', weight: 1.0 },
  { key: 'emotionalImpact', label: 'Emotional Impact', weight: 1.0 },
  { key: 'technicalQuality', label: 'Technical Quality', weight: 1.0 },
  { key: 'originality', label: 'Originality', weight: 1.0 },
  { key: 'messageEffectiveness', label: 'Message Effectiveness', weight: 1.0 },
  { key: 'visualHierarchy', label: 'Visual Hierarchy', weight: 1.0 },
  { key: 'colorPsychology', label: 'Color Psychology', weight: 1.0 },
  { key: 'typography', label: 'Typography', weight: 1.0 },
  { key: 'ctaStrength', label: 'Call-to-Action Strength', weight: 1.0 },
  { key: 'aiArtifactDetection', label: 'AI Artifact Detection', weight: 1.3 },
] as const;

export type ScoringDimensionKey = (typeof SCORING_DIMENSIONS)[number]['key'];

// 2. Per-dimension score
export type DimensionScore = {
  dimension: ScoringDimensionKey;
  score: number; // 0-10
  reasoning: string;
};

// 3. Aggregate scoring result
export type ScoringResult = {
  id: ScoringResultId;
  generationId: GenerationId;
  dimensions: ReadonlyArray<DimensionScore>;
  aggregateScore: number; // Weighted average, 0-10
  passed: boolean;
  qualityTier: 'starter' | 'pro' | 'agency';
  feedback: string;
  scoredAt: Date;
};

// 4. Quality tier thresholds
export const QUALITY_THRESHOLDS = {
  starter: 7.0,
  pro: 8.0,
  agency: 8.5,
} as const satisfies Record<string, number>;

// 5. Compute weighted aggregate from dimension scores
export function computeAggregateScore(dimensions: ReadonlyArray<DimensionScore>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const dim of dimensions) {
    const definition = SCORING_DIMENSIONS.find((d) => d.key === dim.dimension);
    const weight = definition?.weight ?? 1.0;
    weightedSum += dim.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}
