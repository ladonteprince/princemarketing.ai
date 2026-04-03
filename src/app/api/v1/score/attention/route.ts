import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  scoreAttentionText,
  scoreAttentionMedia,
} from '@/engine/CriticAgent/GeminiCritic';
import { success, badRequest, serverError } from '@/lib/apiResponse';

// WHY: Scores content against the Attention Architecture framework using
// Gemini 3.1 Pro as an independent evaluator. Text content is scored on
// Storylock usage and Dopamine Ladder coverage. Video/image content is
// scored visually — Gemini watches the actual media and evaluates the
// psychological dimensions (motion/contrast in stimulation frame, etc.)

const attentionScoreSchema = z.object({
  // Text content to score (required for text, optional alongside media)
  content: z.string().max(20000).optional(),
  // Media URL for video/image scoring (Gemini watches it)
  mediaUrl: z.string().url().optional(),
  // Media type if providing a URL
  mediaType: z.enum(['image', 'video']).optional(),
  // Content format determines timing expectations
  format: z
    .enum(['short-form', 'long-form', 'ad', 'caption', 'email', 'landing-page'])
    .optional()
    .default('short-form'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = attentionScoreSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        `Invalid request. ${parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
        parsed.error.flatten(),
      );
    }

    const { content, mediaUrl, mediaType, format } = parsed.data;

    if (!content && !mediaUrl) {
      return badRequest('Either content (text) or mediaUrl (video/image) is required.');
    }

    let result;

    if (mediaUrl && mediaType) {
      // Score media visually + optionally with accompanying text
      result = await scoreAttentionMedia(mediaUrl, mediaType, content, format);
    } else if (content) {
      // Score text-only content
      result = await scoreAttentionText(content, format);
    } else {
      return badRequest('Provide content text or mediaUrl + mediaType.');
    }

    return success(result, {
      creditsConsumed: mediaUrl ? 3 : 1, // Media scoring costs more (downloads + processes video)
    });
  } catch (err) {
    console.error('[API] POST /v1/score/attention error:', err);
    return serverError('Failed to score content against Attention Architecture.');
  }
}
