import { NextResponse } from 'next/server';

// Consistent API response shape across all endpoints

type SuccessResponse<T> = {
  type: 'success';
  data: T;
  meta: {
    generationId?: string;
    creditsConsumed?: number;
    duration_ms?: number;
  };
};

type ErrorResponse = {
  type: 'error';
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function success<T>(
  data: T,
  meta?: SuccessResponse<T>['meta'],
  status = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { type: 'success' as const, data, meta: meta ?? {} },
    { status },
  );
}

export function error(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { type: 'error' as const, error: { code, message, details } },
    { status },
  );
}

// Common error responses
export function badRequest(message: string, details?: unknown) {
  return error('BAD_REQUEST', message, 400, details);
}

export function unauthorized(message = 'Invalid or missing API key.') {
  return error('UNAUTHORIZED', message, 401);
}

export function forbidden(message = 'Insufficient credits.') {
  return error('FORBIDDEN', message, 403);
}

export function notFound(message = 'Resource not found.') {
  return error('NOT_FOUND', message, 404);
}

export function rateLimited(message = 'Rate limit exceeded. Try again later.') {
  return error('RATE_LIMITED', message, 429);
}

export function serverError(message = 'Internal server error.') {
  return error('INTERNAL_ERROR', message, 500);
}
