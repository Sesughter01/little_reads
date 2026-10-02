'use client';

import { useEffect, useState } from 'react';
import { fetchSellerAccessState } from '@/lib/seller-entry';
import { sellerEntryHref, type SellerAccessState } from '@/lib/seller-routing';

/**
 * CTA labels per seller access state.
 * anonymous + no-profile both read as the signup invitation; approved sellers
 * get a dashboard shortcut instead of an upsell.
 */
const CTA_LABELS: Record<SellerAccessState, string> = {
  anonymous: 'Become an Author',
  'no-profile': 'Become an Author',
  pending: 'Author Application',
  rejected: 'Author Account',
  suspended: 'Author Account',
  approved: 'Author Dashboard',
};

/**
 * Memoized seller access state + destination + label for the entry-point
 * CTAs ("Become an Author" navbar link, drawer link, announcement bar).
 * One shared /api/seller/access request per page load.
 */
export function useSellerEntry(): {
  state: SellerAccessState;
  href: string;
  label: string;
  /**
   * false until the server's reply arrives. Consumers that need to tell a
   * CONFIRMED anonymous visitor from "still loading" (e.g. the onboarding
   * sign-in notice) must wait for this — the initial state is a placeholder.
   */
  ready: boolean;
} {
  const [state, setState] = useState<SellerAccessState>('anonymous');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSellerAccessState()
      .then((s) => {
        if (active) setState(s);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { state, href: sellerEntryHref(state), label: CTA_LABELS[state], ready };
}
