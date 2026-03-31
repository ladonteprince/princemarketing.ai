import { CodeBlock } from '@/components/docs/CodeBlock';
import { EndpointCard, ParamRow } from '@/components/docs/EndpointCard';

const REQUEST_EXAMPLE = `curl -X POST https://api.princemarketing.ai/v1/generate/copy \\
  -H "Authorization: Bearer pk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a bold launch announcement for a fintech app",
    "copyType": "social",
    "tone": "bold",
    "maxLength": 280,
    "qualityTier": "pro"
  }'`;

const RESPONSE_EXAMPLE = `{
  "type": "success",
  "data": {
    "content": "Your money just got smarter. Introducing FinPay...",
    "refinedPrompt": "Write a social media launch announcement...",
    "score": {
      "aggregate": 8.3,
      "passed": true,
      "dimensions": [...],
      "feedback": "Strong hook with clear value proposition."
    }
  },
  "meta": {
    "generationId": "gen_xyz789",
    "creditsConsumed": 2,
    "duration_ms": 1850
  }
}`;

export default function CopyDocsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-display)]">
        Generate Copy
      </h1>
      <p className="text-slate-400 mt-3 text-base sm:text-lg">
        Generate marketing copy powered by Claude. Ad copy, social posts, emails, headlines,
        landing pages, and product descriptions. Every output is quality-scored.
      </p>

      <div className="mt-8">
        <CodeBlock code={REQUEST_EXAMPLE} language="bash" title="Request" />
      </div>

      <div className="mt-8">
        <EndpointCard method="POST" path="/v1/generate/copy" description="Generate quality-scored marketing copy.">
          <div className="space-y-0">
            <ParamRow name="prompt" type="string" required description="What to write. Include context about the product, audience, and goal." />
            <ParamRow name="copyType" type="string" required description="One of: ad, social, email, headline, landing, product." />
            <ParamRow name="tone" type="string" description="Voice tone. One of: professional, casual, bold, empathetic, technical." defaultValue="professional" />
            <ParamRow name="maxLength" type="number" description="Maximum output length in characters." defaultValue="500" />
            <ParamRow name="brand" type="string" description="Brand context for alignment scoring." />
            <ParamRow name="qualityTier" type="string" description="Minimum quality threshold." defaultValue="pro" />
          </div>
        </EndpointCard>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)] mb-4">Response</h2>
        <CodeBlock code={RESPONSE_EXAMPLE} language="json" title="200 OK" />
      </div>

      <div className="mt-8 p-4 rounded-lg bg-forge-blue/5 border border-forge-blue/20">
        <p className="text-sm text-slate-400">
          <span className="text-forge-blue font-semibold">2 credits</span> per copy generation.
          The fastest and most cost-effective endpoint.
        </p>
      </div>
    </div>
  );
}
