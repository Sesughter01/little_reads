import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireApprovedSeller } from '@/lib/seller';
import { createServiceClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';
import { SellerManageBook } from './manage-book';

export const dynamic = 'force-dynamic';

/** /seller/books/[id] — manage one own book (server data + client actions). */
export default async function SellerManageBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireApprovedSeller();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: book } = await supabase
    .from('products')
    .select('*, category:categories(id, name)')
    .eq('id', id)
    .eq('seller_id', profile.user_id)
    .maybeSingle();

  if (!book) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/seller/books" className="mb-4 inline-block text-sm text-gray-500 hover:text-brand-purple">
        ← Back to My Books
      </Link>
      <h1 className="truncate text-xl font-bold text-gray-900">{book.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {formatPrice(book.sale_price && book.sale_price > 0 ? book.sale_price : book.price)}
        {' · '}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {book.workflow_status}
        </span>
        {book.published && (
          <span className="ml-2 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
            Live
          </span>
        )}
      </p>
      <SellerManageBook book={book} />
    </div>
  );
}
