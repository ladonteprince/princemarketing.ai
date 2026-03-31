import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type EndpointCardProps = {
  method: HttpMethod;
  path: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

const METHOD_VARIANTS: Record<HttpMethod, 'mint' | 'forge' | 'ember' | 'flare' | 'arc'> = {
  GET: 'mint',
  POST: 'forge',
  PUT: 'ember',
  DELETE: 'flare',
  PATCH: 'arc',
};

export function EndpointCard({ method, path, description, children, className = '' }: EndpointCardProps) {
  return (
    <div className={`rounded-xl bg-graphite border border-white/6 overflow-hidden ${className}`}>
      {/* Endpoint header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-white/6 overflow-x-auto">
        <Badge variant={METHOD_VARIANTS[method]}>
          {method}
        </Badge>
        <code className="text-xs sm:text-sm text-white font-[family-name:var(--font-mono)] whitespace-nowrap">
          {path}
        </code>
      </div>
      {/* Description and content */}
      <div className="px-3 sm:px-5 py-3 sm:py-4">
        <p className="text-sm text-slate-400 mb-4">{description}</p>
        {children}
      </div>
    </div>
  );
}

// Parameter table row
type ParamRowProps = {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  defaultValue?: string;
};

export function ParamRow({ name, type, required = false, description, defaultValue }: ParamRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-white/4 last:border-0">
      <div className="sm:w-40 shrink-0">
        <code className="text-sm text-forge-blue font-[family-name:var(--font-mono)]">{name}</code>
        {required && <span className="text-flare text-xs ml-1">*</span>}
      </div>
      <div className="flex-1">
        <span className="text-xs text-slate-500 font-[family-name:var(--font-display)]">{type}</span>
        {defaultValue && (
          <span className="text-xs text-slate-600 ml-2">default: {defaultValue}</span>
        )}
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
