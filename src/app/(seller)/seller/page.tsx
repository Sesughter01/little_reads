import Link from 'next/link';
import { requireApprovedSeller } from '@/lib/seller';
import { createServiceClient } from '@/lib/supabase/server';
import {
  BookOpen,
  FileText,
  Clock3,
  ShoppingBag,
  Wallet,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * /seller — approved-seller dashboard home.
 * Server-guarded by requireApprovedSeller; stats are the seller's own rows.
 */
export default async function SellerDashboardPage() {
  const profile = await requireApprovedSeller();
  const supabase = await createServiceClient();

  const { data: books } = await supabase
    .from('products')
    .select('id, title, workflow_status, published')
    .eq('seller_id', profile.user_id);

  const list = books ?? [];
  const published = list.filter((b) => b.published || b.workflow_status === 'published').length;
  const drafts = list.filter((b) => b.workflow_status === 'draft').length;
  const pendingReview = list.filter((b) => b.workflow_status === 'submitted').length;

  // Sales for this seller's books (seller_id snapshot on order items).
  // Pre-007 databases lack order_items.seller_id — tolerate gracefully.
  let totalSales = 0;
  let revenue = 0;
  let salesAvailable = true;
  try {
    const { data: soldItems, error } = await supabase
      .from('order_items')
      .select('price_snapshot, order:orders!inner(status)')
      .eq('seller_id', profile.user_id);
    if (error) throw error;
    const paid = (soldItems ?? []).filter(
      (i) => (i as { order?: { status?: string } | { status?: string }[] }).order &&
        (Array.isArray((i as { order: { status?: string }[] }).order)
          ? (i as { order: { status?: string }[] }).order[0]?.status
          : (i as { order: { status?: string } }).order.status) === 'paid'
    );
    totalSales = paid.length;
    revenue = paid.reduce((sum, i) => sum + ((i as { price_snapshot?: number }).price_snapshot ?? 0), 0);
  } catch {
    salesAvailable = false;
  }

  const cards = [
    { label: 'Published Books', value: published, icon: BookOpen, tint: 'text-brand-green bg-brand-green/10' },
    { label: 'Draft Books', value: drafts, icon: FileText, tint: 'text-gray-500 bg-gray-100' },
    { label: 'Pending Review', value: pendingReview, icon: Clock3, tint: 'text-amber-600 bg-amber-100' },
    { label: 'Total Sales', value: salesAvailable ? totalSales : '—', icon: ShoppingBag, tint: 'text-brand-purple bg-brand-purple/10' },
    { label: 'Revenue', value: salesAvailable ? formatPrice(revenue) : '—', icon: Wallet, tint: 'text-brand-orange bg-brand-orange/10' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Welcome, {profile.display_name}
          </h1>
          <p className="text-sm text-gray-500">Here&apos;s how your bookshop is doing.</p>
        </div>
        <Link href="/seller/books/new" className="btn-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Book
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card text-center">
            <span className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${c.tint}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {!salesAvailable && (
        <p className="mt-3 text-xs text-gray-400">
          Sales figures will appear once the marketplace sales tracking is fully enabled.
        </p>
      )}

      <div className="card mt-6">
        {list.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h2 className="font-semibold text-gray-900">No books yet.</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add your first book to start selling on LittleReads.
            </p>
            <Link href="/seller/books/new" className="btn-primary mt-4 inline-flex">
              Add Your First Book
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Your Books</h2>
              <Link href="/seller/books" className="text-sm font-semibold text-brand-orange hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {list.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <span className="truncate text-sm font-medium text-gray-900">{b.title}</span>
                  <span className="ml-3 shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {b.workflow_status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
