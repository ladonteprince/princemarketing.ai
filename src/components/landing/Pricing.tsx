import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Check } from 'lucide-react';

type PricingTier = {
  name: string;
  price: string;
  period: string;
  credits: string;
  qualityMin: string;
  description: string;
  features: ReadonlyArray<string>;
  highlighted?: boolean;
  cta: string;
};

const TIERS: ReadonlyArray<PricingTier> = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    credits: '500 credits',
    qualityMin: '7.0+',
    description: 'For indie hackers and early-stage startups testing creative automation.',
    features: [
      '500 credits/month',
      '7.0+ quality threshold',
      'Image, video, copy generation',
      '12-dimension scoring',
      'API + dashboard access',
      'Email support',
    ],
    cta: 'Start building',
  },
  {
    name: 'Pro',
    price: '$149',
    period: '/month',
    credits: '3,000 credits',
    qualityMin: '8.0+',
    description: 'For teams that need consistent, high-quality creative at scale.',
    features: [
      '3,000 credits/month',
      '8.0+ quality threshold',
      'Everything in Starter',
      'Auto-regeneration (up to 3x)',
      'Priority generation queue',
      'Webhook notifications',
      'Slack support',
    ],
    highlighted: true,
    cta: 'Get Pro access',
  },
  {
    name: 'Agency',
    price: '$499',
    period: '/month',
    credits: '15,000 credits',
    qualityMin: '8.5+',
    description: 'For agencies and enterprises that demand the highest quality bar.',
    features: [
      '15,000 credits/month',
      '8.5+ quality threshold',
      'Everything in Pro',
      'Custom quality dimensions',
      'Brand profile storage',
      'Dedicated account manager',
      'SLA guarantee',
      '24/7 support',
    ],
    cta: 'Contact sales',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-16 sm:py-20 lg:py-24 border-t border-white/6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-display)]">
            Usage-based pricing. No surprises.
          </h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Pay for what you generate. Higher tiers get stricter quality gates and priority processing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`
                relative rounded-xl p-6 sm:p-8 border
                ${tier.highlighted
                  ? 'bg-graphite border-forge-blue/40 shadow-[0_0_60px_-12px_rgba(14,165,233,0.15)]'
                  : 'bg-graphite border-white/6'
                }
              `}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-forge-blue text-xs font-semibold text-white font-[family-name:var(--font-display)]">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white font-[family-name:var(--font-display)]">
                  {tier.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-white font-[family-name:var(--font-display)]">
                    {tier.price}
                  </span>
                  <span className="text-sm text-slate-500">{tier.period}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-400 font-[family-name:var(--font-mono)]">{tier.credits}</span>
                  <span className="text-xs text-slate-600">|</span>
                  <span className="text-xs text-mint font-[family-name:var(--font-mono)]">min {tier.qualityMin}</span>
                </div>
                <p className="text-sm text-slate-500 mt-3">{tier.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-forge-blue shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button
                  variant={tier.highlighted ? 'primary' : 'secondary'}
                  size="lg"
                  className="w-full"
                >
                  {tier.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Credit usage reference */}
        <div className="mt-8 sm:mt-12 bg-graphite rounded-xl border border-white/6 p-4 sm:p-6">
          <h4 className="text-sm font-semibold text-white font-[family-name:var(--font-display)] mb-4">
            Credit usage reference
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 text-center">
            {[
              { label: 'Image', credits: '5' },
              { label: 'Video (5s)', credits: '15' },
              { label: 'Video (10s)', credits: '30' },
              { label: 'Video (15s)', credits: '45' },
              { label: 'Copy', credits: '2' },
            ].map((item) => (
              <div key={item.label} className="py-2">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-base sm:text-lg font-bold text-white font-[family-name:var(--font-mono)] mt-1">
                  {item.credits}
                </p>
                <p className="text-xs text-slate-600">credits</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
