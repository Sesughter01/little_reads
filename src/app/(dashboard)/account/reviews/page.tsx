import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Star } from 'lucide-react';

export default async function ReviewsPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, product:products(id, title, slug, cover_url)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">My Reviews</h2>

      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => {
            const product = review.product as unknown as { title: string; slug: string } | null;
            return (
              <div key={review.id} className="card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`badge text-xs ${
                    review.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : review.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {review.status}
                  </span>
                </div>
                {review.title && (
                  <h3 className="font-semibold text-gray-900 mb-1">{review.title}</h3>
                )}
                <p className="text-gray-600 text-sm mb-2">{review.content}</p>
                {product && (
                  <p className="text-xs text-gray-400">
                    Review for: {product.title}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500">
            Purchase a book and leave a review to see it here.
          </p>
        </div>
      )}
    </div>
  );
}
