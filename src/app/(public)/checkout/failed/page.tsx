import Link from 'next/link';
import { XCircle, ShoppingCart, RefreshCw, Mail } from 'lucide-react';

export default function CheckoutFailedPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Payment Failed
      </h1>
      <p className="text-gray-500 mb-8">
        We couldn&apos;t process your payment. Don&apos;t worry, you haven&apos;t been charged.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/cart" className="btn-primary">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Return to Cart
        </Link>
        <Link href="/checkout" className="btn-orange">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-300 rounded-2xl hover:bg-gray-50"
        >
          <Mail className="h-4 w-4" />
          Contact Support
        </Link>
      </div>
    </div>
  );
}
