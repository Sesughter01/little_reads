# Run Doc — LittleReads

## Uncommitted Artifacts
- `.env.local` — already exists in the main checkout; copy if starting fresh from a bare clone.
- `node_modules/` — run `npm install`.
- `generated/covers/` and `generated/ebooks/` — run `npm run generate:covers` then `npm run generate:ebooks`.

## How to Run the Dev Server
1. Copy `.env.local` from the main checkout if it doesn't exist.
2. Run `npm install`.
3. Run `npm run dev` (defaults to port 3000).
