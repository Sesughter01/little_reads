'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, X, BookOpen } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface WishlistItem {
  id: string;
  product_id: string;
  title: string;
  slug: string;
  price: number;
  cover_url: string | null;
  author: string;
}

export function WishlistClient() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = createClient();

    const loadWishlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);

      if (uid) {
        // Logged-in: fetch from Supabase wishlist table
        const { data } = await supabase
          .from('wishlist')
          .select('id, product_id, created_at, product:products(id, title, slug, price, cover_url, author)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });

        if (data) {
          const mapped: WishlistItem[] = data
            .filter((w) => w.product)
            .map((w) => {
              const product = w.product as unknown as {
                id: string; title: string; slug: string;
                price: number; cover_url: string | null; author: string;
              };
              return {
                id: w.id,
                product_id: w.product_id,
                title: product.title,
                slug: product.slug,
                price: product.price,
                cover_url: product.cover_url,
                author: product.author,
              };
            });
          setItems(mapped);
        }
      } else {
        // Guest: fetch from localStorage and resolve product details
        const stored = JSON.parse(localStorage.getItem('littlereads_wishlist') || '[]');
        if (stored.length > 0) {
          const productIds = stored.map((item: { id: string }) => item.id);
          const { data: products } = await supabase
            .from('products')
            .select('id, title, slug, price, cover_url, author')
            .in('id', productIds);

          if (products) {
            const productMap = new Map(products.map((p) => [p.id, p]));
            const mapped: WishlistItem[] = stored
              .filter((item: { id: string }) => productMap.has(item.id))
              .map((item: { id: string }) => {
                const p = productMap.get(item.id)!;
                return {
                  id: item.id,
                  product_id: item.id,
                  title: p.title,
                  slug: p.slug,
                  price: p.price,
                  cover_url: p.cover_url,
                  author: p.author,
                };
              });
            setItems(mapped);
          }
        }
      }
      setLoaded(true);
    };

    loadWishlist();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const removeFromWishlist = async (item: WishlistItem) => {
    if (userId) {
      // Logged-in: remove from Supabase
      const supabase = createClient();
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', item.id)
        .eq('user_id', userId);
      if (error) {
        toast.error('Failed to remove from wishlist');
        return;
      }
    } else {
      // Guest: remove from localStorage
      const wishlist = JSON.parse(localStorage.getItem('littlereads_wishlist') || '[]');
      const newWishlist = wishlist.filter((w: { id: string }) => w.id !== item.product_id);
      localStorage.setItem('littlereads_wishlist', JSON.stringify(newWishlist));
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast('Removed from wishlist');
  };

  const addToCart = (item: WishlistItem) => {
    const cart = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');
    if (cart.some((c: { id: string }) => c.id === item.product_id)) {
      toast('Already in your cart');
      return;
    }
    cart.push({
      id: item.product_id,
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
                onClick={() => removeFromWishlist(item)}
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
