'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useClickGuard } from '@/lib/click-guard';
import { isRateLimitError, useRateLimitCooldown } from '@/lib/rate-limit';
import { BookOpen, MailCheck, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyEmailClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const { cooldown, startCooldown } = useRateLimitCooldown();
  const submitGuard = useClickGuard();

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration of the pending email from sessionStorage (server-safe: runs only on the client after mount) */
  useEffect(() => {
    const pending = sessionStorage.getItem('littlereads_pending_email');
    if (pending) setEmail(pending);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleResend = async () => {
    if (!email) {
      toast.error('We need your email to resend the verification link.');
      return;
    }
    if (cooldown > 0) return;

    if (!submitGuard.claim()) return; // rapid repeated clicks
    setIsResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        if (isRateLimitError(error)) {
          toast.error('Too many requests. Please wait a minute and try again.');
          startCooldown();
        } else {
          toast.error('We could not resend the email. Please try again shortly.');
        }
        return;
      }

      toast.success('Verification email sent! Check your inbox.');
      startCooldown();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
      submitGuard.release();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-brand-purple" />
            <span className="text-2xl font-bold text-brand-purple font-display">
              LittleReads
            </span>
          </Link>
          <div className="w-16 h-16 mx-auto mt-8 mb-4 rounded-2xl bg-green-50 flex items-center justify-center">
            <MailCheck className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-wide">
            CHECK YOUR EMAIL
          </h1>
        </div>

        <div className="card space-y-4">
          <div className="text-center">
            <p className="text-gray-600">
              We sent a verification email to:
            </p>
            {email ? (
              <p className="font-semibold text-gray-900 mt-1">{email}</p>
            ) : (
              <p className="text-sm text-gray-400 mt-1">
                (the email address you used to register)
              </p>
            )}
          </div>

          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            Open the email and follow the verification link to activate your
            LittleReads account.
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="btn-primary w-full"
          >
            {isResending ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Resend Verification Email'}
              </>
            )}
          </button>

          <div className="space-y-2 pt-2">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-brand-purple hover:underline"
            >
              <Mail className="h-4 w-4" /> Back to Sign In
            </Link>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('littlereads_pending_email');
                router.push('/register');
              }}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-brand-purple"
            >
              Use Different Email
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}