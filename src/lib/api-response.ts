/**
 * Safe API response helpers.
 *
 * Platform edges (Vercel 413, proxy 502, redirects, empty bodies) may return
 * HTML / plain text / empty responses where the app normally returns JSON.
 * A bare `await response.json()` then throws `Unexpected token...` and hides
 * the real error. These helpers never throw a JSON parser error at the user.
 *
 * - JSON content-type  → parse JSON safely (null on failure)
 * - otherwise          → read text safely, truncated, with status-based fallback
 * - empty body         → sensible fallback message per status
 */

/** True when the response claims to be JSON (charset suffix allowed). */
export function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

function fallbackForStatus(status: number): string {
  if (status === 413) return 'Upload too large. The file was rejected before reaching LittleReads. Try a smaller or compressed PDF (max 50MB).';
  if (status === 404) return 'Not found. The requested resource does not exist.';
  if (status === 401) return 'Not authenticated. Please sign in and try again.';
  if (status === 403) return 'Forbidden. You do not have permission for this action.';
  if (status >= 500) return 'Server error. Please try again in a moment.';
  return 'Request failed. Please try again.';
}

/**
 * Parse a JSON response safely. Returns null (never throws) when the body
 * is not valid JSON — e.g. an HTML 413 page from the hosting platform.
 */
export async function parseApiJson<T>(response: Response): Promise<T | null> {
  try {
    if (!isJsonResponse(response)) return null;
    const data = (await response.json().catch(() => null)) as T | null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Extract a user-facing error message from any response without throwing.
 * Prefers `error` / `message` fields from JSON bodies; falls back to trimmed
 * plain text (truncated) or a status-based message for empty bodies.
 */
export async function readApiError(
  response: Response,
  fallback?: string
): Promise<string> {
  const defaultMessage = fallback || fallbackForStatus(response.status);
  try {
    if (isJsonResponse(response)) {
      const data = (await response.json().catch(() => null)) as {
        error?: unknown;
        message?: unknown;
      } | null;
      if (data) {
        if (typeof data.error === 'string' && data.error.trim()) {
          return data.error.trim();
        }
        if (typeof data.message === 'string' && data.message.trim()) {
          return data.message.trim();
        }
      }
      return defaultMessage;
    }
    const text = (await response.text().catch(() => '')).trim();
    if (!text) return defaultMessage;
    // HTML error pages are not user-facing messages — collapse to fallback.
    if (/^\s*<(html|!doctype)/i.test(text)) return defaultMessage;
    return text.length > 300 ? `${text.slice(0, 300)}…` : text;
  } catch {
    return defaultMessage;
  }
}
