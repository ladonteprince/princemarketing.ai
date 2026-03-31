import { Card, CardTitle, CardDescription } from '@/components/ui/Card';

const USAGE_BY_ENDPOINT = [
  { endpoint: '/v1/generate/image', calls: 87, credits: 435, percentage: 41 },
  { endpoint: '/v1/generate/video', calls: 23, credits: 460, percentage: 43 },
  { endpoint: '/v1/generate/copy', calls: 28, credits: 56, percentage: 5 },
  { endpoint: '/v1/score', calls: 14, credits: 14, percentage: 1 },
];

const USAGE_BY_DAY = [
  { date: 'Mar 25', credits: 45 },
  { date: 'Mar 26', credits: 82 },
  { date: 'Mar 27', credits: 120 },
  { date: 'Mar 28', credits: 95 },
  { date: 'Mar 29', credits: 150 },
  { date: 'Mar 30', credits: 180 },
  { date: 'Mar 31', credits: 65 },
];

export default function UsagePage() {
  const maxCredits = Math.max(...USAGE_BY_DAY.map((d) => d.credits));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-display)]">Usage Analytics</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Monitor credit consumption and API usage patterns.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card>
          <p className="text-xs text-slate-500 font-[family-name:var(--font-display)]">Credits used (30d)</p>
          <p className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-mono)] mt-2 tabular-nums">965</p>
          <p className="text-xs text-slate-500 mt-1">of 3,000 (Pro plan)</p>
          <div className="mt-3 h-1.5 bg-void rounded-full overflow-hidden">
            <div className="h-full bg-forge-blue rounded-full" style={{ width: '32%' }} />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 font-[family-name:var(--font-display)]">Total API calls (30d)</p>
          <p className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-mono)] mt-2 tabular-nums">152</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 font-[family-name:var(--font-display)]">Avg credits/day</p>
          <p className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-mono)] mt-2 tabular-nums">32.2</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Usage by endpoint */}
        <Card>
          <CardTitle>By endpoint</CardTitle>
          <CardDescription>Credit consumption breakdown by API endpoint.</CardDescription>
          <div className="mt-4 space-y-4">
            {USAGE_BY_ENDPOINT.map((ep) => (
              <div key={ep.endpoint}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <code className="text-xs text-slate-400 font-[family-name:var(--font-mono)] truncate">{ep.endpoint}</code>
                  <span className="text-xs text-slate-500 font-[family-name:var(--font-mono)] tabular-nums whitespace-nowrap">{ep.credits} credits</span>
                </div>
                <div className="h-2 bg-void rounded-full overflow-hidden">
                  <div
                    className="h-full bg-forge-blue rounded-full transition-all"
                    style={{ width: `${ep.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">{ep.calls} calls</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Usage over time (bar chart) */}
        <Card>
          <CardTitle>Daily usage</CardTitle>
          <CardDescription>Credits consumed per day over the past week.</CardDescription>
          <div className="mt-4 flex items-end gap-1 sm:gap-2 h-48">
            {USAGE_BY_DAY.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-xs text-slate-500 font-[family-name:var(--font-mono)] tabular-nums">{day.credits}</span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-forge-blue/60 rounded-t hover:bg-forge-blue transition-colors"
                    style={{ height: `${(day.credits / maxCredits) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-slate-600">{day.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
