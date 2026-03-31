import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Image, Video, FileText } from 'lucide-react';
import type { GenerationStatus } from '@/types/generation';

const GENERATIONS = [
  { id: 'gen_001', type: 'image', status: 'delivered' as GenerationStatus, prompt: 'Luxury watch on dark marble', score: 8.7, credits: 5, date: '2026-03-30' },
  { id: 'gen_002', type: 'video', status: 'passed' as GenerationStatus, prompt: 'Drone shot of modern architecture at golden hour', score: 9.1, credits: 15, date: '2026-03-30' },
  { id: 'gen_003', type: 'copy', status: 'delivered' as GenerationStatus, prompt: 'Bold fintech launch announcement for social media', score: 8.3, credits: 2, date: '2026-03-29' },
  { id: 'gen_004', type: 'image', status: 'scoring' as GenerationStatus, prompt: 'Minimal skincare product flat lay on linen', score: null, credits: 5, date: '2026-03-29' },
  { id: 'gen_005', type: 'video', status: 'failed' as GenerationStatus, prompt: 'Underwater product reveal with bubbles', score: 5.2, credits: 15, date: '2026-03-28' },
  { id: 'gen_006', type: 'copy', status: 'delivered' as GenerationStatus, prompt: 'Email campaign for SaaS onboarding sequence', score: 8.8, credits: 2, date: '2026-03-28' },
  { id: 'gen_007', type: 'image', status: 'delivered' as GenerationStatus, prompt: 'Hero banner for e-commerce storefront', score: 8.1, credits: 5, date: '2026-03-27' },
  { id: 'gen_008', type: 'video', status: 'delivered' as GenerationStatus, prompt: 'Cinematic coffee pour in slow motion', score: 9.3, credits: 30, date: '2026-03-27' },
];

const TYPE_ICONS = {
  image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  copy: <FileText className="w-4 h-4" />,
};

export default function GenerationsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-display)]">Generation History</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">All your creative generations with quality scores and status.</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {['All', 'Image', 'Video', 'Copy'].map((filter) => (
          <button
            key={filter}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[36px]
              ${filter === 'All'
                ? 'bg-forge-blue/10 text-forge-blue border border-forge-blue/30'
                : 'bg-graphite text-slate-400 border border-white/6 hover:border-white/12'
              }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <Card>
        <div className="-mx-6 -mt-6 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">ID</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Type</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Prompt</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Score</th>
                <th className="text-right text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Credits</th>
                <th className="text-right text-xs text-slate-500 font-[family-name:var(--font-display)] px-4 sm:px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {GENERATIONS.map((gen) => (
                <tr key={gen.id} className="border-b border-white/4 hover:bg-white/2 transition-colors cursor-pointer">
                  <td className="px-4 sm:px-6 py-3">
                    <code className="text-xs text-slate-500 font-[family-name:var(--font-mono)]">{gen.id}</code>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <Badge variant="slate">
                      <span className="flex items-center gap-1.5">
                        {TYPE_ICONS[gen.type as keyof typeof TYPE_ICONS]}
                        {gen.type}
                      </span>
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <span className="text-sm text-slate-300 truncate block max-w-[180px] sm:max-w-sm">{gen.prompt}</span>
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
                    <span className="text-xs text-slate-500">{gen.date}</span>
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
