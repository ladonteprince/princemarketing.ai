import { claude } from './claude';
import {
  SCORING_DIMENSIONS,
  QUALITY_THRESHOLDS,
  computeAggregateScore,
  type DimensionScore,
  type ScoringResult,
} from '@/types/scoring';
import { createScoringResultId } from '@/types/ids';
import type { GenerationId } from '@/types/ids';
import type { GenerationType } from '@/types/generation';

// 1. Score a generation across all 12 dimensions using Claude as critic
export async function scoreGeneration(params: {
  generationId: GenerationId;
  type: GenerationType;
  prompt: string;
  resultUrl?: string | null;
  resultContent?: string | null;
  qualityTier: 'starter' | 'pro' | 'agency';
}): Promise<ScoringResult> {
  const dimensionKeys = SCORING_DIMENSIONS.map((d) => d.key).join(', ');

  // 2. Build the scoring prompt based on generation type
  const contentDescription = params.type === 'copy'
    ? `Copy content:\n${params.resultContent}`
    : `Asset URL: ${params.resultUrl}`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4_096,
    system: `You are a ruthless creative quality critic at a world-class agency. You score marketing assets across 12 dimensions, each from 0-10. Be harsh but fair. AI artifacts are weighted 1.3x because clients notice them immediately.

Score each dimension with a number (0-10) and a one-sentence reasoning. Then provide an overall feedback summary.

Dimensions: ${dimensionKeys}

Respond in this exact JSON format:
{
  "dimensions": [
    { "dimension": "clarity", "score": 8.5, "reasoning": "..." },
    ...
  ],
  "feedback": "Overall assessment..."
}`,
    messages: [
      {
        role: 'user',
        content: `Score this ${params.type} asset.\n\nOriginal prompt: ${params.prompt}\n\n${contentDescription}`,
      },
    ],
  });

  // 3. Parse the critic's response
  const textBlock = response.content.find((block) => block.type === 'text');
  const rawText = textBlock?.text ?? '{}';

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? '{}') as {
    dimensions?: Array<{ dimension: string; score: number; reasoning: string }>;
    feedback?: string;
  };

  const dimensions: ReadonlyArray<DimensionScore> = (parsed.dimensions ?? []).map((d) => ({
    dimension: d.dimension as DimensionScore['dimension'],
    score: Math.min(10, Math.max(0, d.score)),
    reasoning: d.reasoning,
  }));

  // 4. Compute aggregate and determine pass/fail
  const aggregateScore = computeAggregateScore(dimensions);
  const threshold = QUALITY_THRESHOLDS[params.qualityTier];
  const passed = aggregateScore >= threshold;

  return {
    id: createScoringResultId(crypto.randomUUID()),
    generationId: params.generationId,
    dimensions,
    aggregateScore,
    passed,
    qualityTier: params.qualityTier,
    feedback: parsed.feedback ?? 'No feedback provided.',
    scoredAt: new Date(),
  };
}
