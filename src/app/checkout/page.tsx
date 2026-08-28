'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import { Lock, ArrowLeft, CreditCard, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  cover_url: string | null;
  author: string;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; user_metadata: Record<string, string> } | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const router = useRouter();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');
    setCart(stored);
    setLoaded(true);

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user as { id: string; email: string; user_metadata: Record<string, string> });
        setForm((prev) => ({
          ...prev,
          email: session.user.email || '',
          firstName: session.user.user_metadata?.first_name || '',
          lastName: session.user.user_metadata?.last_name || '',
        }));
      }
    });
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      // Create order and initialize payment
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: `${form.firstName} ${form.lastName}`,
          customer_email: form.email,
          phone: form.phone,
          items: cart.map((item) => ({
            product_id: item.id,
            title: item.title,
            price: item.price,
          })),
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Clear cart
      localStorage.setItem('littlereads_cart', '[]');
      window.dispatchEvent(new Event('cart-updated'));

      // Redirect to Paystack
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
      setIsProcessing(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Your cart is empty
        </h1>
        <p className="text-gray-500 mb-8">
          Add some books before checking out.
        </p>
        <Link href="/shop" className="btn-primary">
          Browse Books
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="section-title mb-8">Checkout</h1>

      <div className="lg:grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="card mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="input"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="input"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="+234 XXX XXX XXXX"
                />
              </div>
            </div>
            {!user && (
              <p className="mt-4 text-sm text-gray-500">
                <Link href="/login" className="text-brand-purple hover:underline">
                  Sign in
                </Link>{' '}
                to keep your books in your library for easy access.
              </p>
            )}
          </div>

          {/* Mobile order summary */}
          <div className="lg:hidden mb-6">
            <OrderSummary cart={cart} total={total} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full btn-orange py-4 text-base"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pay {formatPrice(total)} with Paystack
              </span>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
            <Lock className="h-4 w-4" />
            Secure payment powered by Paystack
          </div>
        </form>

        {/* Order Summary Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <OrderSummary cart={cart} total={total} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderSummary({ cart, total }: { cart: CartItem[]; total: number }) {
  return (
    <div className="card bg-gray-50">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
      <div className="space-y-3 mb-4">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-gray-200 shrink-0">
              {item.cover_url ? (
                <Image
                  src={item.cover_url}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="40px"
                />                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
              <p className="text-xs text-gray-500">{item.author}</p>
            </div>
            <p className="text-sm font-semibold shrink-0">{formatPrice(item.price)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-gray-900">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}
