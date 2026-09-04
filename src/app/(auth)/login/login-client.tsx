'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { OTP_LOGIN_OPTIONS } from '@/lib/auth-options';
import { BookOpen, Mail, Lock, ArrowRight, KeyRound, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const router = useRouter();

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const verified = params.get('verified') === '1';
  const authError = params.get('error');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        sessionStorage.setItem('littlereads_pending_email', email);
        toast.error('Please verify your email first.');
        router.push('/verify-email');
        return;
      }
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success('Welcome back!');

    const redirectTo = params.get('redirect') || '/account';
    router.push(redirectTo);
    router.refresh();
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsSendingOtp(true);
    const supabase = createClient();
    // shouldCreateUser: false — an OTP login must NEVER silently create an
    // account for an unknown email address.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: OTP_LOGIN_OPTIONS,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate') || error.status === 429) {
        toast.error('Too many requests. Please wait a minute and try again.');
      } else if (msg.includes('not found') || msg.includes('no user')) {
        toast.error('No account found for this email. Please create an account first.');
      } else {
        toast.error(error.message);
      }
      setIsSendingOtp(false);
      return;
    }
    sessionStorage.setItem('littlereads_otp_email', email);
    const redirectTo = params.get('redirect') || '';
    router.push(`/login/verify-otp${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`);
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

        {verified && (
          <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-100 px-4 py-3 mb-6">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800">
              Your email has been verified. You can now sign in.
            </p>
          </div>
        )}

        {authError === 'verification_failed' && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-6 text-sm text-red-700">
            We could not verify your email. Please try the verification link again
            or request a new one.
          </div>
        )}

        {/* Login Mode Toggle */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => setLoginMode('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMode === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Lock className="h-4 w-4 inline mr-1.5" />
            Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('otp')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMode === 'otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <KeyRound className="h-4 w-4 inline mr-1.5" />
            Email Code
          </button>
        </div>

        {/* Form */}
        <div className="card">
          {loginMode === 'password' ? (
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

              <div className="flex items-center justify-end">
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
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                <p className="text-xs text-gray-400 mt-1">
                  We&apos;ll email you a 6-digit code to sign in. No password needed.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="btn-primary w-full"
              >
                {isSendingOtp ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    Send Code
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}
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