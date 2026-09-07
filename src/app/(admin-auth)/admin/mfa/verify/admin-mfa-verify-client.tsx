'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, KeyRound, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

type MfaStatus = {
  mfaEnabled: boolean;
  currentLevel: 'aal1' | 'aal2';
  needsEnrollment: boolean;
  needsVerification: boolean;
  factors: { id: string; status: string; createdAt: string }[];
};

export default function AdminMfaVerifyClient() {
  const router = useRouter();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = () => {
    fetch('/api/admin/mfa/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          router.replace('/admin/login');
          return;
        }
        setStatus(data);
        if (!data.mfaEnabled) {
          router.replace('/admin');
        } else if (data.needsEnrollment) {
          router.replace('/admin/mfa/setup');
        } else if (data.currentLevel === 'aal2') {
          router.replace('/admin');
        }
      })
      .catch(() => router.replace('/admin/login'));
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status || status.factors.length === 0) return;
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const factorId = status.factors[0].id;
      const res = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        setCode('');
        return;
      }
      toast.success('Identity verified. Welcome to the admin panel!');
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Verification failed. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Verification</h1>
          <p className="text-gray-500 mt-2">
            Enter the 6-digit code from your authenticator app
          </p>
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
                className="input pl-10 text-center tracking-[0.5em] font-mono text-lg"
                placeholder="••••••"
                autoFocus
              />
            </div>
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
              'Verify Code'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setCode('');
              setError(null);
              refreshStatus();
            }}
            className="flex items-center justify-center gap-2 w-full text-sm text-brand-purple hover:underline"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>

          <Link
            href="/admin/login"
            className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-brand-purple"
          >
            <Mail className="h-3.5 w-3.5" /> Back to Admin Login
          </Link>
        </form>
      </div>
    </div>
  );
}