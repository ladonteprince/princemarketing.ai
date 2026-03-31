import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { DocsSidebar } from '@/components/docs/DocsSidebar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        <DocsSidebar />
        <main className="flex-1 px-8 py-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  );
}
