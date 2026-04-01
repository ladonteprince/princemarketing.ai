// In-memory event emitter for generation progress streaming.
// WHY: Enables SSE endpoints to subscribe to real-time progress updates
// from background generation tasks without polling the database.

import { EventEmitter } from 'events';

export type GenerationEventType =
  | 'status_change'
  | 'progress'
  | 'scoring'
  | 'completed'
  | 'failed'
  | 'heartbeat';

export type GenerationEvent = {
  type: GenerationEventType;
  generationId: string;
  timestamp: string;
  data: {
    status?: string;
    previousStatus?: string;
    progress?: number;       // 0-100
    stage?: string;          // human-readable stage name
    message?: string;        // detail message
    resultUrl?: string;
    score?: number;
    feedback?: string;
    error?: string;
    model?: string;
    predictionId?: string;
    durationMs?: number;
  };
};

class GenerationEventBus extends EventEmitter {
  private static instance: GenerationEventBus;

  private constructor() {
    super();
    this.setMaxListeners(200); // Support many concurrent SSE connections
  }

  static getInstance(): GenerationEventBus {
    if (!GenerationEventBus.instance) {
      GenerationEventBus.instance = new GenerationEventBus();
    }
    return GenerationEventBus.instance;
  }

  emit(generationId: string, event: GenerationEvent): boolean {
    return super.emit(generationId, event);
  }

  subscribe(
    generationId: string,
    callback: (event: GenerationEvent) => void,
  ): () => void {
    this.on(generationId, callback);

    // Return unsubscribe function
    return () => {
      this.off(generationId, callback);
    };
  }
}

export const generationEvents = GenerationEventBus.getInstance();

// Helper to emit a generation event with consistent shape
export function emitGenerationEvent(
  generationId: string,
  type: GenerationEventType,
  data: GenerationEvent['data'],
): void {
  generationEvents.emit(generationId, {
    type,
    generationId,
    timestamp: new Date().toISOString(),
    data,
  });
}
