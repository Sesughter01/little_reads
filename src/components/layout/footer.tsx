'use client';

import Link from 'next/link';
import { LittleReadsIcon } from '@/components/brand/littlereads-icon';
import { NewsletterForm } from '@/components/newsletter-form';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <LittleReadsIcon className="h-7 w-7" />
              <span className="text-lg font-bold text-white font-display">LittleReads</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Big Adventures for Little Readers. Educational ebooks for ages 5–10.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Shop</h3>
            <ul className="space-y-2">
              <li><Link href="/shop" className="text-sm hover:text-white transition-colors">All Books</Link></li>
              <li><Link href="/shop?age=5-6" className="text-sm hover:text-white transition-colors">Ages 5–6</Link></li>
              <li><Link href="/shop?age=6-8" className="text-sm hover:text-white transition-colors">Ages 6–8</Link></li>
              <li><Link href="/shop?age=8-10" className="text-sm hover:text-white transition-colors">Ages 8–10</Link></li>
              <li><Link href="/categories" className="text-sm hover:text-white transition-colors">Categories</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/refund-policy" className="text-sm hover:text-white transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Stay Updated</h3>
            <p className="text-sm text-gray-400 mb-3">Get notified about new books and offers.</p>
            <NewsletterForm />
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} LittleReads. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Made with ♥ for little readers
          </p>
        </div>
      </div>
    </footer>
  );
}
