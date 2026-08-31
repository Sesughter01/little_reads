'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0, background: '#FFF8F0', color: '#111827' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>An unexpected error occurred.</p>
          <button
            onClick={() => reset()}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: '#7C3AED', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
