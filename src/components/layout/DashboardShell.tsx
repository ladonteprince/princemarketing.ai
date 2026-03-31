'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Terminal,
  Key,
  History,
  BarChart3,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

const SIDEBAR_ITEMS: ReadonlyArray<NavItem> = [
  { label: 'Overview', href: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Playground', href: '/playground', icon: <Terminal className="w-4 h-4" /> },
  { label: 'API Keys', href: '/keys', icon: <Key className="w-4 h-4" /> },
  { label: 'Generations', href: '/generations', icon: <History className="w-4 h-4" /> },
  { label: 'Usage', href: '/usage', icon: <BarChart3 className="w-4 h-4" /> },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarNav = (
    <>
      {/* Nav items */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]
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
      </nav>

      {/* Footer link */}
      <div className="p-3 border-t border-white/6">
        <Link
          href="/docs"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors min-h-[44px]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          API Documentation
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 px-4 flex items-center justify-between border-b border-white/6 bg-graphite">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/pmai-icon-A.svg" alt="" className="h-7 w-7" />
          <span className="text-sm font-bold text-white font-[family-name:var(--font-display)]">
            P<span className="text-forge-blue">.ai</span>
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="md:hidden fixed top-14 left-0 bottom-0 z-50 w-60 bg-graphite border-r border-white/6 flex flex-col overflow-y-auto">
            {sidebarNav}
          </aside>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-white/6 bg-graphite flex-col">
        {/* Logo */}
        <div className="h-16 px-5 flex items-center border-b border-white/6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/pmai-icon-A.svg" alt="" className="h-7 w-7" />
            <span className="text-sm font-bold text-white font-[family-name:var(--font-display)]">
              P<span className="text-forge-blue">.ai</span>
            </span>
          </Link>
        </div>
        {sidebarNav}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-void pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
