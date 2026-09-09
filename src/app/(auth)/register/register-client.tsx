'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { getEnvSiteOrigin } from '@/lib/site-url';
import { useClickGuard } from '@/lib/click-guard';
import { isRateLimitError, useRateLimitCooldown } from '@/lib/rate-limit';
import { BookOpen, Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterClient() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      router.push(redirectTo);
      router.refresh();
    } else {
      // Email verification is enabled — send the user to /verify-email so they
      // can confirm their address before signing in.
      sessionStorage.setItem('littlereads_pending_email', email);
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
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
