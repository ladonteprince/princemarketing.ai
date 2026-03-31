import type { GenerationId } from '@/types/ids';

export type ImageGenerationRequest = {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  qualityTier: 'starter' | 'pro' | 'agency';
};

export type ImageGenerationResult = {
  generationId: GenerationId;
  imageUrl: string;
  refinedPrompt: string;
  durationMs: number;
};
