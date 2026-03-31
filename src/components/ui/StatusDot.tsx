import type { GenerationStatus } from '@/types/generation';

type StatusDotProps = {
  status: GenerationStatus;
  className?: string;
  showLabel?: boolean;
};

const STATUS_STYLES: Record<GenerationStatus, { color: string; label: string; pulse: boolean }> = {
  queued: { color: 'bg-slate-surface', label: 'Queued', pulse: false },
  processing: { color: 'bg-arc-light', label: 'Processing', pulse: true },
  scoring: { color: 'bg-ember', label: 'Scoring', pulse: true },
  passed: { color: 'bg-mint', label: 'Passed', pulse: false },
  failed: { color: 'bg-flare', label: 'Failed', pulse: false },
  delivered: { color: 'bg-forge-blue', label: 'Delivered', pulse: false },
};

export function StatusDot({ status, className = '', showLabel = false }: StatusDotProps) {
  const style = STATUS_STYLES[status];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {style.pulse && (
          <span className={`absolute inset-0 rounded-full ${style.color} opacity-60 forge-pulse`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.color}`} />
      </span>
      {showLabel && (
        <span className="text-xs text-slate-400 font-[family-name:var(--font-display)]">
          {style.label}
        </span>
      )}
    </span>
  );
}
