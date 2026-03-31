import { NextRequest } from 'next/server';
import { success, serverError } from '@/lib/apiResponse';

// GET /api/v1/generations — list recent generations
// In production, this queries Prisma. For now, returns demo data.

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    // Demo data for development
    const generations = [
      {
        id: 'gen_demo_001',
        type: 'image',
        status: 'delivered',
        prompt: 'A minimalist product shot of a luxury watch on dark marble',
        score: 8.7,
        creditsConsumed: 5,
        createdAt: '2026-03-30T10:00:00Z',
      },
      {
        id: 'gen_demo_002',
        type: 'video',
        status: 'passed',
        prompt: 'Cinematic drone shot of a modern architectural building at golden hour',
        score: 9.1,
        creditsConsumed: 15,
        createdAt: '2026-03-30T09:30:00Z',
      },
      {
        id: 'gen_demo_003',
        type: 'copy',
        status: 'delivered',
        prompt: 'Write a bold social media post for a fintech product launch',
        score: 8.3,
        creditsConsumed: 2,
        createdAt: '2026-03-29T14:20:00Z',
      },
    ].filter((g) => {
      if (type && g.type !== type) return false;
      if (status && g.status !== status) return false;
      return true;
    }).slice(offset, offset + limit);

    return success({
      generations,
      pagination: { limit, offset, total: generations.length },
    });
  } catch (err) {
    console.error('[API] GET /v1/generations error:', err);
    return serverError();
  }
}
