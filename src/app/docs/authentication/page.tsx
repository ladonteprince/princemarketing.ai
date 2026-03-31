import { CodeBlock } from '@/components/docs/CodeBlock';

export default function AuthenticationPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-display)]">
        Authentication
      </h1>
      <p className="text-slate-400 mt-3 text-lg">
        All API requests require a valid API key sent via the Authorization header.
      </p>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">Key types</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-graphite border border-white/6">
            <code className="text-sm text-mint font-[family-name:var(--font-mono)]">pk_live_...</code>
            <p className="text-sm text-slate-400 mt-2">Live keys hit real generation providers. Credits are consumed.</p>
          </div>
          <div className="p-4 rounded-lg bg-graphite border border-white/6">
            <code className="text-sm text-ember font-[family-name:var(--font-mono)]">pk_test_...</code>
            <p className="text-sm text-slate-400 mt-2">Test keys return mock data. No credits consumed.</p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">Including your API key</h2>
        <div className="mt-4">
          <CodeBlock
            code={`curl https://api.princemarketing.ai/v1/generate/image \\
  -H "Authorization: Bearer pk_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
            language="bash"
            title="Authorization header"
          />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">Key management</h2>
        <div className="mt-4 space-y-4">
          <CodeBlock
            code={`# Create a new key
curl -X POST https://api.princemarketing.ai/v1/keys \\
  -H "Authorization: Bearer pk_live_YOUR_KEY" \\
  -d '{ "name": "Production", "environment": "live" }'`}
            language="bash"
            title="Create key"
          />
          <CodeBlock
            code={`# Revoke a key
curl -X DELETE "https://api.princemarketing.ai/v1/keys?id=key_abc123" \\
  -H "Authorization: Bearer pk_live_YOUR_KEY"`}
            language="bash"
            title="Revoke key"
          />
        </div>
      </div>

      <div className="mt-10 p-6 rounded-xl bg-flare/5 border border-flare/20">
        <h3 className="text-lg font-semibold text-flare font-[family-name:var(--font-display)]">Security</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>API keys are hashed (SHA-256) before storage. We never store raw keys.</li>
          <li>Full keys are shown exactly once at creation. Copy and store securely.</li>
          <li>Revoked keys are rejected immediately.</li>
          <li>Never expose API keys in client-side code.</li>
        </ul>
      </div>
    </div>
  );
}
