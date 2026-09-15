'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { useClickGuard } from '@/lib/click-guard';
import { isRateLimitError, useRateLimitCooldown } from '@/lib/rate-limit';
import { BookOpen, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Login INTENT only — display routing hint. Never alters authorization;
  // the server-side seller profile is authoritative (see /api/seller/access).
  // Pre-selected when a seller signup survived email verification.
  const [intent, setIntent] = useState<'buyer' | 'seller'>(() => {
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem('littlereads_signup_intent') === 'seller') return 'seller';
      } catch {
        // storage unavailable
      }
    }
    return 'buyer';
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const submitGuard = useClickGuard();
  const { cooldown, startCooldown } = useRateLimitCooldown();

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const verified = params.get('verified') === '1';
  const resetDone = params.get('reset') === '1';
  const authError = params.get('error');

  // Destination after sign-in: middleware's ?redirect=... wins, then the
  // auth callback's ?next=..., then a pending registration destination
  // stored via sessionStorage (the middleware /register?redirect=/checkout
  // journey survives email verification), then /account. Never navigated raw.
  const getPostLoginRedirect = (): string => {
    const search =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const fromQuery = search.get('redirect') || search.get('next');
    if (fromQuery) {
      return safeRedirectPath(fromQuery, '/account');
    }

    // Registration with email verification stored the intended destination;
    // consume it once so a later unrelated sign-in is not redirected.
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem('littlereads_pending_redirect');
      if (pending) sessionStorage.removeItem('littlereads_pending_redirect');
    } catch {
      pending = null;
    }
    return safeRedirectPath(pending, '/account');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitGuard.claim()) return; // rapid repeated clicks: only one flight
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
        submitGuard.release();
        return;
      }
      if (isRateLimitError(error)) {
        toast.error('Too many attempts. Please wait a minute and try again.');
        startCooldown();
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
      submitGuard.release();
      return;
    }

    toast.success('Welcome back!');

    // SELLER intent: resolve the authoritative server-side seller state and
    // route accordingly (dashboard / onboarding / pending / status). The
    // intent NEVER grants access — the API derives state from the session.
    // BUYER intent (or an explicit ?redirect=…): preserve existing behavior
    // so /checkout and /checkout/success?ref=… recovery keeps working.
    const searchNow =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const explicitRedirect = searchNow.get('redirect') || searchNow.get('next');
    if (intent === 'seller' && !explicitRedirect) {
      try {
        try {
          sessionStorage.removeItem('littlereads_pending_redirect');
          sessionStorage.removeItem('littlereads_signup_intent');
        } catch {
          // storage unavailable — continue
        }
        const res = await fetch('/api/seller/access');
        if (res.ok) {
          const data = (await res.json()) as { state?: string };
          const { sellerPostLoginDestination } = await import('@/lib/seller-routing');
          router.push(
            sellerPostLoginDestination(
              (data.state ?? 'no-profile') as
                | 'anonymous'
                | 'no-profile'
                | 'pending'
                | 'rejected'
                | 'suspended'
                | 'approved'
            )
          );
          router.refresh();
          return;
        }
      } catch {
        // Access lookup failed — fall through to the normal buyer flow.
      }
    }

    router.push(getPostLoginRedirect());
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

        {resetDone && (
          <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-100 px-4 py-3 mb-6">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800">
              Your password has been updated. Sign in with your new password.
            </p>
          </div>
        )}

        {/* Intent selector — routing hint only, never authorization.
            No Admin option is exposed: admins are recognized server-side. */}
        <div className="mb-5">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Sign in as">
            <button
              type="button"
              role="radio"
              aria-checked={intent === 'buyer'}
              onClick={() => setIntent('buyer')}
              className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                intent === 'buyer'
                  ? 'border-brand-purple bg-brand-purple/5 text-gray-900'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Buyer
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={intent === 'seller'}
              onClick={() => setIntent('seller')}
              className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                intent === 'seller'
                  ? 'border-brand-orange bg-brand-orange/5 text-gray-900'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Seller
            </button>
          </div>
        </div>

        {/* Password-only sign-in (email-OTP entry point disabled for now;
            the dormant verify-otp route self-guards back to /login). */}
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
                disabled={isLoading || cooldown > 0}
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

              {cooldown > 0 && (
                <p className="text-center text-xs text-gray-500">
                  Too many attempts — try again in {cooldown}s.
                </p>
              )}
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