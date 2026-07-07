'use client';

import { useEffect } from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RootError] Unhandled application error', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center shadow-sm">
        <CircleAlert className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden="true" />
        <h2 className="mb-1 text-lg font-bold text-foreground">Something went wrong</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          An unexpected error occurred. Reloading usually fixes this.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
