import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect, notFound } from 'next/navigation';

import { CheckPaymentButton } from './check-payment-button';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!order) notFound();

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-purple mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-gray-900">
          Order #{order.paystack_reference || id.slice(0, 8)}
        </h2>
        <span className={`badge ${
          order.status === 'paid' ? 'bg-green-100 text-green-700' :
          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {order.status}
        </span>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Items</h3>
        {order.items?.map((item: { id: string; title_snapshot: string; price_snapshot: number }) => (
          <div key={item.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-900">{item.title_snapshot}</span>
            <span className="text-sm font-medium">{formatPrice(item.price_snapshot)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-4 mt-2 border-t border-gray-200">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="card mt-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd>{formatDate(order.created_at)}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="capitalize">{order.status}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Reference</dt><dd className="font-mono text-xs">{order.paystack_reference || '-'}</dd></div>
        </dl>
      </div>

      {(order.status === 'pending' || order.status === 'paid') &&
        order.paystack_reference && (
          <div className="card mt-4 border-amber-100 bg-amber-50/40">
            <p className="text-sm text-gray-600">
              Your payment can be re-verified safely against Paystack at any
              time — useful if the webhook or return page was interrupted and
              your library hasn&apos;t updated.
            </p>
            <CheckPaymentButton orderId={order.id} />
          </div>
        )}
    </div>
  );
}
