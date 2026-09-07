export const ALLOWED_REVIEW_STATUSES = [
  'pending',
  'approved',
  'hidden',
] as const;

export type ReviewModerationStatus =
  (typeof ALLOWED_REVIEW_STATUSES)[number];

export function isValidReviewStatus(
  value: string
): value is ReviewModerationStatus {
  return (ALLOWED_REVIEW_STATUSES as readonly string[]).includes(value);
}