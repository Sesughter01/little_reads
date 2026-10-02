import Link from 'next/link';
import { requireApprovedSeller } from '@/lib/seller';
import { createServiceClient } from '@/lib/supabase/server';
import { ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** /seller/sales — paid sales of this seller's books (read-only). */
export default async function SellerSalesPage() {
  const profile = await requireApprovedSeller();
  const supabase = await createServiceClient();

  let rows: { id: string; price_snapshot: number; created_at: string; title: string; buyer: string }[] = [];
  let available = true;
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select('id, price_snapshot, created_at, title_snapshot, order:orders!inner(status, customer_name)')
      .eq('seller_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    rows = ((data ?? []) as unknown as {
      id: string;
      price_snapshot: number;
      created_at: string;
      title_snapshot: string;
      order: { status?: string; customer_name?: string } | { status?: string; customer_name?: string }[];
    }[])
      .filter((i) => {
        const o = Array.isArray(i.order) ? i.order[0] : i.order;
        return o?.status === 'paid';
      })
      .map((i) => {
        const o = Array.isArray(i.order) ? i.order[0] : i.order;
        return {
          id: i.id,
          price_snapshot: i.price_snapshot,
          created_at: i.created_at,
          title: i.title_snapshot,
          buyer: o?.customer_name ?? 'Buyer',
        };
      });
  } catch {
    available = false;
  }

  const revenue = rows.reduce((s, r) => s + (r.price_snapshot ?? 0), 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Sales</h1>
      <p className="mt-1 text-sm text-gray-500">
        {available
          ? `${rows.length} paid sale${rows.length === 1 ? '' : 's'} · ${formatPrice(revenue)} revenue`
          : 'Sales tracking will appear once the marketplace sales feed is fully enabled.'}
      </p>

      {!available || rows.length === 0 ? (
        <div className="card mt-6 py-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <h2 className="font-semibold text-gray-900">No sales yet.</h2>
          <p className="mt-1 text-sm text-gray-500">
            When buyers purchase your approved books, they will appear here.
          </p>
          <Link href="/seller/books" className="btn-secondary mt-4 inline-flex">
            Manage Books
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{r.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {r.buyer} · {new Date(r.created_at).toLocaleDateString('en-NG')}
                </p>
              </div>
              <p className="shrink-0 font-bold text-gray-900">{formatPrice(r.price_snapshot)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
