import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

type OnboardingScenario = {
  user: { id: string } | null;
  authError?: boolean;
  existingProfile?: unknown;
  selectError?: unknown | null;
  insertError?: unknown | null;
  insertedProfile?: unknown;
};

function buildOnboardingClient(scenario: OnboardingScenario) {
  const {
    user = { id: 'u1' },
    authError = false,
    existingProfile = null,
    selectError = null,
    insertError = null,
    insertedProfile = null,
  } = scenario;

  const maybeSingle = vi.fn().mockResolvedValue({ data: existingProfile, error: selectError });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq });

  const single = vi.fn().mockResolvedValue({ data: insertedProfile, error: insertError });
  const insertSelectFn = vi.fn().mockReturnValue({ single });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });

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
      if (table === 'seller_profiles') {
        return { select: selectFn, insert: insertFn };
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

async function postOnboarding(body: unknown) {
  const { POST } = await import('@/app/api/seller/onboarding/route');
  return POST(
    new NextRequest('http://localhost/api/seller/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/seller/onboarding (real route + mocked Supabase)', () => {
  beforeEach(() => {
        vi.resetModules();
  });

  it('authenticated user, no existing profile, insert succeeds - 201 pending', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await spyServerClient(
      buildOnboardingClient({
        user: { id: 'u1' },
        existingProfile: null,
        selectError: null,
        insertError: null,
        insertedProfile: {
          user_id: 'u1',
          display_name: 'Ada Author',
          business_name: 'Ada Stories Ltd',
          bio: 'Children books',
          status: 'pending',
        },
      })
    );

    const res = await postOnboarding({
      display_name: 'Ada Author',
      business_name: 'Ada Stories Ltd',
      bio: 'Children books',
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.seller.status).toBe('pending');
    expect(body.seller.user_id).toBe('u1');
    expect(body.message).toMatch(/under review/i);
        expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('seller_profiles table missing (PGRST205 from SELECT - migration 007 not applied) - 500', async () => {
    const notFoundError = {
      code: 'PGRST205',
      details: null,
      hint: 'Perhaps you meant the table public.profiles',
      message: "Could not find the table 'public.seller_profiles' in the schema cache",
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await spyServerClient(
      buildOnboardingClient({
        user: { id: 'u1' },
        existingProfile: null,
        selectError: { ...notFoundError },
      })
    );

    const res = await postOnboarding({
      display_name: 'Ada Author',
      business_name: 'Ada Stories Ltd',
      bio: 'Children books',
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Unable to submit seller application');

    // Full error object logged so operators can diagnose the root cause
    expect(consoleSpy).toHaveBeenCalledWith(
      'seller onboarding: lookup failed:',
      notFoundError
    );
  });

  it('PGRST205 from INSERT (defence-in-depth) - 500 with full log', async () => {
    const notFoundError = {
      code: 'PGRST205',
      details: null,
      hint: 'Perhaps you meant the table public.profiles',
      message: "Could not find the table 'public.seller_profiles' in the schema cache",
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await spyServerClient(
      buildOnboardingClient({
        user: { id: 'u1' },
        existingProfile: null,
        selectError: null,
        insertError: { ...notFoundError },
      })
    );

    const res = await postOnboarding({ display_name: 'Ada Author' });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Unable to submit seller application');

        expect(consoleSpy).toHaveBeenCalledWith(
      'seller onboarding insert failed:',
      notFoundError
    );
  });

  it('existing pending profile - 200 (idempotent; client fields ignored)', async () => {
    const existing = {
      user_id: 'u1',
      display_name: 'Original Name',
      business_name: null,
      bio: null,
      status: 'pending',
    };
    await spyServerClient(
      buildOnboardingClient({
        user: { id: 'u1' },
        existingProfile: existing,
        selectError: null,
      })
    );

    const res = await postOnboarding({
      display_name: 'Hacker Name',
      business_name: 'Hacker Biz',
      status: 'approved',
      approved_by: 'u1',
      user_id: 'u1',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seller.status).toBe('pending');
    expect(body.seller.display_name).toBe('Original Name');
    expect(body.message).toMatch(/under review/i);
  });

  it('unauthenticated - 401', async () => {
    await spyServerClient(buildOnboardingClient({ user: null }));

    const res = await postOnboarding({ display_name: 'Ada Author' });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required');
  });

  it('display name too short - 400', async () => {
    await spyServerClient(buildOnboardingClient({ user: { id: 'u1' } }));

    const res = await postOnboarding({ display_name: 'A' });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2.*80 characters/i);
  });

  it('status forced to pending server-side, never client-supplied', async () => {
    const insertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'u1', display_name: 'Ada', status: 'pending' },
          error: null,
        }),
      }),
    });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
            data: { currentLevel: 'aal1', nextLevel: null },
            error: null,
          }),
          listFactors: vi.fn().mockResolvedValue({ data: { all: [], totp: [] }, error: null }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'seller_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: insertFn,
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) };
      }),
    };
    await spyServerClient(client);

    const res = await postOnboarding({
      display_name: 'Ada Author',
      status: 'approved',
      approved_by: 'u1',
      user_id: 'u1',
    });

    expect(res.status).toBe(201);
    const payload = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.status).toBe('pending');
    expect('approved_by' in payload).toBe(false);
    expect('approved_at' in payload).toBe(false);
    expect(payload.user_id).toBe('u1');
  });
});

