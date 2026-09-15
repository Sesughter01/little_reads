import Link from 'next/link';
import { requireApprovedSeller } from '@/lib/seller';

export const dynamic = 'force-dynamic';

/**
 * /seller/books/[id]/edit — placeholder pointing at the manage page.
 * Full metadata editing (title/price/cover/PDF) is the next iteration;
 * drafts are created via Add New Book and submitted from the manage page.
 */
export default async function SellerEditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireApprovedSeller();
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-xl py-12 text-center">
      <h1 className="text-xl font-bold text-gray-900">Book editing is coming next</h1>
      <p className="mt-2 text-sm text-gray-500">
        Metadata editing for this book is not part of this foundation release.
        Manage review submission and deletion from the book page.
      </p>
      <Link href={`/seller/books/${id}`} className="btn-primary mt-6 inline-flex">
        Manage This Book
      </Link>
    </div>
  );
}
