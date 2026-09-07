'use client';

import { useEffect } from 'react';
import { ErrorContent } from '@/components/layout/error-content';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return <ErrorContent onReset={reset} />;
}
