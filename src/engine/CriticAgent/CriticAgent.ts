import { scoreGeneration } from '@/lib/scoring';
import type { CriticRequest, CriticVerdict } from './types';
import { QUALITY_THRESHOLDS, MAX_RETRY_ATTEMPTS } from './constants';

// The Critic Agent — scores every generation and gates quality
// If a generation fails the quality threshold, it can be retried
// up to MAX_RETRY_ATTEMPTS times with feedback-informed regeneration.

export async function evaluateGeneration(request: CriticRequest): Promise<CriticVerdict> {
  const result = await scoreGeneration({
    generationId: request.generationId,
    type: request.type,
    prompt: request.prompt,
    resultUrl: request.resultUrl,
    resultContent: request.resultContent,
    qualityTier: request.qualityTier,
  });

  return {
    id: result.id,
    generationId: result.generationId,
    dimensions: result.dimensions.map((d) => ({
      dimension: d.dimension as CriticVerdict['dimensions'][number]['dimension'],
      score: d.score,
      reasoning: d.reasoning,
    })),
    aggregateScore: result.aggregateScore,
    passed: result.passed,
    qualityTier: result.qualityTier,
    feedback: result.feedback,
    scoredAt: result.scoredAt,
  };
}

// Determine if a generation should be retried based on score and attempt count
export function shouldRetry(score: number, qualityTier: 'starter' | 'pro' | 'agency', attemptNumber: number): boolean {
  if (attemptNumber >= MAX_RETRY_ATTEMPTS) return false;
  const threshold = QUALITY_THRESHOLDS[qualityTier];
  return score < threshold;
}

// Get the minimum score required for a given tier
export function getMinimumScore(qualityTier: 'starter' | 'pro' | 'agency'): number {
  return QUALITY_THRESHOLDS[qualityTier];
}
