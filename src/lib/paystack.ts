import type { PaystackInitializeResponse, PaystackVerifyResponse } from '@/types';
import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const PLACEHOLDER_SECRET_PATTERNS = [
  'your_secret_key',
  'sk_test_xxx',
  'sk_live_xxx',
  'replace_me',
  'sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
];

const PLACEHOLDER_PUBLIC_PATTERNS = [
  'your_public_key',
  'pk_test_xxx',
  'pk_live_xxx',
  'replace_me',
  'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
];

export type PaystackMode =
  | 'TEST'
  | 'LIVE'
  | 'PLACEHOLDER'
  | 'INVALID'
  | 'MISSING';

/**
 * Classifies the configured Paystack keys without exposing their values.
 * Demo deployments must use TEST mode (pk_test_ / sk_test_).
 */
export function getPaystackMode(): PaystackMode {
  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  if (!secret || !publicKey) return 'MISSING';

  const secretLooksPlaceholder = PLACEHOLDER_SECRET_PATTERNS.some((p) =>
    secret.includes(p)
  );
  const publicLooksPlaceholder = PLACEHOLDER_PUBLIC_PATTERNS.some((p) =>
    publicKey.includes(p)
  );
  if (secretLooksPlaceholder || publicLooksPlaceholder) return 'PLACEHOLDER';

  const secretOk = secret.startsWith('sk_test_') || secret.startsWith('sk_live_');
  const publicOk = publicKey.startsWith('pk_test_') || publicKey.startsWith('pk_live_');
  if (!secretOk || !publicOk) return 'INVALID';

  const secretTest = secret.startsWith('sk_test_');
  const publicTest = publicKey.startsWith('pk_test_');
  if (secretTest || publicTest) {
    return secretTest && publicTest ? 'TEST' : 'INVALID';
  }
  return 'LIVE';
}

/**
 * True only when a real, usable secret key is configured (never a placeholder).
 */
export function isPaystackConfigured(): boolean {
  const mode = getPaystackMode();
  return mode === 'TEST' || mode === 'LIVE';
}

function getSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY || '';
}

/** Paystack API calls must never hang a checkout/webhook/sweep worker. */
const PAYSTACK_TIMEOUT_MS = 10_000;

/**
 * fetch() with a hard timeout.
 *
 * A stalled Paystack connection inside the webhook path would hold the
 * worker open, return 500 to Paystack, and trigger retry amplification.
 * Network failures and timeouts surface as typed { status: false }
 * responses at the call sites instead of throws.
 */
async function paystackFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function initializePaystackTransaction(params: {
  email: string;
  amount: number; // In kobo (smallest currency unit)
  reference: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}): Promise<PaystackInitializeResponse> {
  try {
    const response = await paystackFetch(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amount,
          reference: params.reference,
          metadata: params.metadata || {},
          callback_url: params.callback_url,
          currency: 'NGN',
        }),
      }
    );

    return parsePaystackJson<PaystackInitializeResponse>(response);
  } catch {
    // Timeout (abort) or network-level failure — typed failure, not a throw.
    return {
      status: false,
      message: 'Paystack is unreachable (network error or timeout)',
    } as PaystackInitializeResponse;
  }
}

/**
 * Parse a Paystack API response without ever throwing.
 *
 * When Paystack rate-limits (429) or errors with an HTML/plain-text body
 * (502/503 pages from its edge), `response.json()` throws — and in the
 * webhook and sweep paths that throw was surfaced as a generic 500 instead
 * of a typed, retryable failure. This helper converts any non-JSON body or
 * network-level failure into a well-formed { status: false } response so
 * callers keep their normal failure handling.
 */
async function parsePaystackJson<T extends { status: boolean; message: string }>(
  response: Response
): Promise<T> {
  try {
    const bodyText = await response.text();
    const parsed = JSON.parse(bodyText) as T;
    if (typeof parsed.status !== 'boolean') {
      return {
        status: false,
        message: `Unexpected Paystack response shape (HTTP ${response.status})`,
      } as T;
    }
    return parsed;
  } catch {
    return {
      status: false,
      message: `Paystack returned a non-JSON response (HTTP ${response.status})`,
    } as T;
  }
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  try {
    // Reference is echoed into a URL path — encode it (defense in depth;
    // the LR-<ts>-<rand> format is already path-safe).
    const response = await paystackFetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return parsePaystackJson<PaystackVerifyResponse>(response);
  } catch {
    // Timeout (abort) or network-level failure — typed failure so the
    // webhook/caller keeps its normal retry semantics.
    return {
      status: false,
      message: 'Paystack is unreachable (network error or timeout)',
    } as PaystackVerifyResponse;
  }
}

/**
 * Generate a unique order reference.
 *
 * The random portion MUST be unpredictable: the reference doubles as the
 * identifier a fulfillment is keyed on, and Math.random() is not a CSPRNG
 * (predictable output could let an attacker pre-guess pending references).
 * crypto.randomBytes gives a 48-bit random suffix on top of the timestamp.
 */
export function generateOrderReference(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex').slice(0, 6);
  return `LR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Verify a Paystack webhook signature.
 *
 * Paystack signs webhooks with HMAC-SHA512 of the raw request body using the
 * account secret key (PAYSTACK_SECRET_KEY). We intentionally do not depend on
 * a separate PAYSTACK_WEBHOOK_SECRET environment variable.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  const secret = getSecretKey();
  if (!signature || !secret) return false;

  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');

  // Compare equal-length buffers in constant time. Besides being safer than a
  // normal string comparison, the length guard prevents timingSafeEqual from
  // throwing on malformed signatures.
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// Price in Naira to Paystack kobo
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

// Paystack kobo to Naira display
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}