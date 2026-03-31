import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { ArrowRight } from 'lucide-react';

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
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-forge-blue/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-forge-blue/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forge-blue/10 border border-forge-blue/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-forge-blue forge-pulse" />
              <span className="text-xs text-forge-blue font-[family-name:var(--font-display)]">
                Now accepting API keys
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight font-[family-name:var(--font-display)]">
              One API call.
              <br />
              <span className="text-forge-blue">Agency-grade</span> creative.
            </h1>

            <p className="text-lg text-slate-400 mt-6 max-w-lg leading-relaxed">
              Generate images, videos, and marketing copy through a single API.
              Every output is quality-scored across 12 dimensions before delivery.
              Below threshold? Auto-regenerated.
            </p>

            <div className="flex items-center gap-4 mt-8">
              <Link href="/register">
                <Button size="lg" icon={<ArrowRight className="w-4 h-4" />}>
                  Get your API key
                </Button>
              </Link>
              <Link href="/docs/quickstart">
                <Button variant="secondary" size="lg">
                  Read the docs
                </Button>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-6 mt-8 text-xs text-slate-500 font-[family-name:var(--font-display)]">
              <span>100 free credits</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>No credit card required</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>First generation in 4 seconds</span>
            </div>
          </div>

          {/* Right — live code example */}
          <div>
            <CodeBlock
              code={HERO_CODE}
              language="bash"
              title="Terminal"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
