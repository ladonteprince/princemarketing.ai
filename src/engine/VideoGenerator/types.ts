import type { GenerationId } from '@/types/ids';
import type { VideoDuration } from './constants';

export type VideoGenerationRequest = {
  prompt: string;
  negativePrompt?: string;
  duration: VideoDuration;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImages?: ReadonlyArray<string>;
  qualityTier: 'starter' | 'pro' | 'agency';
};

export type VideoGenerationResult = {
  generationId: GenerationId;
  videoUrl: string;
  refinedPrompt: string;
  predictionId: string;
  durationMs: number;
};
