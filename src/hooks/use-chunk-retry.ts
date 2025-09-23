'use client';

import { useEffect } from 'react';
import { handleChunkError } from '@/lib/chunk-retry-service';

export function useChunkRetry() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      handleChunkError(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleChunkError(event.reason);
    };

    // Listen for unhandled errors
    window.addEventListener('error', handleError);

    // Also listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
