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

export async function initializePaystackTransaction(params: {
  email: string;
  amount: number; // In kobo (smallest currency unit)
  reference: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}): Promise<PaystackInitializeResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
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
  });

  return parsePaystackJson<PaystackInitializeResponse>(response);
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
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return parsePaystackJson<PaystackVerifyResponse>(response);
}

export function generateOrderReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
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