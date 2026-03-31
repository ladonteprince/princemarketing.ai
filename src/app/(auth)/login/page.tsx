'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Login failed. Please try again.');
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
            Log in to PrinceMarketing<span className="text-forge-blue">.ai</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">Access your API dashboard.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-graphite rounded-xl border border-white/6 p-6 space-y-4">
            {error && (
              <div className="bg-flare/10 border border-flare/20 rounded-lg px-3 py-2 text-sm text-flare">
                {error}
              </div>
            )}
            <Input label="Email" name="email" type="email" placeholder="you@company.com" required />
            <Input label="Password" name="password" type="password" placeholder="Enter your password" required />
            <Button className="w-full" size="lg" type="submit" loading={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </div>
        </form>

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
