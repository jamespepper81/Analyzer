

'use server';

import type { Transaction, AddressInfo, Currency } from '@/lib/types';

const BLOCKSTREAM_API_BASE = 'https://blockstream.info/api';
const MEMPOOL_SPACE_API_BASE = 'https://mempool.space/api';

const ESPLORA_BASES = [BLOCKSTREAM_API_BASE, MEMPOOL_SPACE_API_BASE];

const ALLOWED_HOSTS = new Set([
    'blockstream.info',
    'mempool.space',
    'api.coingecko.com',
    'blockchain.info',
    'api.alternative.me',
]);

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson(url: string, options?: RequestInit, revalidate?: number): Promise<any> {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid provider URL.');
    }

    if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsedUrl.hostname)) {
        throw new Error('Disallowed provider URL.');
    }

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'BitSleuth/1.0',
        ...(options?.headers as Record<string, string> || {}),
    };

    if (url.includes('api.coingecko.com')) {
        const apiKey = process.env.COINGECKO_API_KEY;
        if (apiKey) {
            headers['x-cg-demo-api-key'] = apiKey;
        }
    }

    try {
        const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(20000),
            headers,
            next: { revalidate: revalidate ?? 60 } // Default to 1-minute cache
        });
        const textBody = await response.text();

        // Check for Blockstream's non-JSON notice page FIRST.
        if (textBody.includes("Blockstream Explorer API NOTICE")) {
            // Signal to callers that this provider is temporarily unusable so they can fallback
            const err: any = new Error('ESPLORA_PROVIDER_NOTICE');
            err.code = 'ESPLORA_PROVIDER_NOTICE';
            throw err;
        }

        if (!response.ok) {
            console.error(`API request to ${url} failed with status ${response.status}:`, textBody);
            // Handle specific text errors from Blockstream
            if (textBody.toLowerCase().includes('invalid bitcoin address')) {
                throw new Error('The address you entered is not a valid Bitcoin address.');
            }
            if (textBody.toLowerCase().includes('invalid txid')) {
                throw new Error('The transaction ID you entered is not valid.');
            }
            throw new Error(`The data provider returned an error (status: ${response.status}).`);
        }

        try {
            // If the response was OK and not a notice, it should be JSON.
            return JSON.parse(textBody);
        } catch (e) {
            console.error(`Failed to parse JSON from ${url}:`, e);
            throw new Error(`The data provider returned a malformed response.`);
        }

    } catch (e: any) {
        if (e.name === 'AbortError') {
            throw new Error(`The request to the data provider timed out.`);
        }
        throw e;
    }
}

/**
 * Fetch an Esplora endpoint with retry and provider fallback (Blockstream -> mempool.space).
 * Path must start with '/'.
 */
export async function esploraGet(path: string, revalidate?: number): Promise<any> {
    const attemptsPerProvider = 2;
    let lastError: any = null;
    for (const base of ESPLORA_BASES) {
        const url = `${base}${path}`;
        for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
            try {
                return await fetchJson(url, {}, revalidate);
            } catch (e: any) {
                lastError = e;
                // If Blockstream served a notice, immediately break to try next provider
                if (e?.code === 'ESPLORA_PROVIDER_NOTICE') {
                    break;
                }
                // Backoff for network/5xx/timeout
                if (e?.message?.includes('timed out') || /5\d\d/.test(e?.message || '')) {
                    await sleep(300 * (attempt + 1));
                    continue;
                }
                // For other errors, retry once, then move on
                await sleep(150 * (attempt + 1));
            }
        }
        // Try next provider
    }
    throw lastError ?? new Error('Failed to fetch from any Esplora provider');
}

// Cache for historical prices to avoid redundant API calls for the same day.
const priceCache = new Map<string, number>();

export async function getHistoricalPrice(date: Date, currency: Currency): Promise<number> {
    const dateKey = `${date.toISOString().split('T')[0]}-${currency}`;
    if (priceCache.has(dateKey)) {
        return priceCache.get(dateKey)!;
    }
    // This API is slow, so we don't use fetchJson's default timeout here.
    const url = `https://blockchain.info/toapi?currency=${currency}&value=1&time=${date.getTime()}`;
    try {
        const response = await fetch(url, { next: { revalidate: 86400 } }); // Cache for 1 day
        const price = await response.json();
        if (typeof price === 'number' && price > 0) {
            priceCache.set(dateKey, price);
        }
        return price || 0;
    } catch (error) {
        console.error(`Failed to fetch historical price for ${dateKey}:`, error);
        return 0; // Return 0 if the API call fails
    }
}

export async function getHistoricalPriceRange(days: number, currency: Currency): Promise<[number, number][]> {
    const currencyCode = currency.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currencyCode}&days=${days}&interval=daily`;
    try {
        const data = await fetchJson(url, {}, 3600); // Cache for 1 hour
        return data.prices || [];
    } catch (error) {
        console.error(`Failed to fetch historical price range for ${days} days:`, error);
        return [];
    }
}


export async function getAddressData(address: string): Promise<{ data: { addressInfo: AddressInfo, transactions: Transaction[], btcPrice: number } | null; error: string | null; }> {
    try {
        const addressUrl = `/address/${address}`;
        const addressTxsUrl = `/address/${address}/txs`;
        const tickerUrl = 'https://blockchain.info/ticker';

        const [addressStats, txsData, btcTicker] = await Promise.all([
            esploraGet(addressUrl, 300), // Cache address stats for 5 mins
            esploraGet(addressTxsUrl, 300).catch(() => []),
            fetchJson(tickerUrl, {}, 60), // Cache price for 1 min
        ]);

        if (!addressStats || !addressStats.chain_stats || addressStats.chain_stats.tx_count === 0) return { data: null, error: 'Could not fetch data for this address. It may not have any transaction history.' };

        const btcPrice = btcTicker?.USD?.last;
        if (typeof btcPrice !== 'number') return { data: null, error: 'Could not fetch a valid BTC price.' };

        const addressInfo: AddressInfo = {
            address: address,
            n_tx: addressStats.chain_stats.tx_count,
            balance: addressStats.chain_stats.funded_txo_sum - addressStats.chain_stats.spent_txo_sum,
        };

        const spentOutputs = new Set<string>();
        // Check if txsData is an array before iterating
        if (Array.isArray(txsData)) {
            txsData.forEach((tx: any) => {
                if (Array.isArray(tx.vin)) {
                    tx.vin.forEach((input: any) => {
                        spentOutputs.add(`${input.txid}:${input.vout}`);
                    });
                }
            });
        }

        const latestBlockHeight = (await esploraGet(`/blocks/tip/height`, 60));

        const transactions: Transaction[] = (Array.isArray(txsData) ? txsData : []).map((tx: any): Transaction => {
            let netAmountSatoshis = 0;
            tx.vout.forEach((out: any) => { if (out.scriptpubkey_address === address) netAmountSatoshis += out.value; });
            tx.vin.forEach((inp: any) => { if (inp.prevout?.scriptpubkey_address === address) netAmountSatoshis -= inp.prevout.value; });

            const netBtc = netAmountSatoshis / 1e8;
            const isConfirmed = tx.status.confirmed;
            const confirmations = isConfirmed && latestBlockHeight ? latestBlockHeight - tx.status.block_height + 1 : 0;
            const txDate = isConfirmed ? new Date(tx.status.block_time * 1000) : new Date();

            return {
                id: tx.txid,
                date: txDate.toISOString(),
                btc: netBtc,
                status: isConfirmed ? 'Confirmed' : 'Pending', type: netAmountSatoshis >= 0 ? 'Received' : 'Sent',
                fromAddress: tx.vin?.map((i: any) => i.prevout?.scriptpubkey_address).filter(Boolean) ?? [],
                toAddress: tx.vout?.map((o: any) => o.scriptpubkey_address).filter(Boolean) ?? [],
                confirmations, fee: tx.fee, size: tx.size, weight: tx.weight, version: tx.version, locktime: tx.locktime, rbf: tx.vin.some((i: any) => i.sequence < 0xfffffffe), blockHeight: tx.status.block_height ?? null,
                inputs: tx.vin?.map((i: any) => ({ address: i.prevout?.scriptpubkey_address, value: i.prevout?.value })) || [],
                outputs: tx.vout?.map((o: any, index: number) => ({ address: o.scriptpubkey_address, value: o.value, spent: spentOutputs.has(`${tx.txid}:${index}`) })) || [],
                totalValue: tx.vout?.reduce((sum: number, o: any) => sum + o.value, 0) / 1e8,
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { data: { addressInfo, transactions, btcPrice }, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred while fetching address data.';
        return { data: null, error: message };
    }
}


export async function getTransactionData(txid: string): Promise<{ data: Transaction | null; error: string | null; }> {
    try {
        const txUrl = `/tx/${txid}`;
        const txData = await esploraGet(txUrl, 86400); // Cache confirmed tx for a day
        if (!txData) return { data: null, error: `Could not fetch data for this transaction ID (${txid}).` };

        const latestBlockHeight = await esploraGet(`/blocks/tip/height`, 60);
        const isConfirmed = txData.status.confirmed;
        const confirmations = isConfirmed && latestBlockHeight ? latestBlockHeight - txData.status.block_height + 1 : 0;
        const txDate = isConfirmed ? new Date(txData.status.block_time * 1000) : new Date();

        let netAmountSatoshis = 0;
        txData.vout?.forEach((out: any) => { netAmountSatoshis += out.value; });
        txData.vin?.forEach((inp: any) => { netAmountSatoshis -= inp.prevout?.value ?? 0; });

        const netBtc = netAmountSatoshis / 1e8;
        console.debug(`[getTransactionData] Computed net BTC for ${txid}:`, netBtc);

        const transaction: Transaction = {
            id: txData.txid, date: txDate.toISOString(),
            btc: netBtc,
            status: isConfirmed ? 'Confirmed' : 'Pending',
            type: netAmountSatoshis >= 0 ? 'Received' : 'Sent',
            fromAddress: txData.vin?.map((i: any) => i.prevout?.scriptpubkey_address).filter(Boolean) ?? [],
            toAddress: txData.vout?.map((o: any) => o.scriptpubkey_address).filter(Boolean) ?? [],
            confirmations, fee: txData.fee, size: txData.size, weight: txData.weight, version: txData.version, locktime: txData.locktime,
            rbf: txData.vin.some((i: any) => i.sequence < 0xfffffffe), blockHeight: txData.status.block_height ?? null,
            inputs: txData.vin?.map((i: any) => ({ address: i.prevout?.scriptpubkey_address, value: i.prevout?.value })) || [],
            outputs: txData.vout?.map((o: any) => ({ address: o.scriptpubkey_address, value: o.value, spent: false })) || [],
            totalValue: txData.vout?.reduce((sum: number, o: any) => sum + o.value, 0) / 1e8,
        };

        return { data: transaction, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred while fetching transaction data.';
        return { data: null, error: message };
    }
}

export async function getAddressStats(address: string): Promise<{ data: AddressInfo | null; error: string | null; }> {
    try {
        const addressStatsUrl = `/address/${address}`;
        const stats = await esploraGet(addressStatsUrl, 300); // Cache for 5 mins
        if (!stats) return { data: null, error: 'Could not fetch stats for this address.' };

        const addressInfo: AddressInfo = {
            address: address,
            n_tx: stats.chain_stats.tx_count,
            balance: stats.chain_stats.funded_txo_sum - stats.chain_stats.spent_txo_sum,
        };
        return { data: addressInfo, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred while fetching address stats.';
        return { data: null, error: message };
    }
}
