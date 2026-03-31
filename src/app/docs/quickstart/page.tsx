import { CodeBlock } from '@/components/docs/CodeBlock';

const CURL_EXAMPLE = `curl -X POST https://api.princemarketing.ai/v1/generate/image \\
  -H "Authorization: Bearer pk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Premium headphones on matte black surface",
    "style": "photorealistic",
    "qualityTier": "pro"
  }'`;

const JS_EXAMPLE = `const response = await fetch('https://api.princemarketing.ai/v1/generate/image', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pk_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Premium headphones on matte black surface',
    style: 'photorealistic',
    qualityTier: 'pro',
  }),
});

const { data, meta } = await response.json();
console.log(data.imageUrl);      // Generated image URL
console.log(data.score.aggregate); // Quality score (e.g., 8.7)
console.log(meta.creditsConsumed); // Credits used (5)`;

const PYTHON_EXAMPLE = `import requests

response = requests.post(
    'https://api.princemarketing.ai/v1/generate/image',
    headers={
        'Authorization': 'Bearer pk_live_YOUR_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'prompt': 'Premium headphones on matte black surface',
        'style': 'photorealistic',
        'qualityTier': 'pro',
    },
)

data = response.json()
print(data['data']['imageUrl'])        # Generated image URL
print(data['data']['score']['aggregate'])  # Quality score
print(data['meta']['creditsConsumed'])     # Credits used`;

const RESPONSE_EXAMPLE = `{
  "type": "success",
  "data": {
    "imageUrl": "https://cdn.princemarketing.ai/gen/img_abc123.png",
    "refinedPrompt": "Premium over-ear headphones positioned on a matte black...",
    "score": {
      "aggregate": 8.7,
      "passed": true,
      "dimensions": [
        { "dimension": "clarity", "score": 9.0, "reasoning": "..." },
        { "dimension": "composition", "score": 8.5, "reasoning": "..." },
        ...
      ],
      "feedback": "Strong product shot with excellent technical quality."
    }
  },
  "meta": {
    "generationId": "gen_abc123",
    "creditsConsumed": 5,
    "duration_ms": 3420
  }
}`;

export default function QuickstartPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-display)]">
        Quickstart
      </h1>
      <p className="text-slate-400 mt-3 text-lg">
        First API call in 4 seconds. Get an API key, send a request, receive quality-scored creative.
      </p>

      {/* Step 1 */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)] flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-forge-blue/15 text-forge-blue text-sm font-bold">1</span>
          Get your API key
        </h2>
        <p className="text-slate-400 mt-2 ml-10">
          Sign up at <code className="text-forge-blue font-[family-name:var(--font-mono)]">princemarketing.ai/register</code>.
          You will receive a key prefixed <code className="text-forge-blue font-[family-name:var(--font-mono)]">pk_live_</code> (production)
          or <code className="text-forge-blue font-[family-name:var(--font-mono)]">pk_test_</code> (sandbox). 100 free credits included.
        </p>
      </div>

      {/* Step 2 */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)] flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-forge-blue/15 text-forge-blue text-sm font-bold">2</span>
          Make your first request
        </h2>

        <div className="mt-4 ml-10 space-y-4">
          <CodeBlock code={CURL_EXAMPLE} language="bash" title="curl" />
          <CodeBlock code={JS_EXAMPLE} language="javascript" title="JavaScript" />
          <CodeBlock code={PYTHON_EXAMPLE} language="python" title="Python" />
        </div>
      </div>

      {/* Step 3 */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)] flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-forge-blue/15 text-forge-blue text-sm font-bold">3</span>
          Receive quality-scored output
        </h2>
        <p className="text-slate-400 mt-2 ml-10">
          Every response includes the generated asset and a full quality score across 12 dimensions.
          If the score is below your quality tier threshold, the system auto-regenerates.
        </p>

        <div className="mt-4 ml-10">
          <CodeBlock code={RESPONSE_EXAMPLE} language="json" title="Response" />
        </div>
      </div>

      {/* What's next */}
      <div className="mt-12 p-6 rounded-xl bg-graphite border border-white/6">
        <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-display)]">What to do next</h3>
        <ul className="mt-3 space-y-2">
          <li className="text-sm text-slate-400">
            <a href="/docs/generate/video" className="text-forge-blue hover:text-arc-light transition-colors">Generate video</a> — Seedance 2.0 Omni for cinematic 5-15s clips
          </li>
          <li className="text-sm text-slate-400">
            <a href="/docs/generate/copy" className="text-forge-blue hover:text-arc-light transition-colors">Generate copy</a> — Ad copy, social posts, email campaigns
          </li>
          <li className="text-sm text-slate-400">
            <a href="/docs/scoring" className="text-forge-blue hover:text-arc-light transition-colors">Understand scoring</a> — 12 dimensions, quality tiers, auto-regeneration
          </li>
        </ul>
      </div>
    </div>
  );
}
