'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { useClickGuard } from '@/lib/click-guard';
import { canBuyProduct } from '@/lib/seller-routing';
import type { Product } from '@/types';

export function BuyNowButton({
  product,
  sessionUserId = null,
}: {
  product: Product;
  sessionUserId?: string | null;
}) {
  const router = useRouter();
  const guard = useClickGuard();

  // Layer 1 — UI: sellers cannot buy their own books.
  if (!canBuyProduct(sessionUserId, product.seller_id ?? null)) {
    return (
      <Link
        href={`/seller/books/${product.id}`}
        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:border-brand-orange hover:text-brand-orange transition-all text-sm"
      >
        Manage Your Book
      </Link>
    );
  }

  const handleBuyNow = () => {
    // Synchronous guard: a rapid second click must not duplicate the cart
    // write or push twice. Ends in navigation — no release needed.
    if (!guard.claim()) return;
    const cart = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');
    const exists = cart.some((item: { id: string }) => item.id === product.id);

    if (!exists) {
      cart.push({
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.sale_price || product.price,
        cover_url: product.cover_url,
        author: product.author,
      });
      localStorage.setItem('littlereads_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
    }

    router.push('/checkout');
  };

  return (
    <button
      onClick={handleBuyNow}
      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-orange text-white font-semibold rounded-2xl hover:bg-brand-orange-dark transition-all text-sm"
    >
      <Zap className="h-4 w-4" />
      Buy Now
    </button>
  );
}
