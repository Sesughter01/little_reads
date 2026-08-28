import Link from 'next/link';
import { BookOpen, Search, House } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-purple-50 flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-brand-purple/60" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-display">
          Page Not Found
        </h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          This story wandered off the shelf. The page you&apos;re looking for
          may have been moved or doesn&apos;t exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary gap-2">
            <House className="h-4 w-4" />
            Go Home
          </Link>
          <Link href="/shop" className="btn-secondary gap-2">
            <Search className="h-4 w-4" />
            Browse Books
          </Link>
        </div>
      </div>
    </div>
  );
}
