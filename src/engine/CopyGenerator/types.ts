import type { GenerationId } from '@/types/ids';
import type { CopyType, Tone } from './constants';

export type CopyGenerationRequest = {
  prompt: string;
  copyType: CopyType;
  tone: Tone;
  maxLength: number;
  brand?: string;
  qualityTier: 'starter' | 'pro' | 'agency';
};

export type CopyGenerationResult = {
  generationId: GenerationId;
  content: string;
  refinedPrompt: string;
  durationMs: number;
};
