'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

type CodeBlockProps = {
  code: string;
  language?: string;
  title?: string;
  className?: string;
};

export function CodeBlock({ code, language = 'bash', title, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <div className={`rounded-xl bg-void border border-white/6 overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-graphite border-b border-white/6">
        <div className="flex items-center gap-2">
          {/* Terminal dots */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-flare/60" />
            <span className="w-3 h-3 rounded-full bg-ember/60" />
            <span className="w-3 h-3 rounded-full bg-mint/60" />
          </div>
          {title && (
            <span className="text-xs text-slate-500 font-[family-name:var(--font-display)] ml-2">
              {title}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="text-slate-500 hover:text-white transition-colors p-1 rounded cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-slate-300 font-[family-name:var(--font-mono)] leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}
