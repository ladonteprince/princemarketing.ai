'use client';

import { useState } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Copy, Trash2, Check } from 'lucide-react';

type ApiKeyDisplay = {
  id: string;
  name: string;
  environment: 'live' | 'test';
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

const DEMO_KEYS: ReadonlyArray<ApiKeyDisplay> = [
  {
    id: 'key_abc12345',
    name: 'Production',
    environment: 'live',
    prefix: 'pk_live_a8Kx',
    lastUsedAt: '2026-03-30T15:30:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'key_def67890',
    name: 'Development',
    environment: 'test',
    prefix: 'pk_test_9mWz',
    lastUsedAt: '2026-03-30T12:00:00Z',
    createdAt: '2026-03-15T08:00:00Z',
  },
];

export default function KeysPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(prefix: string, id: string) {
    navigator.clipboard.writeText(prefix + '...');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-display)]">API Keys</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Create and manage your API keys.</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} className="w-full sm:w-auto">
          Create key
        </Button>
      </div>

      <Card>
        <div className="-mx-6 -mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Name</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Key</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Environment</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Last used</th>
                <th className="text-right text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_KEYS.map((key) => (
                <tr key={key.id} className="border-b border-white/4">
                  <td className="px-4 sm:px-6 py-4">
                    <span className="text-sm text-white font-medium">{key.name}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <code className="text-sm text-slate-400 font-[family-name:var(--font-mono)]">
                      {key.prefix}...
                    </code>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <Badge variant={key.environment === 'live' ? 'mint' : 'ember'}>
                      {key.environment}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="text-sm text-slate-400">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopy(key.prefix, key.id)}
                        className="p-2 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Copy key prefix"
                      >
                        {copiedId === key.id ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        className="p-2 rounded text-slate-500 hover:text-flare hover:bg-flare/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 p-4 rounded-lg bg-ember/5 border border-ember/20">
        <p className="text-sm text-slate-400">
          <span className="text-ember font-semibold">Important:</span> Full API keys are shown only at creation time.
          Store them securely. Revoked keys are rejected immediately with no grace period.
        </p>
      </div>
    </div>
  );
}
