'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, X, BookOpen } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

interface WishlistItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  cover_url: string | null;
  author: string;
  category?: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('littlereads_wishlist') || '[]');
    setItems(stored);
    setLoaded(true);
  }, []);

  const removeFromWishlist = (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    localStorage.setItem('littlereads_wishlist', JSON.stringify(newItems));
    toast('Removed from wishlist');
  };

  const addToCart = (item: WishlistItem) => {
    const cart = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');
    if (cart.some((c: { id: string }) => c.id === item.id)) {
      toast('Already in your cart');
      return;
    }
    cart.push({
      id: item.id,
      title: item.title,
      slug: item.slug,
      price: item.price,
      cover_url: item.cover_url,
      author: item.author,
    });
    localStorage.setItem('littlereads_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    toast.success(`"${item.title}" added to cart!`);
  };

  if (!loaded) {
    return <div className="animate-pulse h-40 bg-gray-200 rounded-xl" />;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">My Wishlist</h2>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card flex items-center gap-4 p-4">
              <Link href={`/books/${item.slug}`} className="shrink-0">
                <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-gray-100">
                  {item.cover_url ? (
                    <Image src={item.cover_url} alt={item.title} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-5 w-5 text-gray-300" /></div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/books/${item.slug}`} className="font-semibold text-gray-900 hover:text-brand-purple truncate block">
                  {item.title}
                </Link>
                <p className="text-sm text-gray-500">{item.author}</p>
              </div>
              <p className="font-bold text-gray-900 shrink-0">{formatPrice(item.price)}</p>
              <button
                onClick={() => addToCart(item)}
                className="p-2 text-brand-purple hover:bg-brand-purple/10 rounded-xl shrink-0"
                title="Add to cart"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeFromWishlist(item.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl shrink-0"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-500 mb-6">Save books you love for later.</p>
          <Link href="/shop" className="btn-primary">Browse Books</Link>
        </div>
      )}
    </div>
  );
}
