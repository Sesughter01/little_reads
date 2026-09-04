'use client';

import { ShoppingCart, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Product } from '@/types';

export function AddToCartButton({
  product,
  size = 'md',
}: {
  product: Product;
  size?: 'sm' | 'md';
}) {
  const [isInCart, setIsInCart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time check of cart membership in localStorage on mount */
  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');
    setIsInCart(cart.some((item: { id: string }) => item.id === product.id));
  }, [product.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAddToCart = async () => {
    setIsLoading(true);

    // Small delay for UX feedback
    await new Promise((r) => setTimeout(r, 200));

    const cart = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');

    if (cart.some((item: { id: string }) => item.id === product.id)) {
      toast('This book is already in your cart');
      setIsLoading(false);
      return;
    }

    cart.push({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.sale_price || product.price,
      cover_url: product.cover_url,
      author: product.author,
    });

    localStorage.setItem('littlereads_cart', JSON.stringify(cart));
    setIsInCart(true);
    toast.success(`"${product.title}" added to cart!`);
    window.dispatchEvent(new Event('cart-updated'));
    setIsLoading(false);
  };

  if (isInCart) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-brand-green font-medium ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}
      >
        <Check className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        In Cart
      </span>
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all rounded-xl ${
        size === 'sm'
          ? 'p-2 bg-brand-purple text-white hover:bg-brand-purple-dark text-xs'
          : 'px-6 py-3 bg-brand-purple text-white hover:bg-brand-purple-dark text-sm w-full'
      }`}
    >
      <ShoppingCart className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {size === 'sm' ? 'Add' : 'Add to Cart'}
    </button>
  );
}
