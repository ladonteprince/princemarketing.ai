import { z } from 'zod';
import type { GenerationId, UserId } from './ids';

// 1. Generation type discriminator
export const GENERATION_TYPES = ['image', 'video', 'copy'] as const;
export type GenerationType = (typeof GENERATION_TYPES)[number];

// 2. Status progression: queued → processing → scoring → passed/failed → delivered
export const GENERATION_STATUSES = [
  'queued',
  'processing',
  'scoring',
  'passed',
  'failed',
  'delivered',
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

// 3. Status → color mapping for UI
export const STATUS_COLORS = {
  queued: 'slate-surface',
  processing: 'arc-light',
  scoring: 'ember',
  passed: 'mint',
  failed: 'flare',
  delivered: 'forge-blue',
} as const satisfies Record<GenerationStatus, string>;

// 4. Core generation record
export type Generation = {
  id: GenerationId;
  userId: UserId;
  type: GenerationType;
  status: GenerationStatus;
  prompt: string;
  refinedPrompt: string | null;
  resultUrl: string | null;
  resultContent: string | null;
  score: number | null;
  creditsConsumed: number;
  durationMs: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

// 5. Zod schemas for API validation
export const generateImageSchema = z.object({
  prompt: z.string().min(1).max(4_000),
  style: z.enum(['photorealistic', 'illustration', 'abstract', 'minimalist', 'cinematic']).optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:4']).optional().default('1:1'),
  qualityTier: z.enum(['starter', 'pro', 'agency']).optional().default('pro'),
});

export const generateVideoSchema = z.object({
  prompt: z.string().min(1).max(4_000),
  negativePrompt: z.string().max(2_000).optional(),
  duration: z.enum(['5', '10', '15']).optional().default('5'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  referenceImages: z.array(z.string().url()).max(9).optional(),
  imageLabels: z.array(z.string().max(100)).max(9).optional(),  // Labels for @image1..@image9 (e.g. "character", "product", "location")
  qualityTier: z.enum(['starter', 'pro', 'agency']).optional().default('pro'),
  mode: z.enum(['t2v', 'i2v', 'extend', 'character', 'video-edit']).optional(),
  sourceImage: z.string().url().optional(),
  sourceVideo: z.string().url().optional(),
  seed: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    // i2v mode requires sourceImage
    if (data.mode === 'i2v' && !data.sourceImage) return false;
    // extend mode requires sourceVideo
    if (data.mode === 'extend' && !data.sourceVideo) return false;
    return true;
  },
  {
    message: 'i2v mode requires sourceImage; extend mode requires sourceVideo',
  },
);

export const generateCopySchema = z.object({
  prompt: z.string().min(1).max(4_000),
  copyType: z.enum(['ad', 'social', 'email', 'headline', 'landing', 'product']),
  tone: z.enum(['professional', 'casual', 'bold', 'empathetic', 'technical']).optional().default('professional'),
  maxLength: z.number().int().min(10).max(10_000).optional().default(500),
  brand: z.string().max(500).optional(),
  qualityTier: z.enum(['starter', 'pro', 'agency']).optional().default('pro'),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;
export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;
export type GenerateCopyInput = z.infer<typeof generateCopySchema>;
