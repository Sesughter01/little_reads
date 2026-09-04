import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for requireAdminApi() — the API-safe admin guard.
 *
 * The live bug this protects against: requireAdmin() (the page guard) calls
 * Next.js redirect(), which throws NEXT_REDIRECT inside route handlers. Catch
 * blocks then turned that navigation exception into a generic HTTP 500.
 * requireAdminApi() must NEVER redirect or throw for authorization failures —
 * it returns a typed 401/403 result instead.
 */
describe('Admin API authorization guard (requireAdminApi)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  /** Build a mock createClient implementation for a given auth scenario. */
  function mockClient({
    user = null as { id: string; email?: string } | null,
    authError = false,
    profile = null as { id: string; role: string } | null,
    profileError = false,
    assuranceLevel = 'aal1' as 'aal1' | 'aal2',
    totpFactors = [] as { factor_type: string; status: string }[],
  }) {
    return vi.fn().mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue(
          authError || !user
            ? { data: { user: null }, error: authError ? { message: 'invalid token' } : null }
            : { data: { user }, error: null }
        ),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
            data: { currentLevel: assuranceLevel, nextLevel: null },
            error: null,
          }),
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: totpFactors,
              totp: totpFactors.filter((f) => f.factor_type === 'totp' && f.status === 'verified'),
            },
            error: null,
          }),
        },
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              profileError || !profile
                ? { data: null, error: profileError ? { message: 'db down' } : null }
                : { data: profile, error: null }
            ),
          }),
        }),
      }),
    } as never);
  }

  async function loadGuardWith(createClientMock: ReturnType<typeof vi.fn>) {
    const serverModule = await import('@/lib/supabase/server');
    vi.spyOn(serverModule, 'createClient').mockImplementation(createClientMock as never);
    const { requireAdminApi } = await import('@/lib/auth');
    return requireAdminApi;
  }

  it('anonymous caller → 401 result (never redirects / throws)', async () => {
    const requireAdminApi = await loadGuardWith(
      mockClient({ user: null })
    );
    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('authenticated non-admin (customer) → 403', async () => {
    const requireAdminApi = await loadGuardWith(
      mockClient({
        user: { id: 'user-customer' },
        profile: { id: 'user-customer', role: 'customer' },
      })
    );
    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('authenticated admin with no TOTP factor enrolled → allowed', async () => {
    const requireAdminApi = await loadGuardWith(
      mockClient({
        user: { id: 'user-admin' },
        profile: { id: 'user-admin', role: 'admin' },
      })
    );
    const result = await requireAdminApi();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('user-admin');
    }
  });

  it('admin with verified TOTP at aal1 → 403 (MFA verification pending)', async () => {
    const requireAdminApi = await loadGuardWith(
      mockClient({
        user: { id: 'user-admin' },
        profile: { id: 'user-admin', role: 'admin' },
        assuranceLevel: 'aal1',
        totpFactors: [{ factor_type: 'totp', status: 'verified' }],
      })
    );
    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('admin with verified TOTP at aal2 → allowed', async () => {
    const requireAdminApi = await loadGuardWith(
      mockClient({
        user: { id: 'user-admin' },
        profile: { id: 'user-admin', role: 'admin' },
        assuranceLevel: 'aal2',
        totpFactors: [{ factor_type: 'totp', status: 'verified' }],
      })
    );
    const result = await requireAdminApi();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('user-admin');
    }
  });

  it('unauthenticated call resolves to a 401 result — never rejects with NEXT_REDIRECT', async () => {
    const requireAdminApi = await loadGuardWith(
      mockClient({ user: null })
    );
    // Must resolve to a 401 result, not reject with a redirect exception that
    // a route handler catch block would convert into a 500.
    await expect(requireAdminApi()).resolves.toMatchObject({ ok: false, status: 401 });
  });

  it('profile row missing → treated as unauthenticated (401)', async () => {
    const requireAdminApi = await loadGuardWith(
      mockClient({ user: { id: 'user-x' }, profileError: true })
    );
    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });
});
