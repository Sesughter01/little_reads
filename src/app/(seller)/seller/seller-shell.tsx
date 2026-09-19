'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  BarChart3,
  User,
  Wallet,
  Menu,
  X,
} from 'lucide-react';
import { LittleReadsIcon } from '@/components/brand/littlereads-icon';

/**
 * Interactive seller dashboard chrome — CLIENT component.
 *
 * Presentation only: nothing here makes an authorization decision. Every
 * /seller dashboard route is server-guarded by requireApprovedSeller() in the
 * server layout + pages, so the shell can never grant seller access.
 */
const NAV = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/books', label: 'My Books', icon: BookOpen },
  { href: '/seller/books/new', label: 'Add New Book', icon: PlusCircle },
  { href: '/seller/sales', label: 'Sales', icon: BarChart3 },
  { href: '/seller/profile', label: 'Seller Profile', icon: User },
  { href: '/seller/earnings', label: 'Earnings', icon: Wallet },
];

export function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              aria-label="Open seller navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/seller" className="flex items-center gap-2">
              <LittleReadsIcon className="h-7 w-7" />
              <span className="hidden text-lg font-bold text-brand-purple font-display sm:inline">
                LittleReads
              </span>
              <span className="badge bg-brand-orange/10 text-brand-orange text-xs">Seller</span>
            </Link>
          </div>
          <Link href="/" className="text-sm text-gray-500 hover:text-brand-purple">
            View Store
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
          <nav className="space-y-1 p-4">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/seller' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-orange/10 text-brand-orange'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute left-0 top-0 flex h-full w-[min(85vw,280px)] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <span className="text-sm font-bold text-brand-orange">Seller Panel</span>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}