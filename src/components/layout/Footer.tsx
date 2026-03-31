import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/6 bg-void">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-white font-[family-name:var(--font-display)]">
              PrinceMarketing<span className="text-forge-blue">.ai</span>
            </span>
            <p className="text-sm text-slate-500 mt-2">
              One API call. Agency-grade creative. Quality-scored before you see it.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 font-[family-name:var(--font-display)]">
              Product
            </h4>
            <ul className="space-y-2">
              <li><Link href="/docs" className="text-sm text-slate-500 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/docs/quickstart" className="text-sm text-slate-500 hover:text-white transition-colors">Quickstart</Link></li>
              <li><Link href="/#pricing" className="text-sm text-slate-500 hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Endpoints */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 font-[family-name:var(--font-display)]">
              Endpoints
            </h4>
            <ul className="space-y-2">
              <li><Link href="/docs/generate/image" className="text-sm text-slate-500 hover:text-white transition-colors">Image Generation</Link></li>
              <li><Link href="/docs/generate/video" className="text-sm text-slate-500 hover:text-white transition-colors">Video Generation</Link></li>
              <li><Link href="/docs/generate/copy" className="text-sm text-slate-500 hover:text-white transition-colors">Copy Generation</Link></li>
              <li><Link href="/docs/scoring" className="text-sm text-slate-500 hover:text-white transition-colors">Quality Scoring</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 font-[family-name:var(--font-display)]">
              Company
            </h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-slate-500">Terms of Service</span></li>
              <li><span className="text-sm text-slate-500">Privacy Policy</span></li>
              <li><span className="text-sm text-slate-500">Status</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/6 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} PrinceMarketing.ai. All rights reserved.
          </p>
          <p className="text-xs text-slate-600 font-[family-name:var(--font-mono)]">
            v1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}
