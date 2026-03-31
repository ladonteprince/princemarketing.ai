'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-void/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/pmai-icon-A.svg" alt="PrinceMarketing.ai" className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="text-base sm:text-lg font-bold text-white font-[family-name:var(--font-display)]">
            PrinceMarketing<span className="text-forge-blue">.ai</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
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

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">Get API key</Button>
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/6 bg-void/95 backdrop-blur-xl">
          <nav className="px-4 py-4 space-y-1">
            <Link
              href="/docs"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-[family-name:var(--font-display)]"
            >
              Docs
            </Link>
            <Link
              href="/docs/quickstart"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-[family-name:var(--font-display)]"
            >
              Quickstart
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-[family-name:var(--font-display)]"
            >
              Pricing
            </Link>
          </nav>
          <div className="px-4 pb-4 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="md" className="w-full">Log in</Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button variant="primary" size="md" className="w-full">Get API key</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
