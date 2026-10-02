import Link from 'next/link';
import { Clock3, ArrowRight } from 'lucide-react';

/**
 * /seller/pending — confirmation for applications awaiting admin review.
 * Public (no seller guard): the authoritative state lives server-side; this
 * page is display-only and links to the status check.
 */
export default function SellerPendingPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
        <Clock3 className="h-7 w-7 text-amber-600" />
      </span>
      <h1 className="text-2xl font-bold text-gray-900">Your seller application is under review.</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-500">
        Thanks for applying to sell on LittleReads. An admin will review your
        application and you&apos;ll be able to access the Seller dashboard once
        approved. You can keep shopping in the meantime — your buyer account
        works as normal.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/seller/status" className="btn-primary">
          Check Application Status
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        <Link href="/shop" className="btn-secondary">
          Browse Books
        </Link>
      </div>
    </div>
  );
}
