'use client';

import Link from 'next/link';
import { Star, BookOpen } from 'lucide-react';
import { formatPrice, getAgeRangeText } from '@/lib/utils';
import type { Product } from '@/types';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

export function BookCard({ product }: { product: Product }) {
  const hasSale = Boolean(product.sale_price && product.sale_price < product.price);

  return (
    <div className="group h-full flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-purple/20 overflow-hidden">
      <Link href={`/books/${product.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 rounded-t-2xl" aria-label={`View ${product.title}`}>
        <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
          {product.cover_url ? (
            <img src={product.cover_url} alt={`Cover of ${product.title}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-orange-100">
              <BookOpen className="h-10 w-10 text-purple-300" aria-hidden="true" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {hasSale && (
              <span className="bg-red-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">Sale</span>
            )}
            {product.featured && (
              <span className="bg-brand-orange text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">Featured</span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-2 mb-2">
          {product.category && (
            <span className="text-xs font-medium text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">{product.category.name}</span>
          )}
          <span className="text-xs text-gray-500">{getAgeRangeText(product.age_min, product.age_max)}</span>
        </div>
        <Link href={`/books/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 mb-1 hover:text-brand-purple transition-colors line-clamp-2">{product.title}</h3>
        </Link>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.short_description}</p>
        {product.average_rating !== undefined && product.average_rating > 0 && (
          <div className="flex items-center gap-1 mb-3" aria-label={`Rated ${product.average_rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} aria-hidden="true" className={`h-4 w-4 ${s <= Math.round(product.average_rating!) ? 'fill-brand-yellow text-brand-yellow' : 'fill-gray-200 text-gray-200'}`} />
            ))}
            <span className="text-sm text-gray-500 ml-1">({product.review_count || 0})</span>
          </div>
        )}
        {/* Spacer keeps price row bottom-aligned so card rows sit level */}
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-2 mt-auto">
          <span className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-gray-900">{formatPrice(product.sale_price || product.price)}</span>
            {hasSale && <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>}
          </span>
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </div>
  );
}
