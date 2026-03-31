import NextImage from 'next/image';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Image, Video, FileText, BarChart3, Zap, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  image?: string;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: <Image className="w-5 h-5 text-forge-blue" />,
    title: 'Image Generation',
    description: 'Product shots, social media assets, and brand imagery. Prompt refinement via Claude ensures production-ready output.',
    badge: '5 credits',
    image: '/images/feature-image-gen.png',
  },
  {
    icon: <Video className="w-5 h-5 text-forge-blue" />,
    title: 'Video Generation',
    description: 'Powered by Seedance 2.0 Omni. 5-15 second cinematic clips with character reference support. No text overlays, ever.',
    badge: '15-45 credits',
    image: '/images/feature-video-gen.png',
  },
  {
    icon: <FileText className="w-5 h-5 text-forge-blue" />,
    title: 'Copy Generation',
    description: 'Ad copy, social posts, emails, landing pages. Tone-controlled, brand-aware, conversion-focused.',
    badge: '2 credits',
    image: '/images/feature-copy-gen.png',
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-forge-blue" />,
    title: 'Quality Scoring',
    description: '12 dimensions scored by a critic agent. Clarity, composition, brand alignment, emotional impact, AI artifact detection (1.3x weight).',
    badge: '1 credit',
    image: '/images/feature-scoring.png',
  },
  {
    icon: <Zap className="w-5 h-5 text-ember" />,
    title: 'Auto-Regeneration',
    description: 'Outputs below your quality tier threshold are automatically regenerated with critic feedback. Up to 3 attempts.',
  },
  {
    icon: <Shield className="w-5 h-5 text-mint" />,
    title: 'Quality Tiers',
    description: 'Starter (7.0+), Pro (8.0+), Agency (8.5+). Set your minimum quality bar. Every output meets it or gets rejected.',
  },
];

export function Features() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 border-t border-white/6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-display)]">
            Four endpoints. Complete creative production.
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Every endpoint returns quality-scored output. Every asset passes through the critic agent.
            Below threshold = auto-regenerated.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FEATURES.map((feature) => (
            <Card key={feature.title} hover className={feature.image ? 'p-0 overflow-hidden' : ''}>
              {feature.image && (
                <div className="relative w-full aspect-[16/10] border-b border-white/6">
                  <NextImage
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover rounded-t-xl"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              <div className={feature.image ? 'p-6' : ''}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-white/5">
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span className="text-xs text-slate-500 font-[family-name:var(--font-mono)]">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
