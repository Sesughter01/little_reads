'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useSellerEntry } from '@/components/seller/become-author';

const DISMISS_KEY = 'littlereads_author_bar_dismissed';

/**
 * Announcement bar — the "Become an Author" entry point for the storefront.
 *
 * The destination adapts to the session's seller access state (signup for
 * visitors, onboarding for new users, dashboard for approved sellers) using
 * the shared memoized /api/seller/access fetch. Dismissal persists in
 * localStorage. Rendered by StoreShell above the header on all public chrome.
 */
export function AnnouncementBar() {
  const { href, label } = useSellerEntry();
  // Hidden until hydration confirms it was not dismissed — avoids flashing a
  // bar the user deliberately closed.
  const [dismissed, setDismissed] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration-safe read of the dismissal flag on mount */
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      // storage unavailable → keep the bar visible
      setDismissed(false);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (dismissed) return null;

  return (
    <div className="bg-brand-purple text-white">
      <div className="relative max-w-7xl mx-auto px-10 sm:px-12 lg:px-8 py-2 flex items-center justify-center">
        <p className="text-xs sm:text-sm text-center">
          Are you an author? Sell your children&apos;s books on LittleReads.{' '}
          <Link
            href={href}
            className="font-semibold underline underline-offset-2 hover:text-white/90"
          >
            {label} →
          </Link>
        </p>
        <button
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, '1');
            } catch {
              // storage unavailable — dismissal is session-only
            }
          }}
          className="absolute right-2 sm:right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
