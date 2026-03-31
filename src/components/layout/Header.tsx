import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-void/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/pmai-icon-A.svg" alt="PrinceMarketing.ai" className="h-8 w-8" />
          <span className="text-lg font-bold text-white font-[family-name:var(--font-display)]">
            PrinceMarketing<span className="text-forge-blue">.ai</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/docs"
            className="text-sm text-slate-400 hover:text-white transition-colors font-[family-name:var(--font-display)]"
          >
            Docs
          </Link>
          <Link
            href="/docs/quickstart"
            className="text-sm text-slate-400 hover:text-white transition-colors font-[family-name:var(--font-display)]"
          >
            Quickstart
          </Link>
          <Link
            href="/#pricing"
            className="text-sm text-slate-400 hover:text-white transition-colors font-[family-name:var(--font-display)]"
          >
            Pricing
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">Get API key</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
