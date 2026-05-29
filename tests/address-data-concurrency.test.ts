/**
 * Behavioral tests for the bounded per-address data fetcher used during wallet
 * connect. These lock in the fix for the connect→dashboard performance
 * regression where per-address fetches fired with unbounded concurrency
 * (flooding the provider) and raced the snapshot build (dropping data for the
 * last-discovered addresses).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the blockchain API layer so we can observe call patterns deterministically.
vi.mock('../src/lib/blockchain-api', () => {
    return {
        esploraGet: vi.fn(),
        fetchJson: vi.fn(),
        getHistoricalPriceRange: vi.fn(),
    };
});

import { fetchAddressDataConcurrent } from '../src/lib/blockchain';
import { esploraGet } from '../src/lib/blockchain-api';

const mockedEsploraGet = esploraGet as unknown as ReturnType<typeof vi.fn>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const makeAddresses = (n: number) => Array.from({ length: n }, (_, i) => `addr_${i}`);

beforeEach(() => {
    mockedEsploraGet.mockReset();
});

describe('fetchAddressDataConcurrent', () => {
    it('caps the number of addresses processed concurrently', async () => {
        const addresses = makeAddresses(30);
        let inFlightAddresses = 0;
        let maxInFlightAddresses = 0;
        // Track concurrency at the address level: each address issues its calls
        // via Promise.all, so counting the /txs call (always first per address)
        // approximates how many addresses are being worked on at once.
        mockedEsploraGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/txs')) {
                inFlightAddresses++;
                maxInFlightAddresses = Math.max(maxInFlightAddresses, inFlightAddresses);
                await sleep(10);
                inFlightAddresses--;
                return [];
            }
            if (path.endsWith('/utxo')) return [];
            return { chain_stats: { tx_count: 1, funded_txo_sum: 0, spent_txo_sum: 0 }, mempool_stats: { tx_count: 0 } };
        });

        const result = await fetchAddressDataConcurrent(addresses, undefined, 6);

        expect(result.size).toBe(30);
        // Concurrency must be bounded by the worker pool (6), not the address count (30).
        expect(maxInFlightAddresses).toBeLessThanOrEqual(6);
        expect(maxInFlightAddresses).toBeGreaterThan(1);
    });

    it('awaits every address before returning (no dropped data even when the last is slow)', async () => {
        const addresses = makeAddresses(8);
        const slowAddress = addresses[addresses.length - 1];
        mockedEsploraGet.mockImplementation(async (path: string) => {
            if (path.includes(slowAddress) && path.endsWith('/txs')) {
                await sleep(50); // last-discovered address resolves slowly
                return [{ txid: 'slow-tx', status: { confirmed: true } }];
            }
            if (path.endsWith('/txs')) return [{ txid: `tx-${path}`, status: { confirmed: true } }];
            if (path.endsWith('/utxo')) return [];
            return { chain_stats: { tx_count: 1, funded_txo_sum: 0, spent_txo_sum: 0 }, mempool_stats: { tx_count: 0 } };
        });

        const result = await fetchAddressDataConcurrent(addresses, undefined, 6);

        expect(result.size).toBe(8);
        expect(result.has(slowAddress)).toBe(true);
        expect(result.get(slowAddress)?.txs[0].txid).toBe('slow-tx');
    });

    it('reuses discovery stats and skips the redundant /address call', async () => {
        const addresses = makeAddresses(5);
        const statsByAddress = new Map<string, any>();
        addresses.forEach((a, i) =>
            statsByAddress.set(a, {
                chain_stats: { tx_count: i + 1, funded_txo_sum: 1000, spent_txo_sum: 0 },
                mempool_stats: { tx_count: 0 },
            })
        );

        mockedEsploraGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/txs')) return [];
            if (path.endsWith('/utxo')) return [];
            return null;
        });

        const result = await fetchAddressDataConcurrent(addresses, statsByAddress, 6);

        // No bare /address/{addr} call should have been made (stats were supplied).
        const bareAddressCalls = mockedEsploraGet.mock.calls.filter(
            ([path]: [string]) => /^\/address\/[^/]+$/.test(path)
        );
        expect(bareAddressCalls.length).toBe(0);
        // The supplied stats are used as `info`.
        expect(result.get('addr_0')?.info.chain_stats.tx_count).toBe(1);
    });

    it('retries the utxo call when balance is positive but the first utxo fetch is empty', async () => {
        const addresses = ['addr_0'];
        const statsByAddress = new Map<string, any>([
            ['addr_0', { chain_stats: { tx_count: 1, funded_txo_sum: 5000, spent_txo_sum: 0 }, mempool_stats: { tx_count: 0 } }],
        ]);
        let utxoCalls = 0;
        mockedEsploraGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/txs')) return [];
            if (path.endsWith('/utxo')) {
                utxoCalls++;
                return utxoCalls === 1 ? [] : [{ txid: 't', vout: 0, value: 5000 }];
            }
            return null;
        });

        const result = await fetchAddressDataConcurrent(addresses, statsByAddress, 6);

        expect(utxoCalls).toBe(2); // initial empty + balance-driven retry
        expect(result.get('addr_0')?.utxos).toHaveLength(1);
    });

    it('returns an empty map for no addresses without calling the API', async () => {
        const result = await fetchAddressDataConcurrent([], undefined, 6);
        expect(result.size).toBe(0);
        expect(mockedEsploraGet).not.toHaveBeenCalled();
    });
});
