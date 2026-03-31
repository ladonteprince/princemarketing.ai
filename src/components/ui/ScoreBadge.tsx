type ScoreBadgeProps = {
  score: number;
  className?: string;
};

// Score color thresholds:
// 8.5+ = mint (agency), 8.0+ = arc-light (pro), 7.0+ = ember (starter), <7.0 = flare (fail)
function getScoreColor(score: number): string {
  if (score >= 8.5) return 'text-mint bg-mint/15';
  if (score >= 8.0) return 'text-arc-light bg-arc-light/15';
  if (score >= 7.0) return 'text-ember bg-ember/15';
  return 'text-flare bg-flare/15';
}

export function ScoreBadge({ score, className = '' }: ScoreBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold
        font-[family-name:var(--font-display)] tabular-nums
        ${getScoreColor(score)}
        ${className}
      `}
    >
      {score.toFixed(1)}
    </span>
  );
}
