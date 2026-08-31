'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface WishlistButtonProps {
  productId: string;
  size?: 'sm' | 'md';
}

export function WishlistButton({ productId, size = 'sm' }: WishlistButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = createClient();

    const checkWishlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);

      if (uid) {
        // Logged-in: check Supabase wishlist table
        const { data } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', uid)
          .eq('product_id', productId)
          .single();
        setIsInWishlist(!!data);
      } else {
        // Guest: check localStorage
        const wishlist = JSON.parse(localStorage.getItem('littlereads_wishlist') || '[]');
        setIsInWishlist(wishlist.some((item: { id: string }) => item.id === productId));
      }
    };

    checkWishlist();
  }, [productId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleWishlist = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (userId) {
        // Logged-in: use Supabase
        const supabase = createClient();

        if (isInWishlist) {
          const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);
          if (error) throw error;
          setIsInWishlist(false);
          toast('Removed from wishlist');
        } else {
          const { error } = await supabase
            .from('wishlist')
            .insert({ user_id: userId, product_id: productId });
          if (error) throw error;
          setIsInWishlist(true);
          toast.success('Added to wishlist');
        }
      } else {
        // Guest: use localStorage
        const wishlist = JSON.parse(localStorage.getItem('littlereads_wishlist') || '[]');

        if (isInWishlist) {
          const newWishlist = wishlist.filter((item: { id: string }) => item.id !== productId);
          localStorage.setItem('littlereads_wishlist', JSON.stringify(newWishlist));
          setIsInWishlist(false);
          toast('Removed from wishlist');
        } else {
          // We need product info for localStorage guest wishlist
          // Store just the product ID reference - the product details are loaded from DB
          wishlist.push({ id: productId });
          localStorage.setItem('littlereads_wishlist', JSON.stringify(wishlist));
          setIsInWishlist(true);
          toast.success('Added to wishlist');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Wishlist update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'p-2' : 'p-2.5';

  return (
    <button
      onClick={toggleWishlist}
      disabled={isLoading}
      className={`${buttonSize} rounded-xl transition-colors ${
        isInWishlist
          ? 'text-red-500 bg-red-50 hover:bg-red-100'
          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
      }`}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={`${iconSize} ${isInWishlist ? 'fill-current' : ''}`} />
    </button>
  );
}
