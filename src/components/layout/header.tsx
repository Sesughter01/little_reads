'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { LittleReadsIcon } from '@/components/brand/littlereads-icon';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ShoppingCart,
  Search,
  User,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Library,
  Heart,
  House,
  ShoppingBag,
  LayoutGrid,
  Info,
  Mail,
  ReceiptText,
  Star,
  ChevronRight,
  SearchX,
} from 'lucide-react';
import type { Profile } from '@/types';

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<Profile | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  // Auth listener
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setUser(data as Profile));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser(data as Profile);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Cart count
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('littlereads_cart') || '[]');
        setCartCount(cart.length);
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  // Body vertical scroll lock when drawer or search is open
  useEffect(() => {
    if (isDrawerOpen || isSearchOpen) {
      document.body.style.overflowY = 'hidden';
    } else {
      document.body.style.overflowY = '';
    }
    return () => { document.body.style.overflowY = ''; };
  }, [isDrawerOpen, isSearchOpen]);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Escape key handler
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDrawerOpen(false);
      setIsSearchOpen(false);
      setIsUserMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsUserMenuOpen(false);
    setIsDrawerOpen(false);
    router.push('/');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: House },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/categories', label: 'Categories', icon: LayoutGrid },
    { href: '/about', label: 'About', icon: Info },
  ];

  const customerLinks = [
    { href: '/account', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/account/library', label: 'My Library', icon: Library },
    { href: '/account/orders', label: 'My Orders', icon: ReceiptText },
    { href: '/account/reviews', label: 'My Reviews', icon: Star },
    { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/account/profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="LittleReads home">
              <LittleReadsIcon className="h-8 w-8" />
              <span className="text-lg lg:text-xl font-bold text-brand-purple font-display">
                LittleReads
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 ml-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors px-1 py-1 ${
                    pathname === link.href
                      ? 'text-brand-purple border-b-2 border-brand-purple'
                      : 'text-gray-600 hover:text-brand-purple'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2.5 text-gray-600 hover:text-brand-purple transition-colors rounded-xl hover:bg-gray-100"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Wishlist */}
              <Link
                href="/account/wishlist"
                className="p-2.5 text-gray-600 hover:text-brand-purple transition-colors rounded-xl hover:bg-gray-100"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Link>

              {/* User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 text-gray-600 hover:text-brand-purple transition-colors rounded-xl hover:bg-gray-100"
                    aria-label="Account menu"
                    aria-expanded={isUserMenuOpen}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium hidden xl:inline">
                      {user.first_name}
                    </span>
                  </button>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                          <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        {customerLinks.slice(0, 4).map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <link.icon className="h-4 w-4 text-gray-400" />
                            {link.label}
                          </Link>
                        ))}
                        {user.role === 'admin' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-purple hover:bg-brand-purple/5"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        )}
                        <hr className="my-1 border-gray-100" />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-purple transition-colors rounded-xl hover:bg-gray-100"
                >
                  <User className="h-5 w-5" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2.5 text-gray-600 hover:text-brand-purple transition-colors rounded-xl hover:bg-gray-100"
                aria-label={`Shopping cart, ${cartCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center gap-1">
              <button
                onClick={() => {
                  setIsSearchOpen(true);
                  setIsDrawerOpen(false);
                }}
                className="p-2.5 text-gray-600 hover:text-brand-purple rounded-xl"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <Link
                href="/cart"
                className="relative p-2.5 text-gray-600 hover:text-brand-purple rounded-xl"
                aria-label={`Shopping cart, ${cartCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => {
                  setIsDrawerOpen(true);
                  setIsSearchOpen(false);
                }}
                className="p-2.5 text-gray-600 hover:text-brand-purple rounded-xl"
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
                aria-controls="mobile-navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Search Bar */}
        {isSearchOpen && (
          <div className="hidden lg:block border-t border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books, authors, categories..."
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-300 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none text-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-white">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-2 text-gray-600 shrink-0"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20"
                autoFocus
              />
            </form>
            <button
              type="submit"
              onClick={handleSearchSubmit}
              className="text-sm font-semibold text-brand-purple px-2 shrink-0"
              aria-label="Submit search"
            >
              Go
            </button>
          </div>
          <div className="p-8 text-center">
            <SearchX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Search for books, authors, and categories</p>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] overflow-hidden" id="mobile-navigation">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="absolute left-0 top-0 h-full w-[min(85vw,320px)] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsDrawerOpen(false)}>
                <LittleReadsIcon className="h-7 w-7" />
                <span className="text-lg font-bold text-brand-purple font-display">LittleReads</span>
              </Link>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <nav className="flex-1 overflow-y-auto py-2">
              {/* Main Navigation */}
              <div className="px-3">
                <p className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-purple/10 text-brand-purple'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <link.icon className="h-5 w-5 shrink-0" />
                      {link.label}
                      {isActive && <ChevronRight className="h-4 w-4 ml-auto text-brand-purple/40" />}
                    </Link>
                  );
                })}
                <Link
                  href="/contact"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Mail className="h-5 w-5 shrink-0" />
                  Contact
                </Link>
              </div>

              <hr className="mx-5 my-3 border-gray-100" />

              {/* Account Section */}
              <div className="px-3">
                <p className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Account</p>
                {user ? (
                  <>
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    {customerLinks.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsDrawerOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-brand-purple/10 text-brand-purple'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <link.icon className="h-5 w-5 shrink-0" />
                          {link.label}
                          {isActive && <ChevronRight className="h-4 w-4 ml-auto text-brand-purple/40" />}
                        </Link>
                      );
                    })}
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-brand-purple hover:bg-brand-purple/5 transition-colors"
                      >
                        <LayoutDashboard className="h-5 w-5 shrink-0" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-2 space-y-2">
                    <Link
                      href="/login"
                      onClick={() => setIsDrawerOpen(false)}
                      className="btn-primary w-full text-center"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsDrawerOpen(false)}
                      className="btn-secondary w-full text-center"
                    >
                      Create Account
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            {/* Drawer Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400 text-center">Big Adventures for Little Readers</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
