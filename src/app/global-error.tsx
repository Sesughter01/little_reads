'use client';

/**
 * Global error boundary (outside the root layout — html/body are provided
 * here). Kept minimal and inline-styled because global-error.tsx renders
 * even when the app shell itself fails to load.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'system-ui' }}>
          <h2>Something went wrong</h2>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
