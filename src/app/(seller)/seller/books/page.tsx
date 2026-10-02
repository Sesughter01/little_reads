import Link from 'next/link';
import { requireApprovedSeller } from '@/lib/seller';
import { createServiceClient } from '@/lib/supabase/server';
import { BookOpen, PlusCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** /seller/books — the approved seller's own catalog. */
export default async function SellerBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireApprovedSeller();
  const { status } = await searchParams;
  const supabase = await createServiceClient();

  const allowed = ['draft', 'submitted', 'published', 'rejected', 'archived'];
  let query = supabase
    .from('products')
    .select('id, title, slug, price, sale_price, workflow_status, published, updated_at')
    .eq('seller_id', profile.user_id)
    .order('updated_at', { ascending: false });
  if (status && allowed.includes(status)) query = query.eq('workflow_status', status);

  const { data } = await query;
  const books = data ?? [];

  const tabs = [{ v: 'all', l: 'All' }, ...allowed.map((v) => ({ v, l: v[0]!.toUpperCase() + v.slice(1) }))];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Books</h1>
          <p className="text-sm text-gray-500">{books.length} book{books.length === 1 ? '' : 's'}</p>
        </div>
        <Link href="/seller/books/new" className="btn-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Book
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = (status ?? 'all') === t.v;
          return (
            <Link
              key={t.v}
              href={t.v === 'all' ? '/seller/books' : `/seller/books?status=${t.v}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.l}
            </Link>
          );
        })}
      </div>

      {books.length === 0 ? (
        <div className="card py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <h2 className="font-semibold text-gray-900">No books yet.</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add your first book to start selling on LittleReads.
          </p>
          <Link href="/seller/books/new" className="btn-primary mt-4 inline-flex">
            Add New Book
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {books.map((b) => (
            <li key={b.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{b.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {formatPrice(b.sale_price && b.sale_price > 0 ? b.sale_price : b.price)}
                  {' · '}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {b.workflow_status}
                  </span>
                </p>
              </div>
              <Link
                href={`/seller/books/${b.id}`}
                className="shrink-0 text-sm font-semibold text-brand-orange hover:underline"
              >
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
