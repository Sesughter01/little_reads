'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getEnvSiteOrigin } from '@/lib/site-url';
import { useClickGuard } from '@/lib/click-guard';
import { isRateLimitError, useRateLimitCooldown } from '@/lib/rate-limit';
import {
  BookOpen,
  Mail,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ForgotPasswordClientProps = {
  initialEmail?: string;
};

export default function ForgotPasswordClient({
  initialEmail = '',
}: ForgotPasswordClientProps) {
  const [email, setEmail] = useState(
    initialEmail.trim().toLowerCase()
  );

  // /auth/callback redirects here as ?error=invalid_recovery_link when the
  // recovery code is missing or fails to exchange (expired/used link).
  const isInvalidRecoveryLink =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('error') ===
      'invalid_recovery_link';

  const [isLoading, setIsLoading] =
    useState(false);

  const [sent, setSent] = useState(false);
  const submitGuard = useClickGuard();
  const { cooldown, startCooldown } = useRateLimitCooldown();

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      toast.error(
        'Please enter your email address.'
      );
      return;
    }

    if (!submitGuard.claim()) return; // rapid repeated clicks: only one flight
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Environment URL strategy: the recovery link origin is ALWAYS the
      // env-scoped NEXT_PUBLIC_SITE_URL, validated and normalized by the
      // shared helper (never window.location, no hardcoded domain).
      const siteUrl = getEnvSiteOrigin();

      if (!siteUrl) {
        throw new Error(
          'NEXT_PUBLIC_SITE_URL is not configured or invalid.'
        );
      }

      const recoveryCallbackUrl =
        `${siteUrl}/auth/callback?next=${encodeURIComponent(
          '/reset-password'
        )}`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: recoveryCallbackUrl,
          }
        );

      if (error) {
        throw error;
      }

      setEmail(normalizedEmail);
      setSent(true);
    } catch (caught) {
      console.error(
        'Password reset request failed:',
        caught
      );

      if (isRateLimitError(caught)) {
        toast.error('Too many reset requests. Please wait a minute and try again.');
        startCooldown();
      } else {
        toast.error(
          caught instanceof Error
            ? caught.message
            : 'Unable to send password reset email.'
        );
      }
    } finally {
      setIsLoading(false);
      submitGuard.release();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
          >
            <BookOpen className="h-10 w-10 text-brand-purple" />

            <span className="text-2xl font-bold text-brand-purple font-display">
              LittleReads
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mt-6">
            Reset Password
          </h1>

          <p className="text-gray-500 mt-2">
            Enter your email and we&apos;ll
            send you a reset link.
          </p>
        </div>

        {isInvalidRecoveryLink && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-6 text-sm text-amber-800">
            That password reset link is invalid or has expired. Request a new
            one below.
          </div>
        )}

        {sent ? (
          <div className="card text-center">
            <CheckCircle className="h-12 w-12 text-brand-green mx-auto mb-4" />

            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Check your email
            </h2>

            <p className="text-gray-500 mb-6">
              We&apos;ve sent a password reset
              link to{' '}
              <span className="font-medium text-gray-700">
                {email}
              </span>
            </p>

            <Link
              href="/login"
              className="btn-primary"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <div className="card">
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="email"
                  className="label"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    className="input pl-10"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || cooldown > 0}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <span
                      className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"
                      aria-hidden="true"
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight
                      className="h-4 w-4 ml-2"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>

              {cooldown > 0 && (
                <p className="text-center text-xs text-gray-500">
                  You can request another reset link in {cooldown}s.
                </p>
              )}
            </form>
          </div>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          Remember your password?{' '}
          <Link
            href="/login"
            className="text-brand-purple font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}