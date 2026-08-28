'use client';

import { useEffect } from 'react';
import { TriangleAlert, RotateCcw, House } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
          <TriangleAlert className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-display">
          Something Went Wrong
        </h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          An unexpected error occurred. Please try again or contact support
          if the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link href="/" className="btn-secondary gap-2">
            <House className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
