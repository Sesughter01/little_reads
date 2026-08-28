import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/utils';
import { Eye } from 'lucide-react';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Orders</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Order</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Books</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Total</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Date</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.paystack_reference || order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{order.customer_email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                    {order.items?.length || 0} books
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge text-xs ${
                      order.status === 'paid' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl inline-flex"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!orders || orders.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
