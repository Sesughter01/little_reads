'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Store, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useSellerEntry } from '@/components/seller/become-author';

/**
 * /seller/onboarding — seller application form.
 *
 * Creates a PENDING application via POST /api/seller/onboarding. The browser
 * can never create an approved seller: status is forced server-side and the
 * DB trigger/RLS (Migration 007) backstops it.
 *
 * Anonymous visitors are told clearly that a (normal customer) account is
 * required, and are offered the sign-in / registration paths — both of which
 * return them here via ?redirect=/seller/onboarding to finish applying.
 */
export default function SellerOnboardingPage() {
  const router = useRouter();
  // `ready` distinguishes "confirmed anonymous" from "still loading", so a
  // signed-in visitor never sees the sign-in notice flash.
  const { state: sellerState, ready: sellerStateReady } = useSellerEntry();
  const needsAuth = sellerStateReady && sellerState === 'anonymous';
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (displayName.trim().length < 2) {
      toast.error('Please enter a display name (at least 2 characters).');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/seller/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          business_name: businessName.trim(),
          bio: bio.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        seller?: { status?: string };
        message?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Please sign in first.');
          router.push('/login?redirect=/seller/onboarding');
          return;
        }
        toast.error(data?.error || 'Unable to submit your application.');
        return;
      }
      toast.success(data?.message || 'Your seller application is under review.');
      router.push('/seller/pending');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10">
          <Store className="h-7 w-7 text-brand-orange" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Become a LittleReads Seller</h1>
        <p className="mt-2 text-sm text-gray-500">
          Tell us about your publishing presence. Applications are reviewed
          before selling is enabled — approval usually follows a manual review.
        </p>
      </div>

      {needsAuth && (
        <div className="mb-6 rounded-2xl border border-brand-purple/20 bg-brand-purple/5 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">
            You need a LittleReads account to apply
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Author applications are tied to a normal customer account, and
            selling is enabled only after an admin reviews and approves the
            application. Sign in or create an account and you&apos;ll come
            straight back here to finish applying.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/login?redirect=/seller/onboarding"
              className="btn-primary no-underline"
            >
              Sign in
            </Link>
            <Link
              href="/register?redirect=/seller/onboarding"
              className="btn-secondary no-underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="seller-display-name">
              Seller / display name
            </label>
            <input
              id="seller-display-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              placeholder="e.g. Ada Stories"
            />
            <p className="mt-1 text-xs text-gray-400">
              Shown to buyers on your books and storefront.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="seller-business-name">
              Business name <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="seller-business-name"
              type="text"
              maxLength={120}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="input"
              placeholder="e.g. Ada Stories Ltd"
            />
          </div>

          <div>
            <label className="label" htmlFor="seller-bio">
              About you <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="seller-bio"
              rows={4}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input resize-y"
              placeholder="What kind of children's books do you create?"
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Submit Application
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>

          <p className="flex items-start gap-2 text-xs text-gray-500">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            Submitting creates a pending application only. Selling is enabled
            after an admin approves your application — you cannot approve
            yourself.
          </p>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Prefer to shop first?{' '}
        <Link href="/shop" className="font-semibold text-brand-purple hover:underline">
          Browse books
        </Link>
      </p>
    </div>
  );
}
