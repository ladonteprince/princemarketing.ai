import { NextRequest } from 'next/server';
import { success, notFound, serverError } from '@/lib/apiResponse';

// GET /api/v1/generations/:id — get a single generation by ID

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Demo data for development
    const demoGenerations: Record<string, unknown> = {
      gen_demo_001: {
        id: 'gen_demo_001',
        type: 'image',
        status: 'delivered',
        prompt: 'A minimalist product shot of a luxury watch on dark marble',
        refinedPrompt: 'A luxury timepiece positioned on a slab of dark Nero Marquina marble. Soft directional lighting from upper left creates subtle reflections on the polished case. Shallow depth of field. Matte black background. Color palette: deep blacks, warm gold accents, cool steel highlights.',
        resultUrl: 'https://api.princemarketing.ai/v1/generations/gen_demo_001.png',
        score: 8.7,
        scoringResult: {
          aggregateScore: 8.7,
          passed: true,
          qualityTier: 'pro',
          dimensions: [
            { dimension: 'clarity', score: 9.0, reasoning: 'Product is immediately identifiable with clean presentation.' },
            { dimension: 'composition', score: 8.5, reasoning: 'Strong rule of thirds placement with effective negative space.' },
            { dimension: 'brandAlignment', score: 8.0, reasoning: 'Luxury positioning consistent with premium watch branding.' },
            { dimension: 'emotionalImpact', score: 8.5, reasoning: 'Conveys aspirational quality and craftsmanship.' },
            { dimension: 'technicalQuality', score: 9.2, reasoning: 'High resolution with excellent detail rendering.' },
            { dimension: 'originality', score: 7.5, reasoning: 'Classic product photography approach, well executed.' },
            { dimension: 'messageEffectiveness', score: 8.5, reasoning: 'Clear premium product positioning.' },
            { dimension: 'visualHierarchy', score: 9.0, reasoning: 'Single focal point with clean background.' },
            { dimension: 'colorPsychology', score: 8.8, reasoning: 'Dark palette with gold accents signals luxury.' },
            { dimension: 'typography', score: 8.0, reasoning: 'N/A for this asset — scored on overall text absence.' },
            { dimension: 'ctaStrength', score: 7.0, reasoning: 'Product-focused, no explicit CTA needed.' },
            { dimension: 'aiArtifactDetection', score: 9.5, reasoning: 'No visible artifacts. Clean edges and reflections.' },
          ],
          feedback: 'Strong product shot with excellent technical quality. Consider more creative angles for higher originality scores.',
        },
        creditsConsumed: 5,
        durationMs: 3_420,
        createdAt: '2026-03-30T10:00:00Z',
      },
    };

    const generation = demoGenerations[id];
    if (!generation) {
      return notFound(`Generation ${id} not found.`);
    }

    return success(generation);
  } catch (err) {
    console.error(`[API] GET /v1/generations/${(await params).id} error:`, err);
    return serverError();
  }
}
