import { requireApprovedSeller } from '@/lib/seller';
import { SellerShell } from './seller-shell';

export const dynamic = 'force-dynamic';

/**
 * Seller dashboard shell — SERVER component.
 *
 * requireApprovedSeller() enforces authentication + approved-seller
 * authorization HERE, server-side, before any dashboard chrome is rendered;
 * only approved sellers ever receive this shell. The interactive chrome
 * (active nav state, mobile drawer) lives in the SellerShell client
 * component, so this layout itself needs no 'use client'.
 */
export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  await requireApprovedSeller();

  return <SellerShell>{children}</SellerShell>;
}