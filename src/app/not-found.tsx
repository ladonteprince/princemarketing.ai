import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-void">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold font-[family-name:var(--font-display)] text-forge-blue mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-display)]">
          Page not found
        </h1>
        <p className="text-slate-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-forge-blue text-white font-medium font-[family-name:var(--font-display)] hover:bg-arc-light transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-slate-surface text-slate-200 border border-white/6 font-medium font-[family-name:var(--font-display)] hover:bg-white/10 transition-colors"
          >
            API docs
          </Link>
        </div>
      </div>
    </div>
  );
}
