import { CodeBlock } from '@/components/docs/CodeBlock';
import { EndpointCard, ParamRow } from '@/components/docs/EndpointCard';

const SCORE_EXAMPLE = `curl -X POST https://api.princemarketing.ai/v1/score \\
  -H "Authorization: Bearer pk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "copy",
    "prompt": "Social media post for fintech launch",
    "resultContent": "Your money just got smarter...",
    "qualityTier": "pro"
  }'`;

export default function ScoringDocsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-display)]">
        Quality Scoring System
      </h1>
      <p className="text-slate-400 mt-3 text-base sm:text-lg">
        Every generation is scored across 12 dimensions by a critic agent powered by Claude.
        You can also score external assets using the standalone scoring endpoint.
      </p>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">12 Dimensions</h2>
        <div className="mt-4 space-y-2">
          {[
            { name: 'Clarity', weight: '1.0x', desc: 'How clear and immediately understandable is the message or visual?' },
            { name: 'Composition', weight: '1.0x', desc: 'Visual balance, framing, rule of thirds, negative space.' },
            { name: 'Brand Alignment', weight: '1.0x', desc: 'Consistency with brand visual identity and voice.' },
            { name: 'Emotional Impact', weight: '1.0x', desc: 'Does the asset evoke the intended emotional response?' },
            { name: 'Technical Quality', weight: '1.0x', desc: 'Resolution, sharpness, noise levels, rendering quality.' },
            { name: 'Originality', weight: '1.0x', desc: 'How distinctive and non-generic is the output?' },
            { name: 'Message Effectiveness', weight: '1.0x', desc: 'Does the core message land with the target audience?' },
            { name: 'Visual Hierarchy', weight: '1.0x', desc: 'Clear focal point and reading order.' },
            { name: 'Color Psychology', weight: '1.0x', desc: 'Colors support emotional intent and brand palette.' },
            { name: 'Typography', weight: '1.0x', desc: 'Readability, hierarchy, font pairing.' },
            { name: 'CTA Strength', weight: '1.0x', desc: 'Clear, compelling, action-oriented call-to-action.' },
            { name: 'AI Artifact Detection', weight: '1.3x', desc: 'Absence of AI tells: malformed hands, text gibberish, uncanny faces.' },
          ].map((dim) => (
            <div key={dim.name} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-white/4">
              <span className="sm:w-48 shrink-0 text-sm text-white font-[family-name:var(--font-display)]">
                {dim.name}
                <span className={`ml-2 text-xs ${dim.weight === '1.3x' ? 'text-forge-blue' : 'text-slate-600'}`}>
                  {dim.weight}
                </span>
              </span>
              <span className="text-sm text-slate-400">{dim.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">Quality Tiers</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            { tier: 'Starter', min: '7.0', color: 'text-ember border-ember/20' },
            { tier: 'Pro', min: '8.0', color: 'text-arc-light border-arc-light/20' },
            { tier: 'Agency', min: '8.5', color: 'text-mint border-mint/20' },
          ].map((t) => (
            <div key={t.tier} className={`p-4 rounded-lg bg-graphite border ${t.color} text-center`}>
              <p className="text-sm text-slate-400">{t.tier}</p>
              <p className={`text-2xl font-bold font-[family-name:var(--font-mono)] mt-1 ${t.color.split(' ')[0]}`}>{t.min}+</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)] mb-4">Score an external asset</h2>
        <CodeBlock code={SCORE_EXAMPLE} language="bash" title="Standalone scoring" />
        <div className="mt-4">
          <EndpointCard method="POST" path="/v1/score" description="Score any asset against the 12-dimension quality system.">
            <div className="space-y-0">
              <ParamRow name="type" type="string" required description="Asset type: image, video, or copy." />
              <ParamRow name="prompt" type="string" required description="Original creative brief or prompt." />
              <ParamRow name="resultUrl" type="string" description="URL of the image/video to score. Required for image/video." />
              <ParamRow name="resultContent" type="string" description="Text content to score. Required for copy." />
              <ParamRow name="qualityTier" type="string" description="Quality tier for pass/fail determination." defaultValue="pro" />
            </div>
          </EndpointCard>
        </div>
      </div>
    </div>
  );
}
