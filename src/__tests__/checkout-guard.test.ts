import { describe, it, expect } from 'vitest';
import {
  resolveCheckoutAnonymousRedirect,
  CheckoutAnonymousDestination,
} from '@/lib/checkout-guard';

describe('resolveCheckoutAnonymousRedirect', () => {
  it('sends guests on the bare /checkout page to REGISTRATION (journey start)', () => {
    const dest = resolveCheckoutAnonymousRedirect('/checkout', '');
    expect(dest).not.toBeNull();
    expect((dest as CheckoutAnonymousDestination).path).toBe('/register');
    expect((dest as CheckoutAnonymousDestination).redirectTo).toBe('/checkout');
  });

  it('never redirects a Paystack payment RETURN to registration — /checkout/success stays a LOGIN recovery path', () => {
    const dest = resolveCheckoutAnonymousRedirect(
      '/checkout/success',
      '?ref=LR-ABC123'
    );
    expect(dest).not.toBeNull();
    expect((dest as CheckoutAnonymousDestination).path).toBe('/login');
    // The full intended destination (including the Paystack reference) is
    // preserved so reconciliation continues after sign-in.
    expect((dest as CheckoutAnonymousDestination).redirectTo).toBe(
      '/checkout/success?ref=LR-ABC123'
    );
  });

  it('keeps /checkout/success without a reference a login recovery flow too', () => {
    const dest = resolveCheckoutAnonymousRedirect('/checkout/success', '');
    expect(dest).not.toBeNull();
    expect((dest as CheckoutAnonymousDestination).path).toBe('/login');
    expect((dest as CheckoutAnonymousDestination).redirectTo).toBe(
      '/checkout/success'
    );
  });

  it('preserves extra query parameters on recovery pages', () => {
    const dest = resolveCheckoutAnonymousRedirect(
      '/checkout/success',
      '?ref=LR-XYZ&utm_source=test'
    );
    expect((dest as CheckoutAnonymousDestination).redirectTo).toBe(
      '/checkout/success?ref=LR-XYZ&utm_source=test'
    );
  });

  it('returns null for non-checkout paths (guard is scoped, not a catch-all)', () => {
    expect(resolveCheckoutAnonymousRedirect('/', '')).toBeNull();
    expect(resolveCheckoutAnonymousRedirect('/account', '')).toBeNull();
    expect(resolveCheckoutAnonymousRedirect('/check', '')).toBeNull();
    expect(resolveCheckoutAnonymousRedirect('/checkoutX', '')).toBeNull();
  });

  it('never accepts an external origin or scheme in the destination', () => {
    // The redirect value is always derived from the request pathname, which
    // is a same-app path — but if anything external ever reached the guard
    // it must not be echoed.
    const dest = resolveCheckoutAnonymousRedirect(
      '//evil.example/checkout',
      ''
    );
    if (dest) {
      expect(dest.redirectTo.startsWith('//')).toBe(false);
      expect(dest.redirectTo.startsWith('http')).toBe(false);
    }
  });
});