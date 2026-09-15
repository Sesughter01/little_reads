// Client-side seller access state for navigation CTAs.
//
// Fetches the authoritative state from /api/seller/access ONCE per page load
// and memoizes the promise so the navbar, drawer and announcement bar share a
// single request. The result is a ROUTING HINT only — never authorization;
// every seller page enforces access server-side via requireApprovedSeller().

import type { SellerAccessState } from '@/lib/seller-routing';

const VALID_STATES: SellerAccessState[] = [
  'anonymous',
  'no-profile',
  'pending',
  'rejected',
  'suspended',
  'approved',
];

let cached: Promise<SellerAccessState> | null = null;

export function fetchSellerAccessState(): Promise<SellerAccessState> {
  if (!cached) {
    cached = (async () => {
      try {
        const res = await fetch('/api/seller/access');
        // 401 = anonymous; the access route returns { state } in all cases.
        if (!res.ok && res.status !== 401) return 'anonymous';
        const data = (await res.json().catch(() => null)) as { state?: string } | null;
        const state = data?.state;
        if (state && (VALID_STATES as string[]).includes(state)) {
          return state as SellerAccessState;
        }
        return 'anonymous';
      } catch {
        // Network failure → treat as anonymous; all /seller pages still
        // enforce real access server-side.
        return 'anonymous';
      }
    })();
  }
  return cached;
}
