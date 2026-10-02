# LittleReads Geo Worker — FOUNDATION ONLY (no deployment)

## What it does

Returns a coarse country code for a visitor using Cloudflare's edge signal:

```json
{ "country": "NG" }
```

It deliberately returns:

- country code only (2 uppercase letters, or `XX` when unknown)
- **nothing else** — no latitude/longitude, city, ASN, or precise location

## Why it exists

The storefront shows approximate local-currency prices. Country detection uses
this priority:

1. `cf-ipcountry` (when the domain is proxied through Cloudflare)
2. `x-vercel-ip-country` (Vercel-hosted requests)
3. manual currency preference cookie (`lr_currency`)
4. NGN fallback

This worker is the optional source for #1. **The application works without
it** — server code already falls back gracefully.

## Files

- `src/worker.ts` — Worker source
- `wrangler.toml` — configuration template

## Deploying (NOT part of this task — requires separate approval)

1. Do **not** proxy the main storefront domain through Cloudflare yet.
2. When approved, deploy the worker to a separate hostname, e.g.
   `geo.littlereads.com.ng` or a `workers.dev` subdomain.
3. Add `ALLOWED_ORIGIN` to match the calling site.
4. Point the app at it later by adding an optional `GEO_WORKER_URL` env var
   (the app does not read Cloudflare's request headers from a separate
   subdomain, so the worker response crosses origins with CORS).

## Safety

- No secrets, API tokens, or PII.
- No DNS changes, no domain proxying, no Vercel configuration changes.
- Cloudflare CLI login / `wrangler deploy` is **out of scope** until approved.