'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Library,
  ShoppingBag,
  Star,
  Heart,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/account', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/account/library', label: 'My Library', icon: Library },
    { href: '/account/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/account/reviews', label: 'Reviews', icon: Star },
    { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/account/profile', label: 'Profile', icon: User },
  ];

  const currentLabel = navItems.find((item) => item.href === pathname)?.label || 'My Account';
  const CurrentIcon = navItems.find((item) => item.href === pathname)?.icon || LayoutDashboard;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 font-display">My Account</h1>

      <div className="lg:grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <nav className="space-y-1 sticky top-24">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-purple/10 text-brand-purple'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <hr className="my-2 border-gray-100" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden mb-6">
          {/* Current page indicator + toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm text-sm font-medium text-gray-700"
            aria-expanded={mobileMenuOpen}
          >
            <span className="flex items-center gap-3">
              <CurrentIcon className="h-5 w-5 text-brand-purple" />
              {currentLabel}
            </span>
            {mobileMenuOpen ? <X className="h-4 w-4 text-gray-400" /> : <Menu className="h-4 w-4 text-gray-400" />}
          </button>

          {/* Dropdown nav */}
          {mobileMenuOpen && (
            <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <nav className="py-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-purple/5 text-brand-purple'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
