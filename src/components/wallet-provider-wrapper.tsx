'use client';

import type { ReactNode } from 'react';
import { WalletProvider } from '@/contexts/wallet-context';

type WalletProviderWrapperProps = {
  children: ReactNode;
  testXpub?: string;
};

export function WalletProviderWrapper({ children, testXpub }: WalletProviderWrapperProps) {
  return <WalletProvider testXpub={testXpub}>{children}</WalletProvider>;
}
