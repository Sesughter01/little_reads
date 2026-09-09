'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useClickGuard } from '@/lib/click-guard';
import {
  BookOpen,
  Lock,
  KeyRound,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

type Screen =
  | { kind: 'checking' }
  | { kind: 'invalid' }
  | { kind: 'form' }
  | { kind: 'done' };

/**
 * Password reset landing page.
 *
 * Reached from /auth/callback after Supabase has exchanged the recovery code
 * for a short-lived recovery session. The recovery session grants exactly one
 * capability: updating the account password. It does NOT count as a normal
 * sign-in:
 *
 * - the password update happens with the recovery session,
 * - after success we sign the user out of every session (supabase.auth
 *   .signOut() revokes all refresh tokens), so a leaked recovery link can
 *   never become a persistent login,
 * - the user completes sign-in with their NEW password on /login?reset=1.
 */
export default function ResetPasswordClient() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>({ kind: 'checking' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGuard = useClickGuard();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setScreen(session ? { kind: 'form' } : { kind: 'invalid' });
    });

    return () => {
      active = false;
    };
  }, []);

  const passwordChecks = {
    length: password.length >= 8,
    match: password.length > 0 && password === confirm,
  };
  const canSubmit = passwordChecks.length && passwordChecks.match && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!passwordChecks.length) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (!passwordChecks.match) {
      setFormError('Passwords do not match.');
      return;
    }

    if (!submitGuard.claim()) return; // rapid repeated clicks
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('session') || msg.includes('auth')) {
          // Recovery session expired mid-flow — restart from forgot-password.
          setScreen({ kind: 'invalid' });
        } else {
          setFormError(error.message);
        }
        return;
      }

      // Password changed. Kill every session (including the recovery one) so
      // the new credential must be used to sign in — also confirms to the
      // user that the change took effect.
      await supabase.auth.signOut();
      setScreen({ kind: 'done' });
      router.refresh();
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
      submitGuard.release();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-brand-purple" />
            <span className="text-2xl font-bold text-brand-purple font-display">
              LittleReads
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-6">
            {screen.kind === 'done' ? 'Password Updated' : 'Choose a New Password'}
          </h1>
          <p className="text-gray-500 mt-2">
            {screen.kind === 'done'
              ? 'Your password has been changed. Sign in with the new one.'
              : screen.kind === 'invalid'
                ? 'This password reset link is invalid or has expired.'
                : 'Enter a new password for your account.'}
          </p>
        </div>

        <div className="card">
          {screen.kind === 'checking' && (
            <div className="flex justify-center py-6">
              <span className="animate-spin h-6 w-6 border-2 border-brand-purple border-t-transparent rounded-full" />
            </div>
          )}

          {screen.kind === 'invalid' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              </div>
              <p className="text-sm text-gray-600">
                For security, reset links can only be used once and expire
                after a short time.
              </p>
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="btn-primary w-full"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Request a New Reset Link
              </button>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="block w-full text-center text-sm text-gray-500 hover:text-brand-purple"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {screen.kind === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">New Password</label>
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
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 8 characters.
                </p>
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="input pl-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <ul className="space-y-1 text-xs">
                <li
                  className={
                    passwordChecks.length ? 'text-green-600' : 'text-gray-400'
                  }
                >
                  {passwordChecks.length ? '✓' : '•'} At least 8 characters
                </li>
                <li
                  className={
                    passwordChecks.match ? 'text-green-600' : 'text-gray-400'
                  }
                >
                  {passwordChecks.match ? '✓' : '•'} Both passwords match
                </li>
              </ul>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}

          {screen.kind === 'done' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Your password has been updated and all other sessions have been
                signed out.
              </p>
              <button
                type="button"
                onClick={() => router.push('/login?reset=1')}
                className="btn-primary w-full"
              >
                Sign In with New Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
