# LittleReads UI Change Rules

Every UI task must follow these rules.

## Before editing

1. Read docs/UI_DIRECTION.md.
2. Inspect only the routes/components relevant to the requested batch.
3. Run git status.
4. Identify which files need modification.
5. Do not expand scope.

## Backend freeze

Unless explicitly requested, do not modify:

src/app/api/**
src/lib/paystack*
src/lib/fulfillment*
src/lib/supabase/**
supabase/**
middleware.ts

Do not run migrations.

Do not use Supabase CLI.

Do not modify payment behavior.

## Existing functionality

UI work must preserve:

- authentication
- registration
- customer accounts
- library
- downloads
- wishlist
- reviews
- products
- categories
- admin authentication
- admin product management
- customer management
- order viewing
- newsletter
- search

## Scope limit

One UI batch at a time.

If a batch requires changing unrelated backend/business logic:

STOP and report the reason.

Do not make the unrelated change automatically.

## Diff control

Before committing run:

git status --short
git diff --stat
git diff --name-status
git diff --check

If unrelated files changed:

revert only those unintended changes.

Never use:

git reset --hard

Never use:

git add .

## Quality gates

Run:

npm run typecheck
npm test
rm -rf .next
npm run build

All must pass before committing.

## Git

Work only on:

preview/littlereads

Never push main during UI development.

Never force push.

Commit/push identity:

Sesughter01