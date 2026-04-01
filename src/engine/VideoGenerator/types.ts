import type { GenerationId } from '@/types/ids';
import type { VideoDuration } from './constants';
import type { SeedanceModelKey } from './VideoGenerator';

export type VideoGenerationMode = 't2v' | 'i2v' | 'extend' | 'character' | 'video-edit';

export type VideoGenerationRequest = {
  prompt: string;
  negativePrompt?: string;
  duration: VideoDuration;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImages?: ReadonlyArray<string>;
  qualityTier: 'starter' | 'pro' | 'agency';
  model?: SeedanceModelKey;
  mode?: VideoGenerationMode;       // Generation mode (default: 't2v')
  sourceImage?: string;             // URL for i2v mode (image to animate)
  sourceVideo?: string;             // URL for extend mode (video to extend)
  seed?: number;                    // For reproducible generations
};

export type VideoGenerationResult = {
  generationId: GenerationId;
  videoUrl: string;
  refinedPrompt: string;
  predictionId: string;
  model: string;
  durationMs: number;
};
