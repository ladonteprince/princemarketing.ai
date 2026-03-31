'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-void">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold font-[family-name:var(--font-display)] text-flare mb-4">
          Error
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-display)]">
          Something went wrong
        </h1>
        <p className="text-slate-400 mb-8">
          An unexpected error occurred. Our team has been notified.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-forge-blue text-white font-medium font-[family-name:var(--font-display)] hover:bg-arc-light transition-colors cursor-pointer"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-slate-surface text-slate-200 border border-white/6 font-medium font-[family-name:var(--font-display)] hover:bg-white/10 transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
