import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: customer } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!customer) notFound();

  const [{ data: orders }, { data: purchases }, { data: reviews }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('purchases')
      .select('*, product:products(title, slug)')
      .eq('user_id', id)
      .order('purchased_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('*, product:products(title, slug)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const totalSpent = orders?.filter(o => o.status === 'paid').reduce((sum, o) => sum + (o.total || 0), 0) || 0;

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-purple mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {customer.first_name?.charAt(0) || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.first_name} {customer.last_name}</h1>
          <p className="text-gray-500">{customer.email}</p>
          {customer.phone && <p className="text-sm text-gray-400">{customer.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{orders?.length || 0}</p>
          <p className="text-sm text-gray-500">Orders</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{formatPrice(totalSpent)}</p>
          <p className="text-sm text-gray-500">Total Spent</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{purchases?.length || 0}</p>
          <p className="text-sm text-gray-500">Books Owned</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{reviews?.length || 0}</p>
          <p className="text-sm text-gray-500">Reviews</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-500">Joined {formatDate(customer.created_at)}</p>
      </div>

      {/* Orders */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Orders</h2>
        {orders && orders.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Reference</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Items</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Total</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-mono text-gray-600">{order.paystack_reference || order.id.slice(0, 8)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{order.items?.length || 0}</td>
                      <td className="px-6 py-3 text-sm font-medium">{formatPrice(order.total)}</td>
                      <td className="px-6 py-3">
                        <span className={`badge text-xs ${
                          order.status === 'paid' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{order.status}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No orders yet.</p>
        )}
      </div>

      {/* Purchases */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Library</h2>
        {purchases && purchases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchases.map((purchase) => {
              const product = purchase.product as unknown as { title: string; slug: string } | null;
              return (
                <div key={purchase.id} className="card">
                  <Link href={`/books/${product?.slug || ''}`} className="font-semibold text-gray-900 hover:text-brand-purple text-sm">
                    {product?.title || 'Unknown'}
                  </Link>
                  <p className="text-xs text-gray-400 mt-1">Purchased {formatDate(purchase.purchased_at)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No purchases yet.</p>
        )}
      </div>

      {/* Reviews */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => {
              const product = review.product as unknown as { title: string; slug: string } | null;
              return (
                <div key={review.id} className="card">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{product?.title || 'Unknown'}</span>
                    <span className={`badge text-xs ${
                      review.status === 'approved' ? 'bg-green-100 text-green-700' :
                      review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{review.status}</span>
                    <span className="text-sm text-gray-400">{review.rating}/5</span>
                  </div>
                  {review.title && <p className="text-sm font-medium text-gray-900">{review.title}</p>}
                  <p className="text-sm text-gray-600">{review.content}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
