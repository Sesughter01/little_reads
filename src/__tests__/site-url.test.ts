import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getEnvSiteOrigin,
  normalizeSiteOrigin,
  parseSingleSiteUrl,
  resolveSiteUrl,
} from '@/lib/site-url';

afterEach(() => {
  vi.unstubAllEnvs();
});

// ============================================================
// Trailing-slash normalization
// ============================================================
describe('normalizeSiteOrigin', () => {
  it('strips trailing slashes', () => {
    expect(normalizeSiteOrigin('https://littlereads.com.ng/')).toBe(
      'https://littlereads.com.ng'
    );
    expect(normalizeSiteOrigin('https://little-reads.vercel.app///')).toBe(
      'https://little-reads.vercel.app'
    );
  });

  it('trims whitespace around the value', () => {
    expect(normalizeSiteOrigin('  https://littlereads.com.ng  ')).toBe(
      'https://littlereads.com.ng'
    );
  });

  it('returns null for empty values', () => {
    expect(normalizeSiteOrigin('')).toBeNull();
    expect(normalizeSiteOrigin('   ')).toBeNull();
    expect(normalizeSiteOrigin(null)).toBeNull();
    expect(normalizeSiteOrigin(undefined)).toBeNull();
  });
});

// ============================================================
// Single-URL validation (no multi-URL values, no junk)
// ============================================================
describe('parseSingleSiteUrl', () => {
  it('accepts valid single http(s) origins and normalizes them', () => {
    expect(parseSingleSiteUrl('https://littlereads.com.ng')).toBe(
      'https://littlereads.com.ng'
    );
    expect(parseSingleSiteUrl('https://little-reads.vercel.app/')).toBe(
      'https://little-reads.vercel.app'
    );
    expect(parseSingleSiteUrl('http://localhost:3000')).toBe(
      'http://localhost:3000'
    );
  });

  it('drops any path/query/hash, returning the bare origin', () => {
    expect(parseSingleSiteUrl('https://littlereads.com.ng/auth/callback')).toBe(
      'https://littlereads.com.ng'
    );
  });

  it('rejects multiple URLs packed into one variable', () => {
    expect(parseSingleSiteUrl('https://a.com,https://b.com')).toBeNull();
    expect(parseSingleSiteUrl('https://a.com https://b.com')).toBeNull();
  });

  it('rejects scheme-less hosts and protocol-relative URLs', () => {
    expect(parseSingleSiteUrl('littlereads.com.ng')).toBeNull();
    expect(parseSingleSiteUrl('//littlereads.com.ng')).toBeNull();
  });

  it('rejects non-http(s) schemes', () => {
    expect(parseSingleSiteUrl('javascript:alert(1)')).toBeNull();
    expect(parseSingleSiteUrl('ftp://files.example.com')).toBeNull();
  });

  it('rejects garbage and empty values', () => {
    expect(parseSingleSiteUrl('not a url')).toBeNull();
    expect(parseSingleSiteUrl('')).toBeNull();
    expect(parseSingleSiteUrl(null)).toBeNull();
  });
});

// ============================================================
// Environment resolution strategy
// ============================================================
describe('resolveSiteUrl', () => {
  it('uses the env-scoped value when valid (production shape)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://littlereads.com.ng');
    const resolved = resolveSiteUrl('https://other.example');
    expect(resolved).toEqual({
      origin: 'https://littlereads.com.ng',
      source: 'env',
    });
  });

  it('uses the env-scoped value when valid (preview shape)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://little-reads.vercel.app/');
    expect(resolveSiteUrl(null)?.origin).toBe(
      'https://little-reads.vercel.app'
    );
  });

  it('uses the env-scoped value when valid (local shape)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    expect(resolveSiteUrl(null)?.origin).toBe('http://localhost:3000');
  });

  it('falls back to the server request origin only when env is unset/invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const resolved = resolveSiteUrl('https://request-origin.example');
    expect(resolved).toEqual({
      origin: 'https://request-origin.example',
      source: 'origin',
    });
  });

  it('returns null when neither env nor request origin is usable', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(resolveSiteUrl(null)).toBeNull();
    expect(resolveSiteUrl('garbage')).toBeNull();
  });

  it('getEnvSiteOrigin returns the normalized env origin or null (no window.location fallback)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://little-reads.vercel.app/');
    expect(getEnvSiteOrigin()).toBe('https://little-reads.vercel.app');

    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://a.com,https://b.com');
    expect(getEnvSiteOrigin()).toBeNull();

    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(getEnvSiteOrigin()).toBeNull();
  });
});

// ============================================================
// Structural contract: auth code never hardcodes URLs
// ============================================================
describe('environment URL strategy wiring', () => {
  const read = (p: string) =>
    fs.readFileSync(path.resolve(__dirname, '..', p), 'utf-8');

  it('register client no longer falls back to window.location.origin', () => {
    const src = read('app/(auth)/register/register-client.tsx');
    expect(src).not.toContain('window.location.origin');
    expect(src).toContain('NEXT_PUBLIC_SITE_URL');
  });

  it('no application auth code hardcodes localhost or the production domain', () => {
    const authFiles = [
      'app/(auth)/register/register-client.tsx',
      'app/(auth)/forgot-password/forgot-password-client.tsx',
      'app/auth/callback/route.ts',
      'lib/site-url.ts',
    ];
    for (const file of authFiles) {
      const content = read(file);
      expect(content).not.toMatch(/localhost|127\.0\.0\.1/);
      expect(content).not.toContain('littlereads.com.ng');
      expect(content).not.toContain('little-reads.vercel.app');
    }
  });

  it('multiple URLs are never packed into NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://a.com,https://b.com');
    expect(resolveSiteUrl(null)).toBeNull();
  });

  it('callback uses the shared site-url module', () => {
    const callback = read('app/auth/callback/route.ts');
    expect(callback).toContain("from '@/lib/site-url'");
  });
});
