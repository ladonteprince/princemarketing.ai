import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JetBrains_Mono, Inter } from 'next/font/google';
import '@/styles/globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PrinceMarketing.ai — AI Creative Production Engine',
  description: 'One API call. Agency-grade creative. Quality-scored before you see it. Generate images, videos, and marketing copy through a single API.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${inter.variable} dark`}>
      <body className="min-h-screen bg-void text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
