'use client';

import type { ReactElement } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';

/**
 * Shared guard for pages that need wallet data before rendering. Returns
 * the loading/error fallback to render, or null when data is ready:
 *
 *   const guard = useWalletDataGuard();
 *   if (guard) return guard;
 */
export function useWalletDataGuard(): ReactElement | null {
  const { activeXpub, data, isLoading, error } = useWallet();

  if (!activeXpub) return <FullPageLoader />;
  if (isLoading && !data) return <FullPageLoader />;
  if (error && !data) return <ErrorDisplay message={error} />;
  if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;
  return null;
}
