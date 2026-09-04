export const dynamic = 'force-dynamic';

import { requireAdmin } from '@/lib/auth';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { getPaystackMode } from '@/lib/paystack';

function StatusRow({
  label,
  set,
  hint,
}: {
  label: string;
  set: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {set ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
          <CheckCircle2 className="h-3.5 w-3.5" /> Configured
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
          <XCircle className="h-3.5 w-3.5" /> Missing
        </span>
      )}
    </div>
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  const paystackMode = getPaystackMode();

  const env = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
    paystackPublic: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    paystackSecret: process.env.PAYSTACK_SECRET_KEY,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Configuration</h2>
          <StatusRow label="Site Name" set={!!env.siteName} hint={env.siteName || undefined} />
          <StatusRow label="Site URL" set={!!env.siteUrl} hint={env.siteUrl || undefined} />
          <StatusRow label="Supabase URL" set={!!env.supabaseUrl} />
          <StatusRow label="Supabase Anon Key" set={!!env.supabaseAnon} />
          <StatusRow
            label="Supabase Service Role Key"
            set={!!env.serviceRole}
            hint="Used only server-side — never exposed to the browser"
          />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paystack</h2>
          <StatusRow label="Public Key" set={!!env.paystackPublic} />
          <StatusRow label="Secret Key" set={!!env.paystackSecret} hint="Used server-side for payment initialization and webhook HMAC verification" />

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">Payment Mode</p>
            <span
              className={`badge text-xs ${
                paystackMode === 'TEST'
                  ? 'bg-green-100 text-green-700'
                  : paystackMode === 'LIVE'
                    ? 'bg-red-100 text-red-700'
                    : paystackMode === 'MISSING'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {paystackMode}
            </span>
            {paystackMode === 'LIVE' && (
              <p className="text-xs text-red-600 mt-2">
                LIVE keys detected. Demo deployments must use TEST keys (sk_test_ / pk_test_).
              </p>
            )}
            {paystackMode === 'TEST' && (
              <p className="text-xs text-green-700 mt-2">
                Test mode — safe for demo checkouts. No real charges.
              </p>
            )}
            {paystackMode === 'MISSING' && (
              <p className="text-xs text-gray-500 mt-2">
                Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY to enable checkout.
              </p>
            )}
            {(paystackMode === 'PLACEHOLDER' || paystackMode === 'INVALID') && (
              <p className="text-xs text-yellow-700 mt-2">
                Paystack keys look like placeholders or are mismatched. Checkout is disabled until real TEST keys are set.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 max-w-2xl">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          Secret values are never displayed in this panel. Configuration is managed through
          environment variables in Vercel or your local .env.local file.
        </p>
      </div>
    </div>
  );
}