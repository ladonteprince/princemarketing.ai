import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { ArrowRight } from 'lucide-react';
import { SplineBackground } from '@/components/SplineBackground';

const HERO_CODE = `curl -X POST https://api.princemarketing.ai/v1/generate/image \\
  -H "Authorization: Bearer pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Premium headphones on matte black surface, soft studio lighting",
    "style": "photorealistic",
    "qualityTier": "agency"
  }'`;

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Spline 3D animated background — subtle atmosphere */}
      <SplineBackground />

      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-forge-blue/5 via-transparent to-transparent pointer-events-none z-[1]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] lg:w-[800px] h-[300px] sm:h-[400px] lg:h-[600px] bg-forge-blue/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forge-blue/10 border border-forge-blue/20 mb-4 sm:mb-6">
              <span className="w-2 h-2 rounded-full bg-forge-blue forge-pulse" />
              <span className="text-xs text-forge-blue font-[family-name:var(--font-display)]">
                Now accepting API keys
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight font-[family-name:var(--font-display)]">
              One API call.
              <br />
              <span className="text-forge-blue">Agency-grade</span> creative.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 mt-4 sm:mt-6 max-w-lg leading-relaxed">
              Generate images, videos, and marketing copy through a single API.
              Every output is quality-scored across 12 dimensions before delivery.
              Below threshold? Auto-regenerated.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
              <Link href="/register">
                <Button size="lg" icon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
                  Get your API key
                </Button>
              </Link>
              <Link href="/docs/quickstart">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Read the docs
                </Button>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 mt-6 sm:mt-8 text-xs text-slate-500 font-[family-name:var(--font-display)]">
              <span>100 free credits</span>
              <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700" />
              <span>No credit card required</span>
              <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700" />
              <span>First generation in 4 seconds</span>
            </div>
          </div>

          {/* Right — live code example */}
          <div className="overflow-hidden">
            <CodeBlock
              code={HERO_CODE}
              language="bash"
              title="Terminal"
            />
          </div>
        </div>

        {/* Agent forge hero image */}
        <div className="relative mt-12 sm:mt-16 overflow-hidden rounded-xl border border-slate-800/50 shadow-2xl shadow-forge-blue/10">
          <Image
            src="/images/hero-forge.png"
            alt="AI creative production forge — agents generating images, videos, and copy through a unified API"
            width={1200}
            height={675}
            className="w-full"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void/60 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
