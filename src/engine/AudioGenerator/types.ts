import type { GenerationId } from '@/types/ids';
import type { AudioDuration } from './constants';

// Suno endpoint keys
export type AudioMode =
  | 'create-music'
  | 'remix'
  | 'extend'
  | 'sounds'
  | 'lyrics'
  | 'add-vocals'
  | 'add-instrumental'
  | 'mashup';

export type AudioGenerationRequest = {
  prompt: string;              // Music/sound description
  mode: AudioMode;             // Which Suno endpoint
  duration?: AudioDuration;    // Desired length in seconds
  style?: string;              // Musical style (e.g. "lo-fi hip hop", "cinematic orchestral")
  sourceAudio?: string;        // URL for remix/extend/mashup source
  lyrics?: string;             // Custom lyrics for vocals
  qualityTier: 'starter' | 'pro' | 'agency';
};

export type AudioGenerationResult = {
  generationId: GenerationId;
  audioUrl: string;
  durationMs: number;          // Wall-clock time for the generation
  mode: AudioMode;
  predictionId: string;
};
