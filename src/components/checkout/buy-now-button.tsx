'use client';

import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import type { Product } from '@/types';

export function BuyNowButton({ product }: { product: Product }) {
  const router = useRouter();

  const handleBuyNow = () => {
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
