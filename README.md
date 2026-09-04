# LittleReads

**Big Adventures for Little Readers**

A production-quality children's ebook ecommerce platform built with Next.js, Supabase, and Paystack.

## Features

- 20 original children's ebooks with real stories and generated PDFs
- Unique SVG cover art for each ebook
- Full ecommerce: browse, cart, checkout, Paystack payment
- Customer dashboard: library, orders, reviews, wishlist
- Admin panel: dashboard, products, orders, customers, reviews
- Supabase PostgreSQL with Row Level Security
- Secure ebook downloads with signed URLs
- Responsive design (mobile/desktop)
- Search, filtering, and sorting

## Requirements

- Node.js 18+
- npm
- Supabase project (free tier works)
- Paystack test account

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration:

```bash
# Copy the migration SQL from supabase/migrations/001_initial_schema.sql
# and paste it into the Supabase SQL Editor, then execute it
```

3. Create storage buckets:
   - `ebook-covers` (public)
   - `ebook-files` (private)

4. Copy your project URL and keys to `.env.local`

## Generate Ebooks & Covers

```bash
npm run generate:covers    # Generate 20 SVG covers
npm run generate:ebooks    # Generate 20 PDF ebooks
npm run validate:ebooks    # Validate all 20 ebooks
```

## Seed Products to Supabase

```bash
npm run seed:books
```

This uploads covers, PDFs, and creates product records in Supabase.

## Create Admin User

1. Register a user through the app
2. In Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id';
```

## Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Windows note:** on Windows, run npm scripts from the exact on-disk casing of the
> project path. If your shell reports the folder as `Desktop` but it is stored as
> `desktop` (or vice versa), the casing mismatch splits Next.js's internal module
> registry and the production build crashes deterministically with
> `Expected workStore to be initialized` (E1068) while prerendering the first static
> page. `cd` to the path exactly as listed on disk (e.g. `cd /c/Users/User/desktop/...`)
> before running `npm run build`.

## Testing

```bash
npm test              # Run unit tests
npm run typecheck     # TypeScript check
npm run lint          # ESLint
npm run build         # Production build
```

## Build

```bash
npm run build
npm start
```

## Paystack Configuration

1. Create a Paystack account at [paystack.com](https://paystack.com)
2. Get test keys from Settings > API Keys
3. Set up webhook URL: `https://your-domain.com/api/webhooks/paystack`
4. Add webhook secret to `PAYSTACK_WEBHOOK_SECRET`

For local testing, use [ngrok](https://ngrok.com) or similar to expose localhost.

## Vercel Deployment

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utilities, Supabase, Paystack
├── types/            # TypeScript types
├── __tests__/        # Unit tests
content/              # Book metadata
scripts/              # Generation scripts
generated/            # Generated covers and PDFs
supabase/             # Database migrations
```

## License

All rights reserved. © 2026 LittleReads
# little_reads
