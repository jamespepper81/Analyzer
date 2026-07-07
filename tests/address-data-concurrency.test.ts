/**
 * Behavioral tests for the per-address data fetch phase of wallet connect.
 *
 * Architecture note: Next.js executes Server Actions serially per client, so
 * the client no longer fans out per-address calls. fetchAddressDataConcurrent
 * issues ONE batched action call per chunk; the server (getAddressBundleBatch
 * in blockchain-api.ts) fans out to the provider in parallel and applies the
 * balance>0 UTXO retry. These tests lock in:
 *  - chunked batching on the client (bounded round trips, no dropped data)
 *  - discovery-stats reuse
 *  - the server-side bundle behaviors (utxo retry, input-order results,
 *    bounded batch size)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the blockchain API layer so we can observe call patterns deterministically.
vi.mock('../src/lib/blockchain-api', () => {
    return {
        esploraGet: vi.fn(),
        fetchJson: vi.fn(),
        getHistoricalPriceRange: vi.fn(),
        getAddressStatsBatch: vi.fn(),
        getAddressBundleBatch: vi.fn(),
    };
});

import { fetchAddressDataConcurrent } from '../src/lib/blockchain';
import { getAddressBundleBatch } from '../src/lib/blockchain-api';

const mockedBundleBatch = getAddressBundleBatch as unknown as ReturnType<typeof vi.fn>;

const makeAddresses = (n: number) => Array.from({ length: n }, (_, i) => `addr_${i}`);

const makeBundle = (i: number) => ({
    stats: { chain_stats: { tx_count: i + 1, funded_txo_sum: 0, spent_txo_sum: 0 }, mempool_stats: { tx_count: 0 } },
    txs: [{ txid: `tx-${i}`, status: { confirmed: true } }],
    utxos: [],
});

beforeEach(() => {
    mockedBundleBatch.mockReset();
});

describe('fetchAddressDataConcurrent (batched client side)', () => {
    it('issues one batch call per chunk instead of per-address calls', async () => {
        const addresses = makeAddresses(30);
        mockedBundleBatch.mockImplementation(async (chunk: string[]) =>
            chunk.map((_, i) => makeBundle(i))
        );

        const result = await fetchAddressDataConcurrent(addresses);

        expect(result.size).toBe(30);
        // 30 addresses at chunk size 15 -> exactly 2 round trips
        expect(mockedBundleBatch).toHaveBeenCalledTimes(2);
        expect(mockedBundleBatch.mock.calls[0][0]).toHaveLength(15);
        expect(mockedBundleBatch.mock.calls[1][0]).toHaveLength(15);
    });

    it('returns data for every address including the final chunk', async () => {
        const addresses = makeAddresses(17); // 15 + 2
        mockedBundleBatch.mockImplementation(async (chunk: string[]) =>
            chunk.map((_, i) => makeBundle(i))
        );

        const result = await fetchAddressDataConcurrent(addresses);

        expect(result.size).toBe(17);
        expect(result.has('addr_16')).toBe(true);
    });

    it('reuses discovery stats as info when supplied', async () => {
        const addresses = makeAddresses(3);
        const statsByAddress = new Map<string, any>();
        addresses.forEach((a, i) =>
            statsByAddress.set(a, {
                chain_stats: { tx_count: 100 + i, funded_txo_sum: 1000, spent_txo_sum: 0 },
                mempool_stats: { tx_count: 0 },
            })
        );
        mockedBundleBatch.mockImplementation(async (chunk: string[]) =>
            chunk.map((_, i) => makeBundle(i))
        );

        const result = await fetchAddressDataConcurrent(addresses, statsByAddress);

        // The discovery-supplied stats win over the bundle's stats.
        expect(result.get('addr_0')?.info.chain_stats.tx_count).toBe(100);
        expect(result.get('addr_2')?.info.chain_stats.tx_count).toBe(102);
    });

    it('tolerates a failed chunk without dropping the others', async () => {
        const addresses = makeAddresses(20); // chunks of 15 + 5
        let call = 0;
        mockedBundleBatch.mockImplementation(async (chunk: string[]) => {
            call++;
            if (call === 1) throw new Error('provider exploded');
            return chunk.map((_, i) => makeBundle(i));
        });

        const result = await fetchAddressDataConcurrent(addresses);

        // First chunk (15) lost, second chunk (5) preserved.
        expect(result.size).toBe(5);
        expect(result.has('addr_15')).toBe(true);
    });

    it('reports streaming progress as chunks complete', async () => {
        const addresses = makeAddresses(17);
        mockedBundleBatch.mockImplementation(async (chunk: string[]) =>
            chunk.map((_, i) => makeBundle(i))
        );
        const processedCounts: number[] = [];

        await fetchAddressDataConcurrent(addresses, undefined, 6, (processed) => {
            processedCounts.push(processed);
        });

        expect(processedCounts).toHaveLength(17);
        expect(processedCounts[processedCounts.length - 1]).toBe(17);
    });

    it('returns an empty map for no addresses without calling the API', async () => {
        const result = await fetchAddressDataConcurrent([]);
        expect(result.size).toBe(0);
        expect(mockedBundleBatch).not.toHaveBeenCalled();
    });
});

describe('getAddressBundleBatch (server side)', () => {
    // Test the real implementation by stubbing global fetch (the module's
    // esploraGet/fetchJson ultimately call fetch).
    const realFetch = globalThis.fetch;
    let api: typeof import('../src/lib/blockchain-api');

    beforeEach(async () => {
        api = await vi.importActual<typeof import('../src/lib/blockchain-api')>('../src/lib/blockchain-api');
    });

    afterEach(() => {
        globalThis.fetch = realFetch;
    });

    // Valid-format bech32 addresses (sanitizeAddress enforces the format).
    const ADDR = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

    function stubFetch(handler: (url: string) => { body: any }) {
        globalThis.fetch = vi.fn(async (input: any) => {
            const url = String(input);
            const { body } = handler(url);
            return new Response(JSON.stringify(body), { status: 200 });
        }) as any;
    }

    it('retries the utxo call when balance is positive but the first utxo fetch is empty', async () => {
        let utxoCalls = 0;
        stubFetch((url) => {
            if (url.endsWith('/utxo')) {
                utxoCalls++;
                return { body: utxoCalls === 1 ? [] : [{ txid: 't', vout: 0, value: 5000 }] };
            }
            if (url.endsWith('/txs')) return { body: [] };
            // stats: positive balance
            return { body: { chain_stats: { tx_count: 1, funded_txo_sum: 5000, spent_txo_sum: 0 }, mempool_stats: { tx_count: 0 } } };
        });

        const [bundle] = await api.getAddressBundleBatch([ADDR]);

        expect(utxoCalls).toBe(2); // initial empty + balance-driven retry
        expect(bundle?.utxos).toHaveLength(1);
    });

    it('rejects oversized batches', async () => {
        const many = Array.from({ length: 21 }, () => ADDR);
        await expect(api.getAddressBundleBatch(many)).rejects.toThrow(/Too many addresses/);
    });

    it('rejects invalid addresses up front', async () => {
        await expect(api.getAddressBundleBatch(['not-an-address'])).rejects.toThrow();
    });

    it('rejects oversized stats batches', async () => {
        const many = Array.from({ length: 41 }, () => ADDR);
        await expect(api.getAddressStatsBatch(many)).rejects.toThrow(/Too many addresses/);
    });
});
