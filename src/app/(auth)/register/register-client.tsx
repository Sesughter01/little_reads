'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { getEnvSiteOrigin } from '@/lib/site-url';
import { useClickGuard } from '@/lib/click-guard';
import { isRateLimitError, useRateLimitCooldown } from '@/lib/rate-limit';
import { BookOpen, Mail, Lock, User, ArrowRight, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterClient() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Signup INTENT only — display routing hint. Never written as a role;
  // seller privileges are granted exclusively by admin approval (007).
  const [intent, setIntent] = useState<'buyer' | 'seller'>('buyer');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const submitGuard = useClickGuard();
  const { cooldown, startCooldown } = useRateLimitCooldown();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitGuard.claim()) return; // rapid repeated clicks: only one flight
    setIsLoading(true);

    const supabase = createClient();

    // Environment URL strategy: the redirect origin is ALWAYS the env-scoped
    // NEXT_PUBLIC_SITE_URL, validated and normalized by the shared helper
    // (never window.location, no hardcoded domain fallback).
    const siteUrl = getEnvSiteOrigin();

    if (!siteUrl) {
      toast.error(
        'App URL is not configured. Set a valid NEXT_PUBLIC_SITE_URL for this environment.'
      );
      setIsLoading(false);
      submitGuard.release();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        // Verification link returns to our PKCE callback, which redirects to
        // /login?verified=1 after Supabase confirms the email.
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
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

    // Profile is auto-created by the handle_new_user() trigger.
    // The trigger reads first_name/last_name from raw_user_meta_data
    // which we pass via options.data above.

    // If Supabase returns a session, email verification is disabled — sign in immediately
    if (data.session) {
      toast.success('Account created! Welcome to LittleReads.');
      const params = new URLSearchParams(window.location.search);
      const redirectTo = safeRedirectPath(params.get('redirect'), '/account');
      // Seller INTENT routes to onboarding (which creates a PENDING
      // application). Intent never grants privileges — approval is
      // admin-only (Migration 007). Preserve /checkout recovery for buyers.
      if (intent === 'seller') {
        router.push('/seller/onboarding');
      } else {
        router.push(redirectTo);
      }
      router.refresh();
    } else {
      // Email verification is enabled — send the user to /verify-email so they
      // can confirm their address before signing in.
      sessionStorage.setItem('littlereads_pending_email', email);
      // Persist the signup intent through the verification → sign-in chain so
      // a seller lands on onboarding after verifying. Intent is a routing
      // hint only — it never grants seller privileges.
      try {
        if (intent === 'seller') {
          sessionStorage.setItem('littlereads_signup_intent', 'seller');
        } else {
          sessionStorage.removeItem('littlereads_signup_intent');
        }
      } catch {
        // storage unavailable — verification still works, intent defaults buyer
      }
      // Carry the intended destination (e.g. /checkout from the middleware
      // redirect) through the verification → sign-in chain so the customer
      // lands back at checkout after verifying + logging in.
      const params = new URLSearchParams(window.location.search);
      const redirectTo = safeRedirectPath(params.get('redirect'), '');
      if (redirectTo) {
        sessionStorage.setItem('littlereads_pending_redirect', redirectTo);
      }
      toast.success('Account created! Please check your email to verify your account.');
      router.push('/verify-email');
    }
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
          <h1 className="text-2xl font-bold text-gray-900 mt-6">Create Account</h1>
          <p className="text-gray-500 mt-2">Join LittleReads today</p>
        </div>

        {/* Intent selector — routing hint only, never authorization */}
        <div className="mb-5">
          <p className="label mb-2">How would you like to use LittleReads?</p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
            <button
              type="button"
              role="radio"
              aria-checked={intent === 'buyer'}
              onClick={() => setIntent('buyer')}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                intent === 'buyer'
                  ? 'border-brand-purple bg-brand-purple/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
                <BookOpen className="h-5 w-5 text-brand-purple" />
                Buy Books
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Discover and purchase children&apos;s books.
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={intent === 'seller'}
              onClick={() => setIntent('seller')}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                intent === 'seller'
                  ? 'border-brand-orange bg-brand-orange/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
                <Store className="h-5 w-5 text-brand-orange" />
                Sell Books
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Publish and sell children&apos;s books on LittleReads.
              </span>
            </button>
          </div>
          {intent === 'seller' && (
            <p className="mt-2 text-xs text-gray-500">
              After verifying your email you&apos;ll complete a short seller application.
              Applications are reviewed before selling is enabled.
            </p>
          )}
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input pl-10"
                    placeholder="First name"
                  />
                </div>
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input"
                  placeholder="Last name"
                />
              </div>
            </div>

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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
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
                  Create Account
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
          Already have an account?{' '}
          <Link href="/login" className="text-brand-purple font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
