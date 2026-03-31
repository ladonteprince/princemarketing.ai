import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Image, Video, FileText, Zap } from 'lucide-react';
import type { GenerationStatus } from '@/types/generation';

const RECENT_GENERATIONS = [
  { id: 'gen_001', type: 'image', status: 'delivered' as GenerationStatus, prompt: 'Luxury watch on dark marble', score: 8.7, credits: 5, time: '2m ago' },
  { id: 'gen_002', type: 'video', status: 'passed' as GenerationStatus, prompt: 'Drone shot of modern architecture', score: 9.1, credits: 15, time: '15m ago' },
  { id: 'gen_003', type: 'copy', status: 'delivered' as GenerationStatus, prompt: 'Bold fintech launch post', score: 8.3, credits: 2, time: '1h ago' },
  { id: 'gen_004', type: 'image', status: 'scoring' as GenerationStatus, prompt: 'Minimal skincare product flat lay', score: null, credits: 5, time: '2h ago' },
  { id: 'gen_005', type: 'video', status: 'failed' as GenerationStatus, prompt: 'Underwater product reveal', score: 5.2, credits: 15, time: '3h ago' },
];

const TYPE_ICONS = {
  image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  copy: <FileText className="w-4 h-4" />,
};

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-display)]">Overview</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Your creative production dashboard.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Credits remaining', value: '847', icon: <Zap className="w-4 h-4 text-ember" /> },
          { label: 'Generations (30d)', value: '142', icon: <Image className="w-4 h-4 text-forge-blue" /> },
          { label: 'Avg. score', value: '8.4', icon: <ScoreBadge score={8.4} /> },
          { label: 'Pass rate', value: '94%', icon: null },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-[family-name:var(--font-display)]">{stat.label}</span>
              {stat.icon && typeof stat.icon === 'object' && 'props' in stat.icon && stat.icon}
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-mono)] tabular-nums">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Recent generations */}
      <Card>
        <CardTitle>Recent generations</CardTitle>
        <CardDescription>Your latest creative outputs with quality scores.</CardDescription>

        <div className="mt-4 -mx-6 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Type</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Prompt</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Score</th>
                <th className="text-right text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Credits</th>
                <th className="text-right text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_GENERATIONS.map((gen) => (
                <tr key={gen.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                  <td className="px-4 sm:px-6 py-3">
                    <Badge variant="slate">
                      <span className="flex items-center gap-1.5">
                        {TYPE_ICONS[gen.type as keyof typeof TYPE_ICONS]}
                        {gen.type}
                      </span>
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <span className="text-sm text-slate-300 truncate block max-w-[200px] sm:max-w-xs">{gen.prompt}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <StatusDot status={gen.status} showLabel />
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    {gen.score !== null ? <ScoreBadge score={gen.score} /> : <span className="text-xs text-slate-600">--</span>}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right">
                    <span className="text-sm text-slate-400 font-[family-name:var(--font-mono)] tabular-nums">{gen.credits}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right">
                    <span className="text-xs text-slate-500">{gen.time}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
