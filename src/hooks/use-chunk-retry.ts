'use client';

import { useEffect } from 'react';

export function useChunkRetry() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error;
      
      // Check if it's a chunk loading error
      if (
        error &&
        (error.message?.includes('Loading chunk') ||
         error.message?.includes('ChunkLoadError') ||
         error.name === 'ChunkLoadError')
      ) {
        console.warn('Chunk loading error detected, retrying...', error);
        
        // Retry loading the chunk after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    // Listen for unhandled errors
    window.addEventListener('error', handleChunkError);

    // Also listen for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      if (
        reason &&
        (reason.message?.includes('Loading chunk') ||
         reason.message?.includes('ChunkLoadError') ||
         reason.name === 'ChunkLoadError')
      ) {
        console.warn('Chunk loading promise rejection detected, retrying...', reason);
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
