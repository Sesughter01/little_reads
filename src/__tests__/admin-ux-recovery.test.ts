import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

// ============================================================
// Admin logout destination
// ============================================================
describe('SignOutButton destination resolution', () => {
  it('admin contexts resolve to /admin/login when redirectTo is passed', async () => {
    const { resolveSignOutDestination } = await import('@/lib/sign-out');
    expect(resolveSignOutDestination('/admin/login')).toBe('/admin/login');
  });

  it('customer contexts (no redirectTo) resolve to /', async () => {
    const { resolveSignOutDestination } = await import('@/lib/sign-out');
    expect(resolveSignOutDestination(undefined)).toBe('/');
  });

  it('the admin layout actually passes redirectTo="/admin/login" to SignOutButton', () => {
    const layout = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/layout.tsx'),
      'utf-8'
    );
    const signOutUsages = layout.match(/<SignOutButton[^>]*\/>/g) || [];
    expect(signOutUsages.length).toBeGreaterThanOrEqual(2); // desktop sidebar + mobile drawer
    for (const usage of signOutUsages) {
      expect(usage).toContain('redirectTo="/admin/login"');
    }
  });
});

// ============================================================
// Admin sidebar fixed positioning (desktop) vs drawer (mobile)
// ============================================================
describe('Admin sidebar structural contract', () => {
  let layout: string;

  beforeEach(() => {
    layout = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/layout.tsx'),
      'utf-8'
    );
  });

  it('desktop sidebar is FIXED in the viewport (not sticky document flow)', () => {
    // The desktop aside must be position:fixed anchored under the topbar,
    // with viewport-minus-topbar height and its own internal scroll.
    expect(layout).toContain('fixed top-[53px] left-0');
    expect(layout).toContain('h-[calc(100vh-53px)]');
    expect(layout).toContain('overflow-y-auto');
  });

  it('desktop sidebar is hidden on mobile (drawer takes over)', () => {
    expect(layout).toContain('hidden lg:block');
    expect(layout).toContain('lg:hidden'); // menu button + drawer are mobile-only
  });

  it('main content is offset by the sidebar width on desktop', () => {
    expect(layout).toContain('lg:ml-[16rem]');
  });

  it('topbar is fixed at the top', () => {
    expect(layout).toContain('fixed top-0 left-0 right-0 z-40');
  });

  it('exactly one desktop sidebar instance exists (no duplicate admin shell)', () => {
    const asideCount = (layout.match(/<aside/g) || []).length;
    expect(asideCount).toBe(1);
  });
});

// ============================================================
// Order status is payment-system-owned — PATCH is denied
// ============================================================
describe('Order status mutation denial', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('PATCH /api/admin/orders/[id]/status → 405 (manual status changes rejected)', async () => {
    const { PATCH } = await import('@/app/api/admin/orders/[id]/status/route');
    const request = new NextRequest('http://localhost/api/admin/orders/o1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'paid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(request, { params: Promise.resolve({ id: 'o1' }) });
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toMatch(/payment-system-owned/i);
  });

  it('the admin order detail page uses a read-only badge, not a status select', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/orders/[id]/page.tsx'),
      'utf-8'
    );
    expect(page).toContain('OrderStatusBadge');
    expect(page).not.toContain('OrderStatusSelect');
  });

  it('no route writes orders.status manually outside the trusted fulfillment path', () => {
    const appDir = path.resolve(__dirname, '../app');
    const libDir = path.resolve(__dirname, '../lib');

    function walk(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)]
      );
    }

    const candidates = [...walk(appDir), ...walk(libDir)].filter((f) =>
      f.endsWith('.ts') || f.endsWith('.tsx')
    );

    // A manual orders.status write looks like from('orders') followed by an
    // .update(...). The trusted fulfillment helper is the ONLY allowed writer.
    const offenders = candidates.filter((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const relative = file.split('src')[1]?.replace(/\\/g, '/') || file;
      if (relative.includes('__tests__')) return false;
      if (relative.includes('/lib/fulfillment.ts')) return false;
      return /from\(['"]orders['"]\)[\s\S]{0,400}\.update\(/.test(content);
    });

    expect(offenders).toEqual([]);
    // And the trusted path itself still marks orders paid after Paystack verification.
    const fulfillment = fs.readFileSync(
      path.resolve(__dirname, '../lib/fulfillment.ts'),
      'utf-8'
    );
    expect(fulfillment).toContain("status: 'paid'");
  });
});