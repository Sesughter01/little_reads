import { z } from 'zod';

/**
 * Shared server-side product input validation used by both the create
 * (POST /api/admin/products) and update (PUT /api/admin/products/[id])
 * endpoints, so the two flows can never drift apart.
 *
 * Field rules mirror the products table constraints:
 *   - price >= 0
 *   - sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)
 *   - age_min <= age_max (0..18)
 */
export const productInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    slug: z
      .string()
      .trim()
      .min(1, 'Slug is required')
      .max(200)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be lowercase letters, numbers and hyphens only'
      ),
    author: z.string().trim().min(1, 'Author is required').max(200),
    short_description: z
      .string()
      .trim()
      .min(1, 'Short description is required')
      .max(500),
    description: z.string().max(10000).optional().default(''),
    price: z
      .number({ error: 'Regular price must be a number' })
      .int('Regular price must be a whole number')
      .min(0, 'Regular price cannot be negative')
      .max(100_000_000, 'Regular price is too large'),
    // Blank → null is handled by the clients before this schema runs; a
    // value of null means "no sale". `0` is deliberately allowed as a free
    // sale price, matching the database CHECK (sale_price >= 0 AND < price).
    sale_price: z
      .number({ error: 'Sale price must be a number' })
      .int('Sale price must be a whole number')
      .min(0, 'Sale price cannot be negative')
      .max(100_000_000, 'Sale price is too large')
      .nullable()
      .optional(),
    age_min: z
      .number()
      .int('Minimum age must be a whole number')
      .min(0, 'Minimum age must be between 0 and 18')
      .max(18, 'Minimum age must be between 0 and 18'),
    age_max: z
      .number()
      .int('Maximum age must be a whole number')
      .min(0, 'Maximum age must be between 0 and 18')
      .max(18, 'Maximum age must be between 0 and 18'),
    reading_level: z.string().trim().max(50).optional().default('Beginner'),
    page_count: z
      .number()
      .int('Page count must be a whole number')
      .min(0, 'Page count cannot be negative')
      .max(10_000, 'Page count is too large')
      .optional()
      .default(0),
    reading_time: z.string().trim().max(50).optional().default('5 min'),
    category_id: z.string().uuid('Invalid category').nullable().optional(),
    featured: z.boolean().optional().default(false),
    published: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.age_max < data.age_min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['age_max'],
        message: 'Maximum age must be greater than or equal to minimum age',
      });
    }

    if (data.sale_price != null) {
      if (data.price === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sale_price'],
          message: 'A free book cannot have a sale price.',
        });
      } else if (data.sale_price < 1) {
        // A ₦0 sale price is indistinguishable from "not on sale" in price
        // snapshots and cannot be charged through Paystack.
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sale_price'],
          message: 'Sale price must be at least 1, or leave it blank for no sale.',
        });
      } else if (data.sale_price >= data.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sale_price'],
          message: 'Sale price must be lower than the regular price.',
        });
      }
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;

/** Flattened, user-facing validation error details (safe to send to clients). */
export function productValidationMessage(
  error: z.ZodError
): { message: string; details: unknown } {
  const firstIssue = error.issues[0];
  return {
    message: firstIssue?.message || 'Invalid product data',
    details: error.flatten(),
  };
}

/**
 * Pure decision helper: is a (price, salePrice) combination valid?
 * Mirrors the database CHECK constraint exactly. Exported for tests.
 */
export function salePriceValidation(
  price: number,
  salePrice: number | null | undefined
): { valid: boolean; message?: string } {
  if (salePrice == null) return { valid: true };
  if (price === 0) {
    return { valid: false, message: 'A free book cannot have a sale price.' };
  }
  if (salePrice < 1) {
    return {
      valid: false,
      message: 'Sale price must be at least 1, or leave it blank for no sale.',
    };
  }
  if (salePrice >= price) {
    return {
      valid: false,
      message: 'Sale price must be lower than the regular price.',
    };
  }
  return { valid: true };
}

/** Parse a form field into an optional integer; blank/whitespace → null. */
export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
}

/** Parse a required form field into an integer; invalid → undefined. */
export function parseRequiredInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return undefined;
  return Math.trunc(num);
}
