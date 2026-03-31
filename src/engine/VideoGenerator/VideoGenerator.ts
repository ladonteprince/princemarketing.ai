import { refinePrompt } from '@/lib/claude';
import { createPrediction, pollPrediction } from '@/lib/seedance';
import { createGenerationId } from '@/types/ids';
import type { VideoGenerationRequest, VideoGenerationResult } from './types';
import { CREDITS_PER_DURATION, DEFAULT_ASPECT_RATIO, DEFAULT_DURATION } from './constants';
import type { VideoDuration } from './constants';

// Video generation pipeline:
// 1. Refine prompt via Claude
// 2. Submit to Seedance 2.0 Omni via MuAPI
// 3. Poll until complete
// 4. Return result with metadata

export async function generateVideo(
  request: VideoGenerationRequest,
): Promise<VideoGenerationResult> {
  const startTime = performance.now();

  // Step 1: Refine prompt for cinematic quality
  const refinedPrompt = await refinePrompt(request.prompt, {
    type: 'video',
  });

  // Step 2: Create Seedance prediction
  const predictionId = await createPrediction({
    prompt: refinedPrompt,
    negativePrompt: request.negativePrompt,
    duration: request.duration,
    aspectRatio: request.aspectRatio,
    referenceImages: request.referenceImages,
  });

  // Step 3: Poll until complete
  const prediction = await pollPrediction(predictionId);

  const durationMs = Math.round(performance.now() - startTime);

  return {
    generationId: createGenerationId(crypto.randomUUID()),
    videoUrl: prediction.output ?? '',
    refinedPrompt,
    predictionId,
    durationMs,
  };
}

export function getCreditsRequired(duration: VideoDuration): number {
  return CREDITS_PER_DURATION[duration];
}

export { DEFAULT_ASPECT_RATIO, DEFAULT_DURATION };
