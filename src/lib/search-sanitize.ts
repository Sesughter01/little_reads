/**
 * PostgREST filter-injection hardening.
 *
 * User-supplied search terms are interpolated into Supabase `.or()` filter
 * strings, whose syntax uses commas to separate conditions and parentheses
 * to group them:
 *
 *   .or(`title.ilike.%${search}%,author.ilike.%${search}%`)
 *
 * A search term containing `,` `(` or `)` can therefore inject additional
 * filter conditions or corrupt the query. RLS still bounds what any caller
 * can read, but a crafted term can broaden a single `.or()` clause (e.g.
 * `x),pdf_path.neq.null,(`) or break the request entirely.
 *
 * sanitizeSearchTerm strips those metacharacters (replacing them with
 * spaces so multi-word intent survives), collapses whitespace, caps the
 * length, and returns an empty string when nothing usable remains.
 *
 * Double quotes and backslashes are also stripped: quotes are the value
 * quoting syntax in PostgREST filter grammar (so an unbalanced quote breaks
 * parsing), and a bare trailing backslash is the LIKE escape character
 * (which can error the query in Postgres). Neither adds expressiveness to a
 * book search, so both are normalized away.
 */

/**
 * PostgREST `.or()`/`.and()` grammar that must never reach a filter:
 * commas/parens inject or corrupt conditions, double quotes open value
 * quoting, and backslashes break LIKE escape parsing.
 */
const FILTER_METACHARACTERS = /[(),"\\]/g;

/** Hard cap — deep links are short; oversized junk is not welcome. */
export const MAX_SEARCH_LENGTH = 60;

export function sanitizeSearchTerm(raw: string | null | undefined): string {
  if (!raw) return '';

  const cleaned = raw
    .replace(FILTER_METACHARACTERS, ' ')
    // Collapse runs of whitespace (including the ones we just introduced).
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, MAX_SEARCH_LENGTH);
}
