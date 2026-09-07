import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatPrice, getAgeRangeText } from '@/lib/utils';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { BuyNowButton } from '@/components/checkout/buy-now-button';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

async function safeGetProduct(slug: string) {
  try {
    const { getProductBySlug } = await import('@/lib/db');
    return await getProductBySlug(slug);
  } catch (e) {
    console.error('Error fetching product:', e);
    return null;
  }
}

async function safeGetReviews(productId: string) {
  try {
    const { getProductReviews } = await import('@/lib/db');
    return await getProductReviews(productId);
  } catch {
    return [];
  }
}

async function safeGetRelated(productId: string, categoryId: string, ageMin: number, ageMax: number) {
  try {
    const { getRelatedProducts } = await import('@/lib/db');
    return await getRelatedProducts(productId, categoryId, ageMin, ageMax);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await safeGetProduct(slug);
  if (!product) return { title: 'Book Not Found' };
  return {
    title: product.title,
    description: product.short_description,
    openGraph: { title: `${product.title} | LittleReads`, description: product.short_description, images: product.cover_url ? [product.cover_url] : [] },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await safeGetProduct(slug);

  if (!product) {
    notFound();
  }

  const reviews = await safeGetReviews(product.id);
  const relatedBooks = await safeGetRelated(product.id, product.category_id, product.age_min, product.age_max);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
        <Link href="/" className="hover:text-purple-700">Home</Link>            <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href="/shop" className="hover:text-purple-700">Shop</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        {product.category && <><Link href={`/shop?category=${product.category.slug}`} className="hover:text-purple-700">{product.category.name}</Link><ChevronRight className="h-3 w-3 shrink-0" /></>}
        <span className="text-gray-900">{product.title}</span>
      </nav>

      <div className="lg:grid lg:grid-cols-[400px_1fr] gap-12">
        {/* Cover */}
        <div>
          <div className="sticky top-24">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-xl bg-gray-100">
              {product.cover_url ? (
                <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-orange-100">
                  <BookOpen className="h-16 w-16 text-purple-200" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          {product.category && (
            <Link href={`/shop?category=${product.category.slug}`} className="inline-block text-sm font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full mb-4">
              {product.category.name}
            </Link>
          )}
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{product.title}</h1>
          <p className="text-gray-500 mb-4">by {product.author}</p>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-5 w-5 ${s <= Math.round(product.average_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {product.average_rating && product.average_rating > 0 ? `${product.average_rating} (${product.review_count} reviews)` : 'No reviews yet'}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.sale_price || product.price)}</span>
            {product.sale_price && <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Pages</p>
              <p className="font-semibold text-sm">{product.page_count}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Reading Time</p>
              <p className="font-semibold text-sm">{product.reading_time}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Ages</p>
              <p className="font-semibold text-sm">{getAgeRangeText(product.age_min, product.age_max)}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Level</p>
              <p className="font-semibold text-sm">{product.reading_level}</p>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">{product.short_description}</p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <AddToCartButton product={product} />
            <BuyNowButton product={product} />
          </div>

          <div className="prose prose-gray max-w-none mb-8">
            <h2 className="text-xl font-bold">About This Book</h2>
            <div className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</div>
          </div>

          {product.learning_outcomes && product.learning_outcomes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">What Your Child Will Learn</h2>
              <ul className="space-y-2">
                {product.learning_outcomes.sort((a, b) => a.sort_order - b.sort_order).map((outcome) => (
                  <li key={outcome.id} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-gray-600">{outcome.outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.keywords && product.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.keywords.map((kw) => (
                <Link key={kw.id} href={`/shop?search=${encodeURIComponent(kw.keyword)}`} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-purple-100 hover:text-purple-700 transition-colors">
                  {kw.keyword}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 pt-12 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Reviews ({reviews.length})</h2>
        {reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{review.user?.first_name} {review.user?.last_name?.charAt(0)}.</span>
                      {review.verified_purchase && <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"><CheckCircle2 className="h-3 w-3" /> Verified Purchase</span>}
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-4 w-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />)}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">{new Date(review.created_at).toLocaleDateString('en-NG')}</span>
                </div>
                {review.title && <h3 className="font-semibold text-gray-900 mb-1">{review.title}</h3>}
                <p className="text-gray-600">{review.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-gray-500">No reviews yet. Be the first to review this book!</p>
          </div>
        )}
      </section>

      {/* Related */}
      {relatedBooks.length > 0 && (
        <section className="mt-16 pt-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {relatedBooks.map((book) => (
              <div key={book.id} className="rounded-2xl bg-white p-0 shadow-sm hover:shadow-md overflow-hidden">
                <Link href={`/books/${book.slug}`} className="block">
                  <div className="relative aspect-[2/3] bg-gray-100">
                    {book.cover_url ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-8 w-8 text-gray-300" /></div>}
                  </div>
                </Link>
                <div className="p-3">
                  <Link href={`/books/${book.slug}`}><h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-purple-700">{book.title}</h3></Link>
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatPrice(book.sale_price || book.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
