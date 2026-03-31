'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { registerAction } from './actions';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      await registerAction(formData);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
            Create your account
          </h1>
          <p className="text-sm text-slate-400 mt-2">100 free credits. No credit card required.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-graphite rounded-xl border border-white/6 p-6 space-y-4">
            {error && (
              <div className="bg-flare/10 border border-flare/20 rounded-lg px-3 py-2 text-sm text-flare">
                {error}
              </div>
            )}
            <Input label="Full name" name="name" type="text" placeholder="Jane Developer" />
            <Input label="Email" name="email" type="email" placeholder="you@company.com" required />
            <Input label="Password" name="password" type="password" placeholder="Min. 8 characters" required minLength={8} />
            <Button className="w-full" size="lg" type="submit" loading={loading}>
              {loading ? 'Creating account...' : 'Get API key'}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-forge-blue hover:text-arc-light transition-colors">
            Log in
          </Link>
        </p>

        <p className="text-center text-xs text-slate-600 mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
