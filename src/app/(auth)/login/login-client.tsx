'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/safe-redirect';
import {
  clearStoredAuthIntent,
  readStoredAuthIntent,
  resolvePostAuthDestination,
  storeAuthIntent,
  type AuthIntent,
} from '@/lib/auth-intent';
import { fetchSellerAccessState } from '@/lib/seller-entry';
import { useClickGuard } from '@/lib/click-guard';
import { isRateLimitError, useRateLimitCooldown } from '@/lib/rate-limit';
import AuthIntentSelector from '@/components/auth/intent-selector';
import { BookOpen, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Buyer/seller INTENT — a temporary UI hint only (never a role, never sent
  // to Supabase). It always starts as 'buy' so the server-rendered markup and
  // the first client render agree (no hydration mismatch); the effect below
  // then applies ?sell=1 (the "Become an Author" entry point) or a hint stored
  // earlier in this tab.
  const [intent, setIntent] = useState<AuthIntent>('buy');
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

  // Seed the selector from ?sell=1 or a hint stored earlier in this tab — e.g.
  // arriving here after registering with "Sell Books", or from the "Become an
  // Author" CTA. Runs after mount so the server render and the first client
  // render match (no hydration mismatch).
  useEffect(() => {
    const sellParam = new URLSearchParams(window.location.search).get('sell') === '1';
    if (sellParam || readStoredAuthIntent() === 'sell') setIntent('sell');
  }, []);

  const handleIntentChange = (next: AuthIntent) => {
    setIntent(next);
    storeAuthIntent(next);
  };

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

    // Destination after sign-in.
    //   CUSTOMER intent keeps the existing rules exactly: the middleware
    //   ?redirect=… / callback ?next=… wins, then a destination pending email
    //   verification, then /account.
    //   SELLER intent asks the SERVER for the authoritative seller state and
    //   routes accordingly — the client never decides whether the user is an
    //   approved seller, and an approved result can only come from
    //   seller_profiles under RLS. Payment-recovery paths still win.
    const intentSearch =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

    let destination: string;
    if (intent === 'sell') {
      // fresh: the storefront header has already cached 'anonymous' for this
      // not-yet-signed-in visitor — a stale read would misroute the new session.
      const sellerState = await fetchSellerAccessState({ fresh: true });
      destination = resolvePostAuthDestination({
        intent: 'sell',
        redirect: intentSearch.get('redirect') || intentSearch.get('next'),
        sellerState,
      });
      clearStoredAuthIntent();
    } else {
      destination = getPostLoginRedirect();
    }

    router.push(destination);
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

        {/* Single sign-in flow — no separate seller sign-in. Seller status is recognized server-side;
            admins are recognized server-side and never exposed as a sign-in
            type. */}
        <AuthIntentSelector
          value={intent}
          onChange={handleIntentChange}
          disabled={isLoading}
          idPrefix="login-intent"
        />

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
          <Link
            href={intent === 'sell' ? '/register?sell=1' : '/register'}
            className="text-brand-purple font-semibold hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
