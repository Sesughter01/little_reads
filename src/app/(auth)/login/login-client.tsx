'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success('Welcome back!');
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get('redirect') || '/account';
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-brand-purple" />
            <span className="text-2xl font-bold text-brand-purple font-display">
              LittleReads
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-6">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-brand-purple hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-purple font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
