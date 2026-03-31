import { CodeBlock } from '@/components/docs/CodeBlock';
import { EndpointCard, ParamRow } from '@/components/docs/EndpointCard';

const REQUEST_EXAMPLE = `curl -X POST https://api.princemarketing.ai/v1/generate/image \\
  -H "Authorization: Bearer pk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "A minimalist product shot of wireless earbuds on white marble",
    "style": "photorealistic",
    "aspectRatio": "1:1",
    "qualityTier": "pro"
  }'`;

const RESPONSE_EXAMPLE = `{
  "type": "success",
  "data": {
    "imageUrl": "https://cdn.princemarketing.ai/gen/img_abc123.png",
    "refinedPrompt": "Wireless earbuds arranged on polished Carrara marble...",
    "score": {
      "aggregate": 8.7,
      "passed": true,
      "dimensions": [...],
      "feedback": "Strong product shot with clean composition."
    }
  },
  "meta": {
    "generationId": "gen_abc123",
    "creditsConsumed": 5,
    "duration_ms": 3420
  }
}`;

export default function ImageDocsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-display)]">
        Generate Image
      </h1>
      <p className="text-slate-400 mt-3 text-base sm:text-lg">
        Generate production-ready images from text prompts. Every image is scored across 12 quality dimensions.
      </p>

      <div className="mt-8">
        <CodeBlock code={REQUEST_EXAMPLE} language="bash" title="Request" />
      </div>

      <div className="mt-8">
        <EndpointCard method="POST" path="/v1/generate/image" description="Generate a quality-scored image from a text prompt.">
          <div className="space-y-0">
            <ParamRow name="prompt" type="string" required description="The image generation prompt. Be specific about subject, lighting, composition, and style." />
            <ParamRow name="style" type="string" description="Visual style preset." defaultValue="photorealistic" />
            <ParamRow name="aspectRatio" type="string" description="Output aspect ratio. One of: 16:9, 9:16, 1:1, 4:3, 3:4." defaultValue="1:1" />
            <ParamRow name="qualityTier" type="string" description="Minimum quality threshold. starter (7.0+), pro (8.0+), agency (8.5+)." defaultValue="pro" />
          </div>
        </EndpointCard>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)] mb-4">Response</h2>
        <CodeBlock code={RESPONSE_EXAMPLE} language="json" title="200 OK" />
      </div>

      <div className="mt-8 p-4 rounded-lg bg-forge-blue/5 border border-forge-blue/20">
        <p className="text-sm text-slate-400">
          <span className="text-forge-blue font-semibold">5 credits</span> per image generation. 
          The prompt is refined by Claude before generation for production-grade output.
        </p>
      </div>
    </div>
  );
}
