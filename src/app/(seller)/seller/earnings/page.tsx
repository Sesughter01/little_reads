import Link from 'next/link';
import { requireApprovedSeller } from '@/lib/seller';
import { Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * /seller/earnings — foundation placeholder.
 * Withdrawals/payouts are NOT implemented in this phase.
 */
export default async function SellerEarningsPage() {
  await requireApprovedSeller();
  return (
    <div className="mx-auto w-full max-w-xl py-12 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10">
        <Wallet className="h-7 w-7 text-brand-orange" />
      </span>
      <h1 className="text-xl font-bold text-gray-900">Earnings & payouts are coming soon</h1>
      <p className="mt-2 text-sm text-gray-500">
        Per-sale revenue is tracked on your Sales page. Withdrawals and payout
        scheduling will arrive in a later marketplace phase — no money movement
        is implemented here.
      </p>
      <Link href="/seller/sales" className="btn-secondary mt-6 inline-flex">
        View Sales
      </Link>
    </div>
  );
}
