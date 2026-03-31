import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── API Key Auth for /api/v1/* routes ──────────────────────────────────
  if (pathname.startsWith('/api/v1')) {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
      ?? request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        {
          type: 'error',
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing API key. Pass it as Authorization: Bearer <key> or x-api-key header.',
          },
        },
        { status: 401 },
      );
    }

    // API key validation happens in the route handler (needs DB access)
    // We just ensure the header is present at the middleware level.
    // The route handler will hash and look up the key.
    return NextResponse.next();
  }

  // ─── Session Auth for /dashboard/* routes ───────────────────────────────
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/keys') || pathname.startsWith('/usage') || pathname.startsWith('/playground') || pathname.startsWith('/generations')) {
    const session = await auth();

    if (!session?.user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/v1/:path*',
    '/dashboard/:path*',
    '/keys/:path*',
    '/usage/:path*',
    '/playground/:path*',
    '/generations/:path*',
  ],
};
