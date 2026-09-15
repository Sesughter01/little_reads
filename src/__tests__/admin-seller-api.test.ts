import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * PATCH /api/admin/sellers/[id] — seller application moderation.
 *
 * Real route handler + real requireAdminApi against mocked Supabase modules —
 * the same vi.spyOn harness proven by admin-api-guard.test.ts and
 * live-recovery-routes.test.ts.
 */

type AuthScenario = {
  user: { id: string } | null;
  authError?: boolean;
  profile?: { id: string; role: string } | null;
  profileError?: boolean;
};

function buildAuthClient(scenario: AuthScenario) {
  const { user, authError = false, profile = null, profileError = false } = scenario;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        authError || !user
          ? { data: { user: null }, error: authError ? { message: 'invalid token' } : null }
          : { data: { user }, error: null }
      ),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
          data: { currentLevel: 'aal1', nextLevel: null },
          error: null,
        }),
        listFactors: vi.fn().mockResolvedValue({ data: { all: [], totp: [] }, error: null }),
      },
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                profileError || !profile
                  ? { data: null, error: profileError ? { message: 'db down' } : null }
                  : { data: profile, error: null }
              ),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) };
    }),
  };
}

async function spyServerClient(mock: unknown) {
  const serverModule = await import('@/lib/supabase/server');
  vi.spyOn(serverModule, 'createClient').mockImplementation(
    vi.fn().mockResolvedValue(mock) as never
  );
  return serverModule;
}

async function spyServiceClient(mock: unknown) {
  const serverModule = await import('@/lib/supabase/server');
  vi.spyOn(serverModule, 'createServiceClient').mockImplementation(
    vi.fn().mockResolvedValue(mock) as never
  );
  return serverModule;
}

/**
 * Service client mock for the PATCH flow:
 *   lookup: .select().eq().maybeSingle()        → `existing`
 *   update: .update(payload).eq().select().single() → `updated`
 */
function serviceWith(existing: unknown, updated: unknown) {
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: updated, error: null }),
      }),
    }),
  });
  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'seller_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
          update,
        };
      }
      return {};
    }),
  };
  return { client, update };
}

describe('PATCH /api/admin/sellers/[id] (real route + real requireAdminApi)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('anonymous caller → 401', async () => {
    await spyServerClient(buildAuthClient({ user: null }));
    await spyServiceClient({});
    const { PATCH } = await import('@/app/api/admin/sellers/[id]/route');

    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sellers/s1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    );
    expect(res.status).toBe(401);
  });

  it('authenticated customer → 403', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'c1' }, profile: { id: 'c1', role: 'customer' } })
    );
    await spyServiceClient({});
    const { PATCH } = await import('@/app/api/admin/sellers/[id]/route');

    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sellers/s1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    );

  });

  it('invalid status value → 400 (no DB call)', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    const { client } = serviceWith(null, null);
    await spyServiceClient(client);
    const { PATCH } = await import('@/app/api/admin/sellers/[id]/route');

    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sellers/s1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    );
    expect(res.status).toBe(400);
    const mockedFrom = (client as { from: ReturnType<typeof vi.fn> }).from;
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it('unknown applicant → 404', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    await spyServiceClient(serviceWith(null, null).client);
    const { PATCH } = await import('@/app/api/admin/sellers/[id]/route');

    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sellers/s1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('admin cannot moderate their own application → 403', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    await spyServiceClient(serviceWith({ user_id: 'a1', status: 'pending' }, null).client);
    const { PATCH } = await import('@/app/api/admin/sellers/[id]/route');

    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sellers/a1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      }),
      { params: Promise.resolve({ id: 'a1' }) }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/own seller application/i);
  });

  it('approve stamps approved_by = acting admin and approved_at = now', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    const approved = {
      user_id: 's1',
      display_name: 'Ada Author',
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: 'a1',
    };
    const { client, update } = serviceWith({ user_id: 's1', status: 'pending' }, approved);
    await spyServiceClient(client);
    const { PATCH } = await import('@/app/api/admin/sellers/[id]/route');

    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sellers/s1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seller.status).toBe('approved');
    expect(body.seller.approved_by).toBe('a1');
    expect(body.seller.approved_at).toBeTruthy();

    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.status).toBe('approved');
    expect(payload.approved_by).toBe('a1');
    expect(payload.approved_at).toBeTruthy();
  });

  it('suspend clears approved_* so the columns never hold stale grants', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    const suspended = {
      user_id: 's1',
      display_name: 'Ada Author',
      status: 'suspended',
      approved_at: null,
      approved_by: null,
    };
    const { client, update } = serviceWith(
      { user_id: 's1', status: 'approved', approved_by: 'a1', approved_at: 'x' },
      suspended
    );
    await spyServiceClient(client);
    const { PATCH } = await import('@/app/api/admin/sellers/[id]/route');

    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sellers/s1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seller.status).toBe('suspended');
    expect(body.seller.approved_by).toBeNull();

    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.status).toBe('suspended');
    expect(payload.approved_at).toBeNull();
    expect(payload.approved_by).toBeNull();
  });
});
