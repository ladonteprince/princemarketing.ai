import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Image, Video, FileText, BarChart3, Zap, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: <Image className="w-5 h-5 text-forge-blue" />,
    title: 'Image Generation',
    description: 'Product shots, social media assets, and brand imagery. Prompt refinement via Claude ensures production-ready output.',
    badge: '5 credits',
  },
  {
    icon: <Video className="w-5 h-5 text-forge-blue" />,
    title: 'Video Generation',
    description: 'Powered by Seedance 2.0 Omni. 5-15 second cinematic clips with character reference support. No text overlays, ever.',
    badge: '15-45 credits',
  },
  {
    icon: <FileText className="w-5 h-5 text-forge-blue" />,
    title: 'Copy Generation',
    description: 'Ad copy, social posts, emails, landing pages. Tone-controlled, brand-aware, conversion-focused.',
    badge: '2 credits',
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-forge-blue" />,
    title: 'Quality Scoring',
    description: '12 dimensions scored by a critic agent. Clarity, composition, brand alignment, emotional impact, AI artifact detection (1.3x weight).',
    badge: '1 credit',
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
    <section className="py-24 border-t border-white/6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white font-[family-name:var(--font-display)]">
            Four endpoints. Complete creative production.
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            Every endpoint returns quality-scored output. Every asset passes through the critic agent.
            Below threshold = auto-regenerated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <Card key={feature.title} hover>
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
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
