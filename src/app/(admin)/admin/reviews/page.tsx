import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { ReviewActions } from './review-actions';

const FILTERS = ['all', 'pending', 'approved', 'hidden'] as const;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createServiceClient();

  let query = supabase
    .from('reviews')
    .select('*, user:profiles(first_name, last_name, email), product:products(title, slug)')
    .order('created_at', { ascending: false });

  const activeFilter = ['pending', 'approved', 'hidden'].includes(status || '')
    ? (status as 'pending' | 'approved' | 'hidden')
    : 'all';
  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter);
  }

  const { data: reviews } = await query;

  const statusBadge: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    hidden: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? '/admin/reviews' : `/admin/reviews?status=${f}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
              activeFilter === f
                ? 'bg-brand-purple text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Review</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Product</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Moderate</th>
              </tr>
            </thead>
            <tbody>
              {reviews?.map((review) => {
                const user = review.user as unknown as { first_name: string; last_name: string; email: string } | null;
                const product = review.product as unknown as { title: string; slug: string } | null;
                return (
                  <tr key={review.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                        ))}
                        {review.verified_purchase && (
                          <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full ml-1">Verified</span>
                        )}
                      </div>
                      {review.title && <p className="text-sm font-medium text-gray-900">{review.title}</p>}
                      <p className="text-xs text-gray-500 line-clamp-2">{review.content}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                      {user?.first_name} {user?.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{product?.title}</td>
                    <td className="px-6 py-4">
                      <span className={`badge text-xs ${statusBadge[review.status] || 'bg-gray-100 text-gray-700'}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(review.created_at).toLocaleDateString('en-NG')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ReviewActions reviewId={review.id} status={review.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!reviews || reviews.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500">No {activeFilter !== 'all' ? activeFilter + ' ' : ''}reviews yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}