'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { OTP_LOGIN_OPTIONS } from '@/lib/auth-options';
import { BookOpen, Mail, KeyRound, ArrowRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const pending = sessionStorage.getItem('littlereads_otp_email');
    if (pending) {
      setEmail(pending);
    } else {
      // No email in context — return to login to start over
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('expired')) {
          setError('This code has expired. Request a new one below.');
        } else if (msg.includes('token') || msg.includes('invalid') || msg.includes('otp')) {
          setError('That code is not correct. Check your email and try again.');
        } else {
          setError('We could not verify that code. Please try again.');
        }
        setCode('');
        return;
      }

      sessionStorage.removeItem('littlereads_otp_email');
      toast.success('Welcome back!');
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '/account';
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    try {
      const supabase = createClient();
      // shouldCreateUser: false — never silently create an account for an
      // unknown email address.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: OTP_LOGIN_OPTIONS,
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate') || error.status === 429) {
          toast.error('Too many requests. Please wait a minute and try again.');
        } else if (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('no user')) {
          toast.error('No account found for this email. Please sign up first.');
        } else {
          toast.error('We could not send the code. Please try again shortly.');
        }
        return;
      }

      toast.success('New code sent to your email!');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
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
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-wide">
            CHECK YOUR EMAIL
          </h1>
          <p className="text-gray-500 mt-2">We sent a 6-digit login code to:</p>
          <p className="font-semibold text-gray-900 mt-1">{email}</p>
        </div>

        <form onSubmit={handleVerify} className="card space-y-4">
          <div>
            <label className="label">6-Digit Code</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
                  if (pasted) {
                    e.preventDefault();
                    setCode(pasted.slice(0, 6));
                  }
                }}
                className="input pl-10 text-center tracking-[0.5em] font-mono text-lg"
                placeholder="••••••"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Enter the 6-digit code — numbers only
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="btn-primary w-full"
          >
            {isVerifying ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
            ) : (
              <>
                Verify Code
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="flex items-center justify-center gap-2 w-full text-sm text-brand-purple hover:underline"
          >
            <RefreshCw className="h-4 w-4" />
            {isResending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : 'Resend Code'}
          </button>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('littlereads_otp_email');
                router.push('/login');
              }}
              className="block w-full text-center text-sm text-gray-500 hover:text-brand-purple"
            >
              Use Different Email
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-gray-500 hover:text-brand-purple"
            >
              Sign in with Password
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}