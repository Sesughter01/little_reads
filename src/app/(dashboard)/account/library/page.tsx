import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { BookOpen, Download, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function LibraryPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  // Capture BOTH data and error: a failed query must not masquerade as an
  // empty library.
  const { data: purchases, error } = await supabase
    .from('purchases')
    .select('*, product:products(id, title, slug, cover_url, author, pdf_path)')
    .eq('user_id', profile.id)
    .order('purchased_at', { ascending: false });

  if (error) {
    console.error('Library query failed:', {
      op: 'account.library',
      code: error.code,
      message: error.message,
    });
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">My Library</h2>
        <div className="text-center py-16">
          <AlertTriangle className="h-14 w-14 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            We couldn&apos;t load your library
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Please try again in a moment. If the problem persists, contact
            support.
          </p>
          <Link href="/account" className="btn-secondary">
            Back to My Account
          </Link>
        </div>
      </div>
    );
  }

  const hasPurchases = purchases && purchases.length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">My Library</h2>

      {hasPurchases ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchases.map((purchase) => {
            const product = purchase.product as unknown as {
              id: string;
              title: string;
              slug: string;
              cover_url: string | null;
              author: string;
              pdf_path: string | null;
            } | null;

            if (!product) return null;

            return (
              <div key={purchase.id} className="card p-4">
                <div className="flex gap-4">
                  <Link href={`/books/${product.slug}`} className="shrink-0">
                    <div className="relative w-20 h-28 rounded-lg overflow-hidden bg-gray-100">
                      {product.cover_url ? (
                        <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/books/${product.slug}`}
                      className="font-semibold text-gray-900 hover:text-purple-700 transition-colors block truncate"
                    >
                      {product.title}
                    </Link>
                    <p className="text-sm text-gray-500">{product.author}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Purchased {formatDate(purchase.purchased_at)}
                    </p>
                    {product.pdf_path ? (
                      <a
                        href={`/api/ebooks/${product.id}/download`}
                        className="inline-flex items-center gap-1 mt-2 text-sm text-purple-700 font-medium hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download PDF
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 mt-2 block">PDF not available</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Your library is waiting for its first adventure
          </h3>
          <p className="text-gray-500 mb-6">
            Purchase ebooks to start building your collection.
          </p>
          <Link href="/shop" className="btn-primary">
            Explore Books
          </Link>
        </div>
      )}
    </div>
  );
}
