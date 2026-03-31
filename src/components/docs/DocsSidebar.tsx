'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Key, Zap, Image, Video, FileText, BarChart3, Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

const NAV_SECTIONS: Array<{ title: string; items: ReadonlyArray<NavItem> }> = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Overview', href: '/docs', icon: <BookOpen className="w-4 h-4" /> },
      { label: 'Quickstart', href: '/docs/quickstart', icon: <Zap className="w-4 h-4" /> },
      { label: 'Authentication', href: '/docs/authentication', icon: <Key className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Generate',
    items: [
      { label: 'Image', href: '/docs/generate/image', icon: <Image className="w-4 h-4" /> },
      { label: 'Video', href: '/docs/generate/video', icon: <Video className="w-4 h-4" /> },
      { label: 'Copy', href: '/docs/generate/copy', icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Quality',
    items: [
      { label: 'Scoring System', href: '/docs/scoring', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <nav className="space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-display)]">
            {section.title}
          </h4>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors min-h-[44px]
                      ${isActive
                        ? 'bg-forge-blue/10 text-forge-blue'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden sticky top-16 z-40 border-b border-white/6 bg-void/90 backdrop-blur-sm px-4 py-2">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px]"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          {mobileOpen ? 'Close menu' : 'Documentation menu'}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-white/6 bg-void/95 backdrop-blur-sm px-4 py-4">
          {navContent}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-white/6 h-full overflow-y-auto py-6 px-4">
        {navContent}
      </aside>
    </>
  );
}
