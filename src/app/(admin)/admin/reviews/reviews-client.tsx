'use client';

import { useState, useEffect } from 'react';
import { Star, CheckCircle, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  status: 'pending' | 'approved' | 'hidden';
  created_at: string;
  user: { first_name: string; last_name: string; email: string } | null;
  product: { title: string; slug: string } | null;
}

export function ReviewsClient() {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all');

  useEffect(() => {
    const fetchReviews = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('reviews')
        .select('*, user:profiles(first_name, last_name, email), product:products(title, slug)')
        .order('created_at', { ascending: false });
      setReviews((data as ReviewData[]) || []);
      setIsLoading(false);
    };
    fetchReviews();
  }, []);

  const updateStatus = async (reviewId: string, status: 'approved' | 'hidden') => {
    const supabase = createClient();
    const { error } = await supabase
      .from('reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reviewId);

    if (error) {
      toast.error('Failed to update review');
      return;
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
    );
    toast.success(`Review ${status === 'approved' ? 'approved' : 'hidden'}`);
  };

  const filteredReviews = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);
  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Reviews {pendingCount > 0 && <span className="text-sm font-normal text-orange-600 ml-2">({pendingCount} pending)</span>}
        </h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all' as const, label: 'All', count: reviews.length },
          { key: 'pending' as const, label: 'Pending', count: reviews.filter((r) => r.status === 'pending').length },
          { key: 'approved' as const, label: 'Approved', count: reviews.filter((r) => r.status === 'approved').length },
          { key: 'hidden' as const, label: 'Hidden', count: reviews.filter((r) => r.status === 'hidden').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-brand-purple text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-brand-purple border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filteredReviews.map((review) => {
              const statusColor =
                review.status === 'approved' ? 'bg-green-100 text-green-700' :
                review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700';

              return (
                <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-4 w-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                          ))}
                        </div>
                        <span className={`badge text-xs ${statusColor}`}>
                          {review.status}
                        </span>
                      </div>
                      {review.title && (
                        <h3 className="font-semibold text-gray-900 mb-1">{review.title}</h3>
                      )}
                      <p className="text-sm text-gray-600 mb-2">{review.content}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>by {review.user?.first_name} {review.user?.last_name}</span>
                        <span>•</span>
                        <span>{review.user?.email}</span>
                        <span>•</span>
                        <span>for {review.product?.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {review.status !== 'approved' && (
                        <button
                          onClick={() => updateStatus(review.id, 'approved')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                      )}
                      {review.status !== 'hidden' && (
                        <button
                          onClick={() => updateStatus(review.id, 'hidden')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                          <EyeOff className="h-4 w-4" />
                          Hide
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No reviews found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
