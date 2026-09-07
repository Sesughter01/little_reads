/**
 * Resolve where a sign-out should land. Admin contexts pass
 * redirectTo="/admin/login"; customer contexts omit it and default to /.
 *
 * Kept as a tiny pure module (no React/lucide imports) so the destination
 * contract is cheap and deterministic to test.
 */
export function resolveSignOutDestination(redirectTo?: string): string {
  return redirectTo ?? '/';
}