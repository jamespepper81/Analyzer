'use client';

import type { ReactNode } from 'react';
import { CircleAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shared "not found / nothing here" state for detail pages. `action`
 * overrides the default back button when a page needs custom navigation.
 */
export function EmptyState({
  title,
  message,
  onBack,
  action,
}: {
  title: string;
  message?: string | null;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <CircleAlert className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-bold">{title}</h1>
      {message && <p className="max-w-md text-muted-foreground">{message}</p>}
      {action ??
        (onBack && (
          <Button onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ))}
    </div>
  );
}
