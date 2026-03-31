import type { GenerationId } from '@/types/ids';
import type { VideoDuration } from './constants';
import type { SeedanceModelKey } from './VideoGenerator';

export type VideoGenerationRequest = {
  prompt: string;
  negativePrompt?: string;
  duration: VideoDuration;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImages?: ReadonlyArray<string>;
  qualityTier: 'starter' | 'pro' | 'agency';
  model?: SeedanceModelKey;
};

export type VideoGenerationResult = {
  generationId: GenerationId;
  videoUrl: string;
  refinedPrompt: string;
  predictionId: string;
  model: string;
  durationMs: number;
};
