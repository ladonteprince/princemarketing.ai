import { ApiPlayground } from '@/components/playground/ApiPlayground';

export default function PlaygroundPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-display)]">API Playground</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Test endpoints live. Send real requests and see quality-scored responses.</p>
      </div>
      <ApiPlayground />
    </div>
  );
}
