'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import { Image, Video, FileText, BarChart3, ChevronDown } from 'lucide-react';
import { RevealText } from './RevealText';
import type { ReactNode } from 'react';

type AccordionFeature = {
  icon: ReactNode;
  title: string;
  description: string;
  badge: string;
  image: string;
  code: string;
};

const FEATURES: ReadonlyArray<AccordionFeature> = [
  {
    icon: <Image className="w-5 h-5 text-forge-blue" />,
    title: 'Image Generation',
    description:
      'Product shots, social media assets, and brand imagery. Prompt refinement via Claude ensures production-ready output.',
    badge: '5 credits',
    image: '/images/feature-image-gen.png',
    code: `POST /v1/generate/image
{
  "prompt": "Premium headphones on marble surface",
  "style": "photorealistic",
  "qualityTier": "agency"
}`,
  },
  {
    icon: <Video className="w-5 h-5 text-forge-blue" />,
    title: 'Video Generation',
    description:
      'Powered by Seedance 2.0 Omni. 5-15 second cinematic clips with character reference support. No text overlays, ever.',
    badge: '15-45 credits',
    image: '/images/feature-video-gen.png',
    code: `POST /v1/generate/video
{
  "prompt": "Luxury perfume bottle, slow orbit, golden hour",
  "duration": 10,
  "characterRef": "chr_abc123"
}`,
  },
  {
    icon: <FileText className="w-5 h-5 text-forge-blue" />,
    title: 'Copy Generation',
    description:
      'Ad copy, social posts, emails, landing pages. Tone-controlled, brand-aware, conversion-focused.',
    badge: '2 credits',
    image: '/images/feature-copy-gen.png',
    code: `POST /v1/generate/copy
{
  "type": "ad_copy",
  "product": "Wireless noise-canceling headphones",
  "tone": "premium",
  "platform": "instagram"
}`,
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-forge-blue" />,
    title: 'Quality Scoring',
    description:
      '12 dimensions scored by a critic agent. Clarity, composition, brand alignment, emotional impact, AI artifact detection (1.3x weight).',
    badge: '1 credit',
    image: '/images/feature-scoring.png',
    code: `POST /v1/score
{
  "assetUrl": "https://cdn.example.com/hero.png",
  "dimensions": "all",
  "qualityTier": "pro"
}
// Returns: { "score": 9.4, "verdict": "PASS" }`,
  },
];

function AccordionItem({
  feature,
  isOpen,
  onToggle,
}: {
  feature: AccordionFeature;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-graphite overflow-hidden transition-colors duration-200 hover:border-forge-blue/20">
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left cursor-pointer"
      >
        <div className="p-2.5 rounded-lg bg-white/5 shrink-0">
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-white font-[family-name:var(--font-display)]">
              {feature.title}
            </h3>
            <span className="text-xs text-slate-500 font-[family-name:var(--font-mono)] shrink-0">
              {feature.badge}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
            {feature.description}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded content */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-5 pb-5 border-t border-white/6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Feature image */}
              <div className="relative aspect-[16/10] rounded-lg overflow-hidden border border-white/6">
                <NextImage
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              {/* Code example */}
              <div className="rounded-lg bg-void border border-white/6 p-4 overflow-x-auto">
                <p className="text-xs text-slate-500 font-[family-name:var(--font-display)] mb-2">
                  API Example
                </p>
                <pre className="text-xs text-slate-300 font-[family-name:var(--font-mono)] leading-relaxed whitespace-pre-wrap">
                  {feature.code}
                </pre>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-3">{feature.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccordionFeatures() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 sm:py-20 lg:py-24 border-t border-white/6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealText>
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-display)]">
              Four endpoints. Complete creative production.
            </h2>
            <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
              Every endpoint returns quality-scored output. Every asset passes
              through the critic agent. Below threshold = auto-regenerated.
            </p>
          </div>
        </RevealText>

        <div className="space-y-3">
          {FEATURES.map((feature, i) => (
            <RevealText key={feature.title}>
              <AccordionItem
                feature={feature}
                isOpen={openIndex === i}
                onToggle={() =>
                  setOpenIndex(openIndex === i ? null : i)
                }
              />
            </RevealText>
          ))}
        </div>
      </div>
    </section>
  );
}
