import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/pmai-icon-A.svg" alt="" className="h-10 w-10" />
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4 font-[family-name:var(--font-display)]">
            Log in to PrinceMarketing<span className="text-forge-blue">.ai</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">Access your API dashboard.</p>
        </div>

        {/* Form */}
        <div className="bg-graphite rounded-xl border border-white/6 p-6 space-y-4">
          <Input label="Email" type="email" placeholder="you@company.com" />
          <Input label="Password" type="password" placeholder="Enter your password" />
          <Button className="w-full" size="lg">Log in</Button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          No account?{' '}
          <Link href="/register" className="text-forge-blue hover:text-arc-light transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
