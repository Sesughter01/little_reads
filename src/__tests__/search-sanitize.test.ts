import { describe, it, expect } from 'vitest';
import { sanitizeSearchTerm } from '@/lib/search-sanitize';

describe('sanitizeSearchTerm', () => {
  it('passes ordinary search terms through unchanged', () => {
    expect(sanitizeSearchTerm('adventure stories')).toBe('adventure stories');
    expect(sanitizeSearchTerm('  Ada  ')).toBe('Ada');
  });

  it('strips PostgREST filter metacharacters', () => {
    // Comma would inject an additional filter condition.
    expect(sanitizeSearchTerm('a),pdf_path.neq.null,b')).not.toContain(',');
    expect(sanitizeSearchTerm('a),pdf_path.neq.null,b')).not.toContain('(');
    expect(sanitizeSearchTerm('a),pdf_path.neq.null,b')).not.toContain(')');
  });

  it('replaces metacharacters with spaces so multi-word intent survives', () => {
    expect(sanitizeSearchTerm('foo,bar')).toBe('foo bar');
    expect(sanitizeSearchTerm('foo)(bar')).toBe('foo bar');
  });

  it('collapses whitespace runs introduced by stripping', () => {
    expect(sanitizeSearchTerm('a,,,(b')).toBe('a b');
  });

  it('caps length at 60 characters', () => {
    const long = 'x'.repeat(200);
    expect(sanitizeSearchTerm(long).length).toBe(60);
  });

  it('returns empty string for null/undefined/metacharacter-only input', () => {
    expect(sanitizeSearchTerm(null)).toBe('');
    expect(sanitizeSearchTerm(undefined)).toBe('');
    expect(sanitizeSearchTerm(',,,')).toBe('');
    expect(sanitizeSearchTerm('   ')).toBe('');
  });

  it('strips double quotes (value-quoting hazard in filter grammar)', () => {
    expect(sanitizeSearchTerm('a"b')).toBe('a b');
    // Dots are NOT PostgREST grammar — they survive (harmless).
    expect(sanitizeSearchTerm('"title.eq.admin"')).toBe('title.eq.admin');
    expect(sanitizeSearchTerm('"')).toBe('');
  });

  it('strips backslashes (LIKE escape hazard)', () => {
    expect(sanitizeSearchTerm('a\\b')).toBe('a b');
    // A trailing backslash becomes a space that trim() removes — the text
    // content (incl. "C:") survives.
    expect(sanitizeSearchTerm('C:\\')).toBe('C:');
    expect(sanitizeSearchTerm('C:\\x')).toBe('C: x');
    expect(sanitizeSearchTerm('\\\\')).toBe('');
  });

  it('neutralizes SQL-like fragments to plain text (no injection surfaces)', () => {
    const out = sanitizeSearchTerm("x' OR 1=1 --");
    expect(out).not.toContain(',');
    expect(out).not.toContain('(');
    expect(out).not.toContain(')');
    expect(out).not.toContain('"');
    expect(out).not.toContain('\\');
    // Single quotes are not PostgREST grammar — they stay as harmless text.
    expect(out).toContain("'");
  });

  it('strips PostgREST operator sequences used in filter injection', () => {
    const out = sanitizeSearchTerm('a),pdf_path.neq.null,and,(b');
    expect(out).not.toMatch(/[(),]/);
    expect(out).toBe('a pdf_path.neq.null and b');
  });

  it('handles unicode control characters without throwing', () => {
    const out = sanitizeSearchTerm('abc\u0000\u0001\u001fdef');
    expect(typeof out).toBe('string');
  });

  it('caps very long values regardless of content', () => {
    const long = 'x'.repeat(5_000);
    expect(sanitizeSearchTerm(long).length).toBe(60);
    const longJunk = `${'x'.repeat(5_000)},${'y'.repeat(5_000)}`;
    expect(sanitizeSearchTerm(longJunk).length).toBeLessThanOrEqual(60);
  });
});
