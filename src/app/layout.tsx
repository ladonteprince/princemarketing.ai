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
  metadataBase: new URL('https://princemarketing.ai'),
  title: {
    default: 'PrinceMarketing.ai — AI Creative Production Engine',
    template: '%s | PrinceMarketing.ai',
  },
  description: 'One API call. Agency-grade creative. Quality-scored before you see it. Generate images, videos, and marketing copy through a single API.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://princemarketing.ai',
    siteName: 'PrinceMarketing.ai',
    title: 'PrinceMarketing.ai — AI Creative Production Engine',
    description: 'One API call. Agency-grade creative. Quality-scored before you see it. Generate images, videos, and marketing copy through a single API.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PrinceMarketing.ai' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrinceMarketing.ai — AI Creative Production Engine',
    description: 'One API call. Agency-grade creative. Quality-scored before you see it.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
