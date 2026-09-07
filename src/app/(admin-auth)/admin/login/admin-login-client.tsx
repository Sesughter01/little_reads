'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Mail, Lock, ArrowRight, Shield, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

type MfaStatus = {
  mfaEnabled: boolean;
  currentLevel: 'aal1' | 'aal2';
  needsEnrollment: boolean;
  needsVerification: boolean;
  factors: { id: string; status: string; createdAt: string }[];
};

export default function AdminLoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Verify admin role server-verified via profile (never trust client-supplied role)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Authentication failed');
      setIsLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      toast.error('Access denied. Admin privileges required.');
      setIsLoading(false);
      return;
    }

    // Route through TOTP MFA when the project has it enabled
    try {
      const res = await fetch('/api/admin/mfa/status');
      const mfa: MfaStatus | null = res.ok ? await res.json() : null;

      if (mfa?.mfaEnabled) {
        if (mfa.needsEnrollment) {
          router.push('/admin/mfa/setup');
          router.refresh();
          return;
        }
        if (mfa.needsVerification || mfa.currentLevel !== 'aal2') {
          router.push('/admin/mfa/verify');
          router.refresh();
          return;
        }
      }
    } catch {
      // If MFA status cannot be determined, proceed without it (guarded server-side).
    }

    toast.success('Welcome to Admin Panel!');
    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-brand-purple" />
            <span className="text-2xl font-bold text-brand-purple font-display">
              LittleReads
            </span>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-6">
            <Shield className="h-6 w-6 text-brand-purple" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          </div>
          <p className="text-gray-500 mt-2">Admin access only</p>
        </div>

        {/* Form */}
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
                  placeholder="admin@littlereads.com"
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

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  Sign In as Admin
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <p className="text-xs text-gray-500">
              Protected by role verification and two-factor authentication (TOTP)
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          <Link href="/login" className="text-brand-purple hover:underline">
            Customer login
          </Link>
        </p>
      </div>
    </div>
  );
}