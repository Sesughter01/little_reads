import Link from 'next/link';
import { CheckCircle, Download, ShoppingBag, ArrowRight, Library } from 'lucide-react';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <CheckCircle className="h-20 w-20 text-brand-green mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Payment Successful!
      </h1>
      <p className="text-gray-500 mb-4">
        Thank you for your purchase. Your books are ready.
      </p>
      {ref && (
        <p className="text-sm text-gray-400 mb-8">
          Order Reference: <span className="font-mono">{ref}</span>
        </p>
      )}

      <div className="bg-gray-50 rounded-2xl p-6 mb-8">
        <p className="text-sm text-gray-500 mb-2">What&apos;s next?</p>
        <p className="text-gray-700">
          Your purchased ebooks are available in your library. You can download
          and read them anytime.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/account/library" className="btn-primary">
          <Library className="h-4 w-4 mr-2" />
          Go to My Library
        </Link>
        <Link href="/shop" className="btn-secondary">
          Continue Shopping
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </div>
    </div>
  );
}

