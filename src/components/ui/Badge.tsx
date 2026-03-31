import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'forge' | 'arc' | 'ember' | 'mint' | 'flare' | 'slate';

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-slate-300',
  forge: 'bg-forge-blue/15 text-forge-blue',
  arc: 'bg-arc-light/15 text-arc-light',
  ember: 'bg-ember/15 text-ember',
  mint: 'bg-mint/15 text-mint',
  flare: 'bg-flare/15 text-flare',
  slate: 'bg-slate-surface text-slate-400',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
        font-[family-name:var(--font-display)]
        ${VARIANT_STYLES[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
