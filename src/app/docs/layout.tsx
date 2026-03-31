import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { DocsSidebar } from '@/components/docs/DocsSidebar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        <DocsSidebar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  );
}
