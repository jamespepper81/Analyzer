import { describe, expect, it } from 'vitest';

import { classifyTransaction } from '../src/lib/tax-calculations';
import { Transaction } from '../src/lib/types';

const walletAddresses = new Set(['wallet-address-1', 'wallet-address-2']);

const baseTransaction: Omit<Transaction, 'btc' | 'type' | 'fromAddress' | 'toAddress'> = {
  id: 'tx-1',
  date: '2024-01-01T00:00:00Z',
  status: 'Confirmed',
  confirmations: 6,
  fee: 1000,
  size: 250,
  weight: 1000,
  version: 2,
  locktime: 0,
  rbf: false,
  blockHeight: 800000,
  inputs: [],
  outputs: [],
  totalValue: 0,
};

describe('classifyTransaction', () => {
  it('identifies self-transfers when funds move between own addresses', () => {
    const tx: Transaction = {
      ...baseTransaction,
      btc: 0.5,
      type: 'Received',
      fromAddress: ['wallet-address-1'],
      toAddress: ['wallet-address-2'],
    };

    const classification = classifyTransaction(tx, walletAddresses);

    expect(classification).toEqual({
      isTaxable: false,
      category: 'SELF_TRANSFER',
    });
  });

  it('treats incoming BTC from external addresses as taxable acquisitions', () => {
    const tx: Transaction = {
      ...baseTransaction,
      btc: 1.25,
      type: 'Received',
      fromAddress: ['external-address'],
      toAddress: ['wallet-address-1'],
    };

    const classification = classifyTransaction(tx, walletAddresses);

    expect(classification).toEqual({
      isTaxable: true,
      category: 'ACQUISITION',
    });
  });

  it('flags BTC sent to external addresses as taxable disposals', () => {
    const tx: Transaction = {
      ...baseTransaction,
      btc: -0.3,
      type: 'Sent',
      fromAddress: ['wallet-address-1'],
      toAddress: ['wallet-address-2', 'external-destination'],
    };

    const classification = classifyTransaction(tx, walletAddresses);

    expect(classification).toEqual({
      isTaxable: true,
      category: 'DISPOSAL',
      disposalType: 'SALE',
    });
  });
});
