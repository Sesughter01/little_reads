import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Real route-handler tests.
 *
 * Each test invokes the ACTUAL route handler and the ACTUAL server guards
 * (requireUserApi / requireAdminApi) against mocked Supabase modules — the
 * same vi.spyOn harness proven by admin-api-guard.test.ts. These are not
 * simulations: a 401 means the handler really returned 401, a signed-URL
 * redirect really came out of GET, etc.
 */

// ── Harness ───────────────────────────────────────────────────

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

function formWithFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  return form;
}

// ── Avatar API ────────────────────────────────────────────────

describe('POST /api/account/profile/avatar (real route + real requireUserApi)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('anonymous upload → 401 JSON (no NEXT_REDIRECT swallowed as 500)', async () => {
    await spyServerClient(buildAuthClient({ user: null }));
    await spyServiceClient({});
    const { POST } = await import('@/app/api/account/profile/avatar/route');

    const res = await POST(
      new NextRequest('http://localhost/api/account/profile/avatar', {
        method: 'POST',
        body: formWithFile(new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' })),
      })
    );
    expect(res.status).toBe(401);
  });

  it('authenticated invalid MIME → 400', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'u1' }, profile: { id: 'u1', role: 'customer' } })
    );
    await spyServiceClient({});
    const { POST } = await import('@/app/api/account/profile/avatar/route');

    const res = await POST(
      new NextRequest('http://localhost/api/account/profile/avatar', {
        method: 'POST',
        body: formWithFile(new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' })),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/JPEG, PNG, and WebP/i);
  });

  it('authenticated oversized file (>5 MB) → 400', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'u1' }, profile: { id: 'u1', role: 'customer' } })
    );
    await spyServiceClient({});
    const { POST } = await import('@/app/api/account/profile/avatar/route');

    const res = await POST(
      new NextRequest('http://localhost/api/account/profile/avatar', {
        method: 'POST',
        body: formWithFile(
          new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
        ),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
  });

  it('valid JPEG → uploads to user-scoped path, updates profiles, returns avatar_url', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'u1' }, profile: { id: 'u1', role: 'customer' } })
    );

    const upload = vi.fn().mockResolvedValue({ data: { path: 'u1/123.jpg' }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://x.supabase.co/storage/v1/object/public/avatars/u1/123.jpg' },
    });
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const serviceClient = {
      storage: {
        from: vi.fn().mockReturnValue({ upload, getPublicUrl }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({ eq }),
      }),
    };
    await spyServiceClient(serviceClient);

    const { POST } = await import('@/app/api/account/profile/avatar/route');
    const res = await POST(
      new NextRequest('http://localhost/api/account/profile/avatar', {
        method: 'POST',
        body: formWithFile(new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' })),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.avatar_url).toBe('https://x.supabase.co/storage/v1/object/public/avatars/u1/123.jpg');

    // Path must be scoped to the SERVER session user — a client could never
    // choose another user's path.
    const uploadedPath = upload.mock.calls[0][0] as string;
    expect(uploadedPath.startsWith('u1/')).toBe(true);
    expect(upload).toHaveBeenCalledWith(uploadedPath, expect.anything(), {
      contentType: 'image/jpeg',
      upsert: true,
    });
    expect(serviceClient.from).toHaveBeenCalledWith('profiles');
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('profiles DB update failure → 500, no false success', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'u1' }, profile: { id: 'u1', role: 'customer' } })
    );
    const serviceClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'u1/1.jpg' }, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://x/avatars/u1/1.jpg' } }),
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no row' } }),
        }),
      }),
    };
    await spyServiceClient(serviceClient);

    const { POST } = await import('@/app/api/account/profile/avatar/route');
    const res = await POST(
      new NextRequest('http://localhost/api/account/profile/avatar', {
        method: 'POST',
        body: formWithFile(new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })),
      })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).not.toBe(true);
  });

  it('missing avatars bucket → useful setup diagnosis, not a generic 500', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'u1' }, profile: { id: 'u1', role: 'customer' } })
    );
    const serviceClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({
            data: null,
            error: { statusCode: 404, message: 'The resource was not found' },
          }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'x' } }),
        }),
      },
      from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn() }) }),
    };
    await spyServiceClient(serviceClient);

    const { POST } = await import('@/app/api/account/profile/avatar/route');
    const res = await POST(
      new NextRequest('http://localhost/api/account/profile/avatar', {
        method: 'POST',
        body: formWithFile(new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' })),
      })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/avatars.*bucket/i);
  });
});

// ── Admin ebook download ──────────────────────────────────────

describe('GET /api/admin/products/[id]/download (real route + real requireAdminApi)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('anonymous → 401', async () => {
    await spyServerClient(buildAuthClient({ user: null }));
    await spyServiceClient({});
    const { GET } = await import('@/app/api/admin/products/[id]/download/route');

    const res = await GET(
      new NextRequest('http://localhost/api/admin/products/p1/download'),
      { params: Promise.resolve({ id: 'p1' }) }
    );
    expect(res.status).toBe(401);
  });

  it('authenticated customer → 403', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'c1' }, profile: { id: 'c1', role: 'customer' } })
    );
    await spyServiceClient({});
    const { GET } = await import('@/app/api/admin/products/[id]/download/route');

    const res = await GET(
      new NextRequest('http://localhost/api/admin/products/p1/download'),
      { params: Promise.resolve({ id: 'p1' }) }
    );
    expect(res.status).toBe(403);
  });

  it('admin + product with pdf_path → 307 redirect to a signed private URL', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: {
        signedUrl:
          'https://supabase.co/storage/v1/object/sign/ebook-files/ebooks/test.pdf?token=abc',
      },
      error: null,
    });
    const serviceClient = {
      storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { pdf_path: 'ebooks/test.pdf' },
              error: null,
            }),
          }),
        }),
      }),
    };
    await spyServiceClient(serviceClient);

    const { GET } = await import('@/app/api/admin/products/[id]/download/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/products/p1/download'),
      { params: Promise.resolve({ id: 'p1' }) }
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('token=abc');
    // Signed URL comes from the PRIVATE ebook-files bucket — not a public link.
    expect(createSignedUrl).toHaveBeenCalledWith('ebooks/test.pdf', 300);
    expect(res.headers.get('location')).toContain('object/sign/');
  });

  it('admin + product without PDF → 404 with useful message', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    const serviceClient = {
      storage: { from: vi.fn().mockReturnValue({ createSignedUrl: vi.fn() }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { pdf_path: null }, error: null }),
          }),
        }),
      }),
    };
    await spyServiceClient(serviceClient);

    const { GET } = await import('@/app/api/admin/products/[id]/download/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/products/p1/download'),
      { params: Promise.resolve({ id: 'p1' }) }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/does not have an ebook PDF/i);
  });
});

// ── Admin search ──────────────────────────────────────────────

describe('GET /api/admin/search (real route + real requireAdminApi)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('anonymous → 401', async () => {
    await spyServerClient(buildAuthClient({ user: null }));
    await spyServiceClient({});
    const { GET } = await import('@/app/api/admin/search/route');

    const res = await GET(new NextRequest('http://localhost/api/admin/search?q=abc'));
    expect(res.status).toBe(401);
  });

  it('authenticated customer → 403', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'c1' }, profile: { id: 'c1', role: 'customer' } })
    );
    await spyServiceClient({});
    const { GET } = await import('@/app/api/admin/search/route');

    const res = await GET(new NextRequest('http://localhost/api/admin/search?q=abc'));
    expect(res.status).toBe(403);
  });

  it('query shorter than 2 chars → safe empty groups (no DB query)', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    const from = vi.fn();
    await spyServiceClient({ from });

    const { GET } = await import('@/app/api/admin/search/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/search?q=a'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.books).toEqual([]);
    expect(body.orders).toEqual([]);
    expect(body.customers).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('admin query → matching product/order/customer groups without sensitive fields', async () => {
    await spyServerClient(
      buildAuthClient({ user: { id: 'a1' }, profile: { id: 'a1', role: 'admin' } })
    );
    const serviceClient = {
      from: vi.fn().mockImplementation((table: string) => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(
              table === 'products'
                ? { data: [{ id: 'p1', title: 'Adventure', author: 'A. Writer', slug: 'adventure', published: true }], error: null }
                : table === 'orders'
                  ? { data: [{ id: 'o1', customer_name: 'Ada', customer_email: 'ada@x.com', paystack_reference: 'REF-123', status: 'pending', total: 3000 }], error: null }
                  : { data: [{ id: 'c1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@x.com' }], error: null }
            ),
          }),
        }),
      })),
    };
    await spyServiceClient(serviceClient);

    const { GET } = await import('@/app/api/admin/search/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/search?q=ada'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.books[0]).toMatchObject({ id: 'p1', title: 'Adventure' });
    expect(body.books[0].href).toBe('/admin/products/p1/edit');
    expect(body.orders[0]).toMatchObject({ paystack_reference: 'REF-123', status: 'pending' });
    expect(body.orders[0].href).toBe('/admin/orders/o1');
    expect(body.customers[0]).toMatchObject({ name: 'Ada Lovelace', email: 'ada@x.com' });
    expect(body.customers[0].href).toBe('/admin/customers/c1');

    // Never expose auth/sensitive fields in search results.
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/password|refresh_token|access_token|service_role|secret/i);
  });
});

// ── Newsletter duplicate handling ─────────────────────────────

describe('POST /api/newsletter (real route)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function newsletterServiceClient(opts: {
    existing?: { id: string; status: string } | null;
    insertError?: { code: string; message: string } | null;
    reactivateError?: { code: string; message: string } | null;
  }) {
    const insert = vi.fn().mockResolvedValue({ data: null, error: opts.insertError ?? null });
    const reactivateEq = vi
      .fn()
      .mockResolvedValue({ data: null, error: opts.reactivateError ?? null });
    return {
      insert,
      reactivateEq,
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== 'newsletter_subscribers') {
          return { select: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: opts.existing ?? null, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: reactivateEq }),
          insert,
        };
      }),
    };
  }

  async function postNewsletter(email: string) {
    const { POST } = await import('@/app/api/newsletter/route');
    return POST(
      new NextRequest('http://localhost/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  it('first-time (normalized) email → "Successfully subscribed!" and inserted', async () => {
    const serviceClient = newsletterServiceClient({ existing: null });
    await spyServiceClient(serviceClient);

    const res = await postNewsletter('  Reader@Test.com  ');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('Successfully subscribed!');
    // Insert receives the trimmed, lowercased email — never the raw input.
    expect(serviceClient.from).toHaveBeenCalledWith('newsletter_subscribers');
    expect(serviceClient.insert.mock.calls[0][0]).toMatchObject({
      email: 'reader@test.com',
      status: 'active',
    });
  });

  it('same email (different casing) → "You are already subscribed.", no second insert', async () => {
    const serviceClient = newsletterServiceClient({
      existing: { id: 's1', status: 'active' },
    });
    await spyServiceClient(serviceClient);

    const res = await postNewsletter('READER@test.com');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('You are already subscribed.');
    expect(serviceClient.insert).not.toHaveBeenCalled();
  });

  it('same email with surrounding whitespace → "You are already subscribed."', async () => {
    const serviceClient = newsletterServiceClient({
      existing: { id: 's1', status: 'active' },
    });
    await spyServiceClient(serviceClient);

    const res = await postNewsletter('   reader@test.com   ');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('You are already subscribed.');
  });

  it('UNIQUE race (23505 on insert) → "You are already subscribed.", not 500', async () => {
    const serviceClient = newsletterServiceClient({
      existing: null,
      insertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    await spyServiceClient(serviceClient);

    const res = await postNewsletter('reader@test.com');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('You are already subscribed.');
  });

  it('invalid email → 400', async () => {
    await spyServiceClient(newsletterServiceClient({ existing: null }));
    const res = await postNewsletter('not-an-email');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid email/i);
  });
});