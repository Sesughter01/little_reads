// TEMP read-only migration-state probe (deleted after use).
// Uses only GET requests with the anon key — no writes, no schema changes.
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const key = (env.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m) || [])[1]?.trim() || '';
const base = (env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m) || [])[1]?.trim() || '';

const paths = [
  // 007 markers
  'seller_profiles?select=user_id&limit=1',
  'public_sellers?select=user_id&limit=1',
  'products?select=seller_id&limit=1',
  'products?select=workflow_status&limit=1',
  'order_items?select=seller_id&limit=1',
  // 005 marker
  'public_profiles_public?select=id&limit=1',
  // 006 marker (blanket policy removed => anon sees 0 rows)
  'profiles?select=id&limit=1',
  // sanity: anonymous storefront read still works
  'products?select=id&limit=1',
];

const lines = [`base=${base}`, `keyPresent=${Boolean(key)}`];
for (const p of paths) {
  try {
    const res = await fetch(`${base}/rest/v1/${p}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const text = await res.text();
    lines.push(`PATH: ${p}\nHTTP: ${res.status}\nBODY: ${text.replace(/\s+/g, ' ').slice(0, 240)}\n---`);
  } catch (err) {
    lines.push(`PATH: ${p}\nERROR: ${err.message}\n---`);
  }
}
fs.writeFileSync('tmp-db-probe.txt', lines.join('\n'), 'utf8');
console.log('probe written');