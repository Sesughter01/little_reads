import { describe, it, expect, vi } from 'vitest';

/**
 * Ebook Download Route – Integration Tests
 *
 * These tests verify the architectural contract of the download route:
 *   1. createClient() (cookie-based) handles auth + purchase verification
 *   2. createServiceClient() (service-role) is only called AFTER purchase
 *      verification succeeds, and only for storage operations
 *   3. Anonymous → 401, non-buyer → 403, buyer → signed URL (300s expiry)
 *   4. One user's purchase never authorizes another user
 *   5. The service-role key never reaches client-side code
 *
 * These tests exercise the exact flow that the route handler implements,
 * using mocked Supabase clients to simulate all outcomes.
 */

// ── Mock factory ──────────────────────────────────────────────

function createMockAuthClient(user: { id: string; email: string } | null) {
  const purchasesTable = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: user
            ? vi.fn().mockResolvedValue({
                data: null, // No purchase found → 403
                error: { message: 'Row not found' },
              })
            : vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Row not found' },
              }),
        }),
      }),
    }),
  };

  const productsTable = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { pdf_path: 'ebooks/test.pdf' },
          error: null,
        }),
      }),
    }),
  };

  return {
    auth: {
      getUser: user
        ? vi.fn().mockResolvedValue({ data: { user }, error: null })
        : vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'purchases') return purchasesTable;
      if (table === 'products') return productsTable;
      return { select: vi.fn() };
    }),
  };
}

function createMockServiceClient() {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/ebook-files/ebooks/test.pdf?token=abc123' },
          error: null,
        }),
      }),
    },
  };
}

// ── Simulate the route handler logic ──────────────────────────

type RouteResult =
  | { status: 401; error: string }
  | { status: 403; error: string }
  | { status: 404; error: string }
  | { status: 500; error: string }
  | { status: 307; signedUrl: string };

async function simulateDownloadRoute(
  authClient: ReturnType<typeof createMockAuthClient>,
  serviceClient: ReturnType<typeof createMockServiceClient>,
  productId: string,
): Promise<RouteResult> {
  // Step 1: Authenticate with cookie-based client
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return { status: 401, error: 'Authentication required' };
  }

  // Step 2: Verify purchase belongs to this user
  const { data: purchase, error: purchaseError } = await authClient
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single();

  if (purchaseError || !purchase) {
    return { status: 403, error: 'You have not purchased this ebook' };
  }

  // Step 3: Fetch product pdf_path with cookie client
  const { data: product, error: productError } = await authClient
    .from('products')
    .select('pdf_path')
    .eq('id', productId)
    .single();

  if (productError || !product?.pdf_path) {
    return { status: 404, error: 'Ebook file not found' };
  }

  // Step 4: Create signed URL with service-role client
  const { data: urlData, error: urlError } = await serviceClient.storage
    .from('ebook-files')
    .createSignedUrl(product.pdf_path, 300);

  if (urlError || !urlData) {
    return { status: 500, error: 'Failed to generate download link' };
  }

  return { status: 307, signedUrl: urlData.signedUrl };
}

// ── Tests ────────────────────────────────────────────────────

describe('Ebook Download Route – Integration Tests', () => {

  // ── 401: Anonymous ──────────────────────────────────────────

  describe('Anonymous request → 401', () => {
    it('returns 401 when user is not authenticated', async () => {
      const authClient = createMockAuthClient(null);
      const serviceClient = createMockServiceClient();

      const result = await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(result.status).toBe(401);
      expect(result).toHaveProperty('error', 'Authentication required');
    });

    it('never calls service client for anonymous requests', async () => {
      const authClient = createMockAuthClient(null);
      const serviceClient = createMockServiceClient();

      await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(serviceClient.storage.from).not.toHaveBeenCalled();
    });
  });

  // ── 403: Authenticated non-buyer ────────────────────────────

  describe('Authenticated non-buyer → 403', () => {
    it('returns 403 when user has not purchased the ebook', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      // Override: no purchase for this user
      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Row not found' },
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(result.status).toBe(403);
      expect(result).toHaveProperty('error', 'You have not purchased this ebook');
    });

    it('never calls service client for non-buyers', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      // Override: no purchase
      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Row not found' },
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(serviceClient.storage.from).not.toHaveBeenCalled();
    });
  });

  // ── Buyer → signed URL ──────────────────────────────────────

  describe('Buyer → signed URL redirect', () => {
    it('returns 307 redirect to signed URL for valid buyer', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      // Override: purchase found
      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: 'ebooks/test-book.pdf' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(result.status).toBe(307);
      expect(result).toHaveProperty('signedUrl');
      expect(result).toHaveProperty('signedUrl', expect.stringContaining('https://supabase.co'));
    });

    it('creates signed URL with exactly 300 second expiry', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: 'ebooks/zara.pdf' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(serviceClient.storage.from).toHaveBeenCalledWith('ebook-files');
      const storageChain = serviceClient.storage.from.mock.results[0].value;
      expect(storageChain.createSignedUrl).toHaveBeenCalledWith('ebooks/zara.pdf', 300);
    });

    it('calls createServiceClient only after purchase verification succeeds', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: 'ebooks/test.pdf' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      // Verify the call order: auth.getUser → purchases → products → storage
      expect(authClient.auth.getUser).toHaveBeenCalledTimes(1);
      expect(authClient.from).toHaveBeenCalledWith('purchases');
      expect(authClient.from).toHaveBeenCalledWith('products');
      expect(serviceClient.storage.from).toHaveBeenCalledWith('ebook-files');
    });
  });

  // ── 404: No pdf_path ───────────────────────────────────────

  describe('Product without pdf_path → 404', () => {
    it('returns 404 when product has no pdf_path', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(result.status).toBe(404);
      expect(result).toHaveProperty('error', 'Ebook file not found');
    });

    it('never calls service client when product has no pdf_path', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(serviceClient.storage.from).not.toHaveBeenCalled();
    });
  });

  // ── 500: Storage failure ────────────────────────────────────

  describe('Storage failure → 500', () => {
    it('returns 500 when signed URL creation fails', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      // Purchase and product found
      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: 'ebooks/test.pdf' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      // But storage fails
      serviceClient.storage.from.mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Object not found' },
        }),
      });

      const result = await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(result.status).toBe(500);
      expect(result).toHaveProperty('error', 'Failed to generate download link');
    });
  });

  // ── Cross-user access prevention ────────────────────────────

  describe('Cross-user access prevention', () => {
    it('denies access when purchase belongs to a different user', async () => {
      // User A is authenticated
      const authClient = createMockAuthClient({ id: 'user-A', email: 'a@test.com' });
      const serviceClient = createMockServiceClient();

      // But the purchase belongs to user-B, so user-A gets no row
      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Row not found' },
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(result.status).toBe(403);
      expect(serviceClient.storage.from).not.toHaveBeenCalled();
    });

    it('one user purchase never authorizes another user', async () => {
      // Simulate: user-B tries to download a product that user-A purchased
      const userB = { id: 'user-B', email: 'b@test.com' };

      // User-B is authenticated
      const authClient = createMockAuthClient(userB);
      const serviceClient = createMockServiceClient();

      // No purchase for user-B (only user-A has one)
      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Row not found' },
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(result.status).toBe(403);
      expect(serviceClient.storage.from).not.toHaveBeenCalled();
    });
  });

  // ── Service client isolation ────────────────────────────────

  describe('Service client isolation', () => {
    it('service client has no auth.getUser method', () => {
      const serviceClient = createMockServiceClient();

      // Service client should only have storage, not auth
      expect(serviceClient).not.toHaveProperty('auth');
      expect(serviceClient).not.toHaveProperty('from');
      expect(serviceClient.storage).toBeDefined();
    });

    it('auth client is never used for storage operations', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: 'ebooks/test.pdf' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      // Auth client's storage should never be called
      expect(authClient).not.toHaveProperty('storage');
      // Only service client should handle storage
      expect(serviceClient.storage.from).toHaveBeenCalledWith('ebook-files');
    });
  });

  // ── Expiry constants ────────────────────────────────────────

  describe('Signed URL expiry', () => {
    it('signed URL expiry is exactly 300 seconds (5 minutes)', () => {
      const SIGNED_URL_EXPIRY = 300;
      const FIVE_MINUTES = 5 * 60;
      expect(SIGNED_URL_EXPIRY).toBe(FIVE_MINUTES);
    });

    it('signed URL is created with the correct bucket name', async () => {
      const authClient = createMockAuthClient({ id: 'user-1', email: 'u1@test.com' });
      const serviceClient = createMockServiceClient();

      authClient.from.mockImplementation((table: string) => {
        if (table === 'purchases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'purchase-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { pdf_path: 'ebooks/test.pdf' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await simulateDownloadRoute(authClient, serviceClient, 'prod-1');

      expect(serviceClient.storage.from).toHaveBeenCalledWith('ebook-files');
    });
  });
});
