import { ScoreBadge } from '@/components/ui/ScoreBadge';

const DEMO_DIMENSIONS = [
  { name: 'Clarity', score: 9.0 },
  { name: 'Composition', score: 8.5 },
  { name: 'Brand Alignment', score: 8.0 },
  { name: 'Emotional Impact', score: 8.5 },
  { name: 'Technical Quality', score: 9.2 },
  { name: 'Originality', score: 7.5 },
  { name: 'Message Effectiveness', score: 8.5 },
  { name: 'Visual Hierarchy', score: 9.0 },
  { name: 'Color Psychology', score: 8.8 },
  { name: 'Typography', score: 8.0 },
  { name: 'CTA Strength', score: 7.0 },
  { name: 'AI Artifact Detection', score: 9.5, weighted: true },
];

export function ScoringDemo() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 border-t border-white/6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — explanation */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-display)]">
              12-dimension quality scoring.
              <br />
              <span className="text-forge-blue">Every single output.</span>
            </h2>
            <p className="text-slate-400 mt-4 leading-relaxed text-sm sm:text-base">
              A critic agent powered by Claude evaluates every generation across 12 dimensions.
              AI Artifact Detection carries 1.3x weight because clients notice artifacts first.
            </p>
            <p className="text-slate-400 mt-3 leading-relaxed text-sm sm:text-base">
              Set your quality tier. Outputs below threshold are auto-regenerated with
              critic feedback up to 3 times. Only passing assets reach your application.
            </p>

            <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { tier: 'Starter', threshold: '7.0+', color: 'text-ember' },
                { tier: 'Pro', threshold: '8.0+', color: 'text-arc-light' },
                { tier: 'Agency', threshold: '8.5+', color: 'text-mint' },
              ].map((item) => (
                <div key={item.tier} className="text-center py-2 sm:py-3 rounded-lg bg-graphite border border-white/6">
                  <p className="text-xs text-slate-500 font-[family-name:var(--font-display)]">{item.tier}</p>
                  <p className={`text-lg sm:text-xl font-bold font-[family-name:var(--font-mono)] mt-1 ${item.color}`}>
                    {item.threshold}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — score card demo */}
          <div className="bg-graphite rounded-xl border border-white/6 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <p className="text-xs text-slate-500 font-[family-name:var(--font-display)]">Aggregate Score</p>
                <div className="flex items-center gap-3 mt-1">
                  <ScoreBadge score={8.7} className="text-lg" />
                  <span className="text-xs text-mint font-[family-name:var(--font-display)]">PASSED (Pro)</span>
                </div>
              </div>
              <span className="text-xs text-slate-600 font-[family-name:var(--font-mono)] hidden sm:inline">gen_demo_001</span>
            </div>

            <div className="space-y-2">
              {DEMO_DIMENSIONS.map((dim) => (
                <div key={dim.name} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-28 sm:w-44 text-xs text-slate-400 truncate">
                    {dim.name}
                    {dim.weighted && (
                      <span className="text-forge-blue ml-1">(1.3x)</span>
                    )}
                  </span>
                  {/* Score bar */}
                  <div className="flex-1 h-1.5 bg-void rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dim.score >= 8.5 ? 'bg-mint' :
                        dim.score >= 8.0 ? 'bg-arc-light' :
                        dim.score >= 7.0 ? 'bg-ember' :
                        'bg-flare'
                      }`}
                      style={{ width: `${dim.score * 10}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-slate-300 font-[family-name:var(--font-mono)] tabular-nums">
                    {dim.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
