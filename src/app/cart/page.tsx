'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingCart, ArrowRight, ArrowLeft, BookOpen } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface CartItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  cover_url: string | null;
  author: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');
    setCart(stored);
    setLoaded(true);
  }, []);

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('littlereads_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const removeItem = (id: string) => {
    const newCart = cart.filter((item) => item.id !== id);
    updateCart(newCart);
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  if (!loaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Your cart is empty
        </h1>
        <p className="text-gray-500 mb-8">
          Looks like you haven&apos;t added any books yet. Explore our collection!
        </p>
        <Link href="/shop" className="btn-primary">
          Browse Books
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="section-title mb-8">Shopping Cart</h1>

      <div className="space-y-4 mb-8">
        {cart.map((item) => (
          <div key={item.id} className="card flex items-center gap-4 p-4">
            {/* Cover */}
            <Link href={`/books/${item.slug}`} className="shrink-0">
              <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-gray-100">
                {item.cover_url ? (
                  <Image
                    src={item.cover_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </div>
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/books/${item.slug}`}
                className="font-semibold text-gray-900 hover:text-brand-purple transition-colors block truncate"
              >
                {item.title}
              </Link>
              <p className="text-sm text-gray-500">{item.author}</p>
              <p className="text-xs text-gray-400 mt-1">Digital Ebook (PDF)</p>
            </div>

            {/* Price */}
            <div className="text-right shrink-0">
              <p className="font-bold text-gray-900">{formatPrice(item.price)}</p>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeItem(item.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
              aria-label={`Remove ${item.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Subtotal ({cart.length} {cart.length === 1 ? 'book' : 'books'})</span>
          <span className="font-bold text-xl text-gray-900">{formatPrice(total)}</span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Payment will be processed securely via Paystack
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/shop"
            className="flex-1 inline-flex items-center justify-center gap-2 btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
          <Link
            href="/checkout"
            className="flex-1 btn-primary"
          >
            Proceed to Checkout
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
}
