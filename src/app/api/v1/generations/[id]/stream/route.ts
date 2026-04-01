import { NextRequest } from 'next/server';
import { unauthorized, notFound, serverError } from '@/lib/apiResponse';
import { validateApiKey } from '@/lib/validateApiKey';
import { prisma } from '@/lib/db';
import { generationEvents, type GenerationEvent } from '@/lib/generation-events';

// GET /api/v1/generations/:id/stream — SSE endpoint for real-time generation progress
// WHY: Replaces polling with a persistent connection. Client opens once, gets live updates
// until generation completes or fails. Heartbeat every 15s prevents connection timeout.

const HEARTBEAT_INTERVAL_MS = 15_000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rawKey = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? request.headers.get('x-api-key') ?? '';

  try {
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    const { id } = await params;

    // Verify generation exists and belongs to this user
    const generation = await prisma.generation.findFirst({
      where: { id, userId: apiKeyRecord.userId },
    });

    if (!generation) {
      return notFound(`Generation ${id} not found.`);
    }

    // If already terminal, send final state and close
    const terminalStatuses = ['passed', 'failed', 'delivered'];
    if (terminalStatuses.includes(generation.status)) {
      const body = formatSSE({
        type: generation.status === 'failed' ? 'failed' : 'completed',
        generationId: id,
        timestamp: new Date().toISOString(),
        data: {
          status: generation.status,
          resultUrl: generation.resultUrl ?? undefined,
          score: generation.score ?? undefined,
          error: generation.errorMessage ?? undefined,
        },
      });

      return new Response(body + 'event: done\ndata: {}\n\n', {
        status: 200,
        headers: sseHeaders(),
      });
    }

    // Stream live events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let closed = false;

        function send(text: string) {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            closed = true;
          }
        }

        // Send initial status
        send(formatSSE({
          type: 'status_change',
          generationId: id,
          timestamp: new Date().toISOString(),
          data: {
            status: generation.status,
            message: `Connected. Current status: ${generation.status}`,
          },
        }));

        // Subscribe to events
        const unsubscribe = generationEvents.subscribe(id, (event: GenerationEvent) => {
          send(formatSSE(event));

          // Close stream on terminal events
          if (event.type === 'completed' || event.type === 'failed') {
            send('event: done\ndata: {}\n\n');
            closed = true;
            clearInterval(heartbeat);
            unsubscribe();
            try { controller.close(); } catch { /* already closed */ }
          }
        });

        // Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          send(formatSSE({
            type: 'heartbeat',
            generationId: id,
            timestamp: new Date().toISOString(),
            data: { message: 'keepalive' },
          }));
        }, HEARTBEAT_INTERVAL_MS);

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          try { controller.close(); } catch { /* already closed */ }
        });
      },
    });

    return new Response(stream, {
      status: 200,
      headers: sseHeaders(),
    });
  } catch (err) {
    const { id } = await params;
    console.error(`[SSE] GET /v1/generations/${id}/stream error:`, err);
    return serverError();
  }
}

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  };
}

function formatSSE(event: GenerationEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
