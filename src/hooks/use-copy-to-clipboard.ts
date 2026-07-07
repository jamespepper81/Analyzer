'use client';

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Copy text to the clipboard and confirm with a toast. Replaces the
 * hand-rolled handleCopy duplicated across detail pages.
 */
export function useCopyToClipboard() {
  const { toast } = useToast();

  return useCallback(
    async (text: string, description?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: 'Copied to clipboard',
          description: description ?? text,
        });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Copy failed',
          description: 'Your browser blocked clipboard access.',
        });
      }
    },
    [toast]
  );
}
