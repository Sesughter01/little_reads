'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, KeyRound, ArrowRight, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

type MfaStatus = {
  mfaEnabled: boolean;
  currentLevel: 'aal1' | 'aal2';
  needsEnrollment: boolean;
  needsVerification: boolean;
  factors: { id: string; status: string; createdAt: string }[];
};

export default function AdminMfaSetupClient() {
  const router = useRouter();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetch('/api/admin/mfa/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          router.replace('/admin/login');
          return;
        }
        setStatus(data);
        if (data.mfaEnabled && !data.needsEnrollment) {
          router.replace('/admin/mfa/verify');
        } else if (!data.mfaEnabled) {
          router.replace('/admin');
        }
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const res = await fetch('/api/admin/mfa/enroll', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to enable MFA');
        return;
      }
      setFactorId(data.factorId);
      setQrCode(data.totp.qrCode);
      setSecret(data.totp.secret);
    } catch {
      toast.error('Failed to enable MFA. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        return;
      }
      toast.success('Two-factor authentication enabled!');
      router.push('/admin');
      router.refresh();
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!status) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-brand-purple" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Two-Factor Authentication</h1>
          <p className="text-gray-500 mt-2">
            Protect your LittleReads admin account with a one-time passcode
          </p>
        </div>

        {!factorId ? (
          <div className="card space-y-4">
            <div className="flex items-start gap-3">
              <KeyRound className="h-5 w-5 text-brand-purple mt-0.5 shrink-0" />
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  Two-factor authentication adds a second step to your admin login.
                  After your password, you&apos;ll enter a 6-digit code from an
                  authenticator app.
                </p>
                <p className="text-xs text-gray-400">
                  You can use Google Authenticator, Authy, 1Password, or any
                  compatible TOTP app.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnroll}
              disabled={isEnrolling}
              className="btn-primary w-full"
            >
              {isEnrolling ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
              ) : (
                <>
                  Enable Two-Factor Authentication
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
            <Link
              href="/admin"
              className="block text-center text-sm text-gray-500 hover:text-brand-purple"
            >
              Skip for now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="card space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              {qrCode && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCode}
                  alt="Scan this QR code with your authenticator app"
                  className="mx-auto w-48 h-48 rounded-lg"
                />
              )}
              {secret && (
                <p className="text-xs text-gray-500 mt-3">
                  Or enter this code manually:{' '}
                  <span className="font-mono font-semibold text-gray-800">{secret}</span>
                </p>
              )}
            </div>
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
                  className="input pl-10 text-center tracking-[0.5em] font-mono text-lg"
                  placeholder="••••••"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
            <button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="btn-primary w-full"
            >
              {isVerifying ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
              ) : (
                'Verify and Enable'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setFactorId(null);
                setQrCode(null);
                setSecret(null);
                setCode('');
              }}
              className="block w-full text-center text-sm text-gray-500 hover:text-brand-purple"
            >
              Restart setup
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          <Link href="/admin/login" className="inline-flex items-center gap-1.5 hover:text-brand-purple">
            <Mail className="h-3.5 w-3.5" /> Back to Admin Login
          </Link>
        </p>
      </div>
    </div>
  );
}