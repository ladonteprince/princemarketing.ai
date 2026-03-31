import { CodeBlock } from '@/components/docs/CodeBlock';
import { EndpointCard, ParamRow } from '@/components/docs/EndpointCard';

const REQUEST_EXAMPLE = `curl -X POST https://api.princemarketing.ai/v1/generate/video \\
  -H "Authorization: Bearer pk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Cinematic drone shot of a modern glass building at golden hour",
    "duration": "5",
    "aspectRatio": "16:9",
    "qualityTier": "pro"
  }'`;

const REFERENCE_EXAMPLE = `{
  "prompt": "A woman in a red dress walking through a neon-lit Tokyo street @image1",
  "duration": "10",
  "aspectRatio": "9:16",
  "referenceImages": [
    "https://your-cdn.com/character-reference.jpg"
  ],
  "qualityTier": "agency"
}`;

export default function VideoDocsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-display)]">
        Generate Video
      </h1>
      <p className="text-slate-400 mt-3 text-lg">
        Powered by Seedance 2.0 Omni via MuAPI. Generate 5-15 second cinematic video clips with
        character reference support. All outputs include the negative prompt
        &quot;NO TEXT, NO SUBTITLES, NO CAPTIONS&quot; automatically.
      </p>

      <div className="mt-8">
        <CodeBlock code={REQUEST_EXAMPLE} language="bash" title="Request" />
      </div>

      <div className="mt-8">
        <EndpointCard method="POST" path="/v1/generate/video" description="Generate a quality-scored video from a text prompt using Seedance 2.0 Omni.">
          <div className="space-y-0">
            <ParamRow name="prompt" type="string" required description="Video generation prompt. Describe subject, action, camera movement, lighting, and mood." />
            <ParamRow name="negativePrompt" type="string" description="Elements to avoid. 'NO TEXT, NO SUBTITLES, NO CAPTIONS' is always prepended." />
            <ParamRow name="duration" type="string" description="Video duration in seconds. One of: 5, 10, 15." defaultValue="5" />
            <ParamRow name="aspectRatio" type="string" description="Output aspect ratio. One of: 16:9, 9:16, 1:1." defaultValue="16:9" />
            <ParamRow name="referenceImages" type="string[]" description="Up to 9 reference image URLs for character consistency. Tag with @image1-9 in prompt." />
            <ParamRow name="qualityTier" type="string" description="Minimum quality threshold." defaultValue="pro" />
          </div>
        </EndpointCard>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)] mb-4">Character references</h2>
        <p className="text-slate-400 mb-4">
          Pass up to 9 reference images and tag them in your prompt with @image1 through @image9
          for character consistency across generations.
        </p>
        <CodeBlock code={REFERENCE_EXAMPLE} language="json" title="With character reference" />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {[
          { duration: '5s', credits: 15, cost: '$1.50' },
          { duration: '10s', credits: 30, cost: '$3.00' },
          { duration: '15s', credits: 45, cost: '$4.50' },
        ].map((tier) => (
          <div key={tier.duration} className="p-4 rounded-lg bg-graphite border border-white/6 text-center">
            <p className="text-2xl font-bold text-white font-[family-name:var(--font-mono)]">{tier.credits}</p>
            <p className="text-xs text-slate-500 mt-1">credits / {tier.duration}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-ember/5 border border-ember/20">
        <p className="text-sm text-slate-400">
          <span className="text-ember font-semibold">Note:</span> Video generation is asynchronous.
          The API polls Seedance until the video is ready (typically 30-120 seconds).
          For production use, consider implementing webhooks to avoid long-running requests.
        </p>
      </div>
    </div>
  );
}
