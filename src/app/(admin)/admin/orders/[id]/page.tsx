import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .single();

  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Order #{order.paystack_reference || id.slice(0, 8)}
        </h1>
        <span className={`badge ${
          order.status === 'paid' ? 'bg-green-100 text-green-700' :
          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {order.status}
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Customer</dt><dd className="font-medium">{order.customer_name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-medium">{order.customer_email}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="font-medium">{order.phone || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd className="font-medium">{formatDate(order.created_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Paystack Ref</dt><dd className="font-mono text-xs">{order.paystack_reference || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Channel</dt><dd className="font-medium">{order.payment_channel || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Paid At</dt><dd className="font-medium">{order.paid_at ? formatDate(order.paid_at) : '-'}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Items ({order.items?.length || 0})</h2>
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
      </div>
    </div>
  );
}
