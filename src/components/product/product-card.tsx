import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, BookOpen } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import { formatPrice, getAgeRangeText, truncate } from '@/lib/utils';
import type { Product } from '@/types';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card group overflow-hidden p-0">
      {/* Cover */}
      <Link href={`/books/${product.slug}`} className="block">
        <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
          {product.cover_url ? (
            <Image
              src={product.cover_url}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-purple/10 to-brand-orange/10">
              <BookOpen className="h-10 w-10 text-purple-300" />
            </div>
          )}
          {product.sale_price && (
            <span className="absolute top-3 left-3 badge bg-red-500 text-white">
              Sale
            </span>
          )}
          {product.featured && (
            <span className="absolute top-3 right-3 badge bg-brand-orange text-white">
              Featured
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category & Age */}
        <div className="flex items-center gap-2 mb-2">
          {product.category && (
            <span className="text-xs font-medium text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">
              {product.category.name}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {getAgeRangeText(product.age_min, product.age_max)}
          </span>
        </div>

        {/* Title */}
        <Link href={`/books/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 mb-1 hover:text-brand-purple transition-colors line-clamp-2">
            {product.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {truncate(product.short_description, 80)}
        </p>

        {/* Rating */}
        {product.average_rating !== undefined && (
          <div className="mb-3">
            <StarRating
              rating={product.average_rating || 0}
              count={product.review_count || 0}
            />
          </div>
        )}

        {/* Price & Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.sale_price || product.price)}
            </span>
            {product.sale_price && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </div>
  );
}
