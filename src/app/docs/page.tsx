import Link from 'next/link';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Zap, Key, Image, Video, FileText, BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';

type DocLink = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const DOC_LINKS: ReadonlyArray<DocLink> = [
  {
    title: 'Quickstart',
    description: 'First API call in 4 seconds. Seriously.',
    href: '/docs/quickstart',
    icon: <Zap className="w-5 h-5 text-forge-blue" />,
  },
  {
    title: 'Authentication',
    description: 'API key setup. Live and test environments.',
    href: '/docs/authentication',
    icon: <Key className="w-5 h-5 text-forge-blue" />,
  },
  {
    title: 'Generate Image',
    description: 'Product shots, social assets, brand imagery.',
    href: '/docs/generate/image',
    icon: <Image className="w-5 h-5 text-forge-blue" />,
  },
  {
    title: 'Generate Video',
    description: 'Seedance 2.0 Omni. 5-15s cinematic clips.',
    href: '/docs/generate/video',
    icon: <Video className="w-5 h-5 text-forge-blue" />,
  },
  {
    title: 'Generate Copy',
    description: 'Ad copy, social posts, emails, landing pages.',
    href: '/docs/generate/copy',
    icon: <FileText className="w-5 h-5 text-forge-blue" />,
  },
  {
    title: 'Quality Scoring',
    description: '12 dimensions. Weighted aggregate. Quality gates.',
    href: '/docs/scoring',
    icon: <BarChart3 className="w-5 h-5 text-forge-blue" />,
  },
];

export default function DocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-display)]">
        API Documentation
      </h1>
      <p className="text-slate-400 mt-3 text-lg">
        PrinceMarketing.ai is an AI creative production engine. Generate images, videos, and marketing
        copy through a single API. Every output is quality-scored across 12 dimensions.
      </p>

      <div className="mt-4 p-4 rounded-lg bg-forge-blue/5 border border-forge-blue/20">
        <p className="text-sm text-forge-blue font-[family-name:var(--font-display)]">
          Base URL: <code className="font-[family-name:var(--font-mono)]">https://api.princemarketing.ai/v1</code>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        {DOC_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card hover className="h-full">
              <div className="flex items-center gap-3 mb-2">
                {link.icon}
                <CardTitle>{link.title}</CardTitle>
              </div>
              <CardDescription>{link.description}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
