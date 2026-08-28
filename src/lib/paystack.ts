import type { PaystackInitializeResponse, PaystackVerifyResponse } from '@/types';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

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
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
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

  return response.json();
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.json();
}

export function generateOrderReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `LR-${timestamp}-${random}`.toUpperCase();
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature || !process.env.PAYSTACK_WEBHOOK_SECRET) return false;

  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return hash === signature;
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
