'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Send, Image, Video, FileText, BarChart3 } from 'lucide-react';

type Endpoint = {
  id: string;
  label: string;
  method: string;
  path: string;
  icon: typeof Image;
  defaultBody: string;
};

const ENDPOINTS: ReadonlyArray<Endpoint> = [
  {
    id: 'image',
    label: 'Generate Image',
    method: 'POST',
    path: '/v1/generate/image',
    icon: Image,
    defaultBody: JSON.stringify({
      prompt: 'A minimalist product shot of a luxury watch on dark marble',
      style: 'photorealistic',
      aspectRatio: '1:1',
      qualityTier: 'pro',
    }, null, 2),
  },
  {
    id: 'video',
    label: 'Generate Video',
    method: 'POST',
    path: '/v1/generate/video',
    icon: Video,
    defaultBody: JSON.stringify({
      prompt: 'Cinematic drone shot of modern architecture at golden hour',
      duration: '5',
      aspectRatio: '16:9',
      qualityTier: 'pro',
    }, null, 2),
  },
  {
    id: 'copy',
    label: 'Generate Copy',
    method: 'POST',
    path: '/v1/generate/copy',
    icon: FileText,
    defaultBody: JSON.stringify({
      prompt: 'Write a bold social media post for a fintech product launch',
      copyType: 'social',
      tone: 'bold',
      maxLength: 280,
      qualityTier: 'pro',
    }, null, 2),
  },
  {
    id: 'score',
    label: 'Score Asset',
    method: 'POST',
    path: '/v1/score',
    icon: BarChart3,
    defaultBody: JSON.stringify({
      type: 'copy',
      prompt: 'Social media post for fintech launch',
      resultContent: 'Your money just got smarter. Introducing FinPay — instant transfers, zero fees, built for founders who move fast.',
      qualityTier: 'pro',
    }, null, 2),
  },
];

export function ApiPlayground() {
  const [activeEndpoint, setActiveEndpoint] = useState(ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState(ENDPOINTS[0].defaultBody);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleEndpointChange(endpoint: Endpoint) {
    setActiveEndpoint(endpoint);
    setRequestBody(endpoint.defaultBody);
    setResponse(null);
  }

  async function handleSend() {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`/api${activeEndpoint.path}`, {
        method: activeEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(JSON.stringify({
        type: 'error',
        error: {
          code: 'CLIENT_ERROR',
          message: err instanceof Error ? err.message : 'Request failed',
        },
      }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Endpoint selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {ENDPOINTS.map((endpoint) => {
          const Icon = endpoint.icon;
          const isActive = activeEndpoint.id === endpoint.id;
          return (
            <button
              key={endpoint.id}
              onClick={() => handleEndpointChange(endpoint)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap
                transition-colors cursor-pointer
                ${isActive
                  ? 'bg-forge-blue/10 text-forge-blue border border-forge-blue/30'
                  : 'bg-graphite text-slate-400 border border-white/6 hover:border-white/12'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {endpoint.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-forge-blue/15 text-forge-blue text-xs font-bold font-[family-name:var(--font-mono)]">
                {activeEndpoint.method}
              </span>
              <code className="text-sm text-slate-400 font-[family-name:var(--font-mono)]">
                {activeEndpoint.path}
              </code>
            </div>
            <Button
              size="sm"
              onClick={handleSend}
              loading={loading}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </Button>
          </div>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            className="w-full h-80 rounded-xl bg-void border border-white/6 p-4 text-sm text-slate-300
              font-[family-name:var(--font-mono)] leading-relaxed resize-none
              focus:outline-none focus:ring-2 focus:ring-forge-blue/50"
            spellCheck={false}
          />
        </div>

        {/* Response panel */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-[family-name:var(--font-display)]">Response</span>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-arc-light">
                <span className="w-2 h-2 rounded-full bg-arc-light forge-pulse" />
                Processing...
              </span>
            )}
          </div>
          {response ? (
            <CodeBlock code={response} language="json" title="Response" />
          ) : (
            <div className="h-80 rounded-xl bg-void border border-white/6 flex items-center justify-center">
              <p className="text-sm text-slate-600 font-[family-name:var(--font-display)]">
                {loading ? 'Generating...' : 'Send a request to see the response'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
