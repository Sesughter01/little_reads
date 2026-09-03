'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Mail, Lock, ArrowRight, KeyRound, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
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

    // Verify admin role
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

    toast.success('Welcome to Admin Panel!');
    router.push('/admin');
    router.refresh();
  };

  const handleSendOtp = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }
    toast.success('Verification code sent to your email');
    setOtpSent(true);
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Verify admin role
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

        {/* Login Mode Toggle */}
        <div className="flex rounded-xl bg-gray-200 p-1 mb-6">
          <button
            type="button"
            onClick={() => setLoginMode('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMode === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Lock className="h-4 w-4 inline mr-1.5" />
            Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('otp')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMode === 'otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <KeyRound className="h-4 w-4 inline mr-1.5" />
            Email Code
          </button>
        </div>

        {/* Form */}
        <div className="card">
          {loginMode === 'password' ? (
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
          ) : (
            <form onSubmit={otpSent ? handleVerifyOtp : (e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
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
                    disabled={otpSent}
                  />
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="label">Verification Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="input pl-10"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className="text-sm text-brand-purple hover:underline mt-2"
                  >
                    Use a different email
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    {otpSent ? 'Verify Code' : 'Send Code'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          <Link href="/login" className="text-brand-purple font-semibold hover:underline">
            ← Back to customer login
          </Link>
        </p>
      </div>
    </div>
  );
}
