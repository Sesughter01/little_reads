import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/utils';
import { ShoppingBag, Eye } from 'lucide-react';

export default async function OrdersPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Order History</h2>

      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">
                    Order #{order.paystack_reference || order.id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(order.created_at)} • {order.items?.length || 0} {order.items?.length === 1 ? 'book' : 'books'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`badge ${
                    order.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {order.status}
                  </span>
                  <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-500 mb-6">Start shopping to see your orders here.</p>
          <Link href="/shop" className="btn-primary">Browse Books</Link>
        </div>
      )}
    </div>
  );
}
