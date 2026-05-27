

'use server';

import { VALID_CURRENCIES } from '@/lib/types';
import type { Transaction, AddressInfo, Currency } from '@/lib/types';

export type AllowedHost = 'blockstream' | 'mempool' | 'coingecko' | 'blockchain_info' | 'alternative_me';

const TRUSTED_ORIGINS: Record<AllowedHost, string> = {
    blockstream: 'https://blockstream.info',
    mempool: 'https://mempool.space',
    coingecko: 'https://api.coingecko.com',
    blockchain_info: 'https://blockchain.info',
    alternative_me: 'https://api.alternative.me',
};

const ALLOWED_PATHS: Record<AllowedHost, RegExp[]> = {
    blockstream: [/^\/api\/[a-zA-Z0-9\-._~/]*$/],
    mempool: [/^\/api\/[a-zA-Z0-9\-._~/]*$/],
    coingecko: [/^\/api\/v3\/[a-zA-Z0-9\-._~/]*$/],
    blockchain_info: [/^\/[a-zA-Z0-9\-._~/]*$/],
    alternative_me: [/^\/[a-zA-Z0-9\-._~/]*$/],
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeAddress(address: string): string {
    const trimmed = address.trim();
    if (!/^(?:[13][a-km-zA-HJ-NP-Z1-9]{24,33}|bc1[a-z0-9]{39,59})$/.test(trimmed)) {
        throw new Error('The address you entered is not a valid Bitcoin address.');
    }
    return encodeURIComponent(trimmed);
}

function sanitizeTxid(txid: string): string {
    const trimmed = txid.trim();
    if (!/^[a-fA-F0-9]{64}$/.test(trimmed)) {
        throw new Error('The transaction ID you entered is not valid.');
    }
    return encodeURIComponent(trimmed);
}

function sanitizeProviderPathname(pathname: string): string {
    const trimmed = pathname.trim();
    if (!trimmed) {
        throw new Error('Disallowed provider URL path.');
    }

    // Block absolute/protocol-relative URLs and backslash path confusion.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith('//') || trimmed.includes('\\')) {
        throw new Error('Disallowed provider URL path.');
    }

    if (!trimmed.startsWith('/')) {
        throw new Error('Disallowed provider URL path.');
    }

    // Block obvious and percent-encoded traversal indicators before URL construction.
    const lowered = trimmed.toLowerCase();
    if (
        lowered.includes('/./') ||
        lowered.includes('/../') ||
        lowered.endsWith('/.') ||
        lowered.endsWith('/..') ||
        lowered.includes('%2e') ||
        lowered.includes('%2f') ||
        lowered.includes('%5c')
    ) {
        throw new Error('Disallowed provider URL path.');
    }

    return trimmed;
}

export async function fetchJson(
    host: AllowedHost,
    pathname: string,
    query?: Record<string, string>,
    options?: RequestInit,
    revalidate?: number,
): Promise<any> {
    const origin = TRUSTED_ORIGINS[host];
    const safePathname = sanitizeProviderPathname(pathname);
    const url = new URL(safePathname, origin);

    if (query) {
        for (const [key, value] of Object.entries(query)) {
            url.searchParams.set(key, value);
        }
    }

    const hostPathPolicies = ALLOWED_PATHS[host];
    const canonicalPathname = url.pathname;
    const hasDotSegments = canonicalPathname.split('/').some((segment) => segment === '.' || segment === '..');
    if (hasDotSegments || !hostPathPolicies || !hostPathPolicies.some((rx) => rx.test(canonicalPathname))) {
        throw new Error('Disallowed provider URL path.');
    }

    if (url.origin !== origin || url.protocol !== 'https:') {
        throw new Error('URL construction resulted in an unexpected origin.');
    }

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'BitSleuth/1.0',
        ...(options?.headers as Record<string, string> || {}),
    };

    if (host === 'coingecko') {
        const apiKey = process.env.COINGECKO_API_KEY;
        if (apiKey) {
            headers['x-cg-demo-api-key'] = apiKey;
        }
    }

    try {
        const response = await fetch(url.toString(), {
            ...options,
            signal: AbortSignal.timeout(20000),
            headers,
            next: { revalidate: revalidate ?? 60 },
        });
        const textBody = await response.text();

        if (textBody.includes("Blockstream Explorer API NOTICE")) {
            const err: any = new Error('ESPLORA_PROVIDER_NOTICE');
            err.code = 'ESPLORA_PROVIDER_NOTICE';
            throw err;
        }

        if (!response.ok) {
            console.error(`API request to ${url.toString()} failed with status ${response.status}:`, textBody);
            if (textBody.toLowerCase().includes('invalid bitcoin address')) {
                throw new Error('The address you entered is not a valid Bitcoin address.');
            }
            if (textBody.toLowerCase().includes('invalid txid')) {
                throw new Error('The transaction ID you entered is not valid.');
            }
            throw new Error(`The data provider returned an error (status: ${response.status}).`);
        }

        try {
            return JSON.parse(textBody);
        } catch (e) {
            console.error(`Failed to parse JSON from ${url.toString()}:`, e);
            throw new Error(`The data provider returned a malformed response.`);
        }

    } catch (e: any) {
        if (e.name === 'AbortError') {
            throw new Error(`The request to the data provider timed out.`);
        }
        throw e;
    }
}

const ESPLORA_HOSTS: AllowedHost[] = ['blockstream', 'mempool'];

/**
 * Fetch an Esplora endpoint with retry and provider fallback (Blockstream -> mempool.space).
 * Path must start with '/'.
 */
export async function esploraGet(path: string, revalidate?: number): Promise<any> {
    const attemptsPerProvider = 2;
    let lastError: any = null;

    let sanitizedPath: string;
    const addressMatch = path.match(/^\/address\/([^/]+)(\/.*)?$/);
    const txMatch = path.match(/^\/tx\/([^/]+)$/);
    if (addressMatch) {
        const safeAddr = sanitizeAddress(addressMatch[1]);
        const suffix = addressMatch[2];
        let safeSuffix = '';
        if (suffix === '/txs') safeSuffix = '/txs';
        else if (suffix === '/utxo') safeSuffix = '/utxo';
        else if (suffix) throw new Error('Disallowed address endpoint.');
        sanitizedPath = `/address/${safeAddr}${safeSuffix}`;
    } else if (txMatch) {
        const safeTxid = sanitizeTxid(txMatch[1]);
        sanitizedPath = `/tx/${safeTxid}`;
    } else if (path === '/blocks/tip/height') {
        sanitizedPath = '/blocks/tip/height';
    } else {
        throw new Error('Disallowed esplora path.');
    }

    const fullPath = `/api${sanitizedPath}`;
    for (const host of ESPLORA_HOSTS) {
        for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
            try {
                return await fetchJson(host, fullPath, undefined, {}, revalidate);
            } catch (e: any) {
                lastError = e;
                if (e?.code === 'ESPLORA_PROVIDER_NOTICE') {
                    break;
                }
                if (e?.message?.includes('timed out') || /5\d\d/.test(e?.message || '')) {
                    await sleep(300 * (attempt + 1));
                    continue;
                }
                await sleep(150 * (attempt + 1));
            }
        }
    }
    throw lastError ?? new Error('Failed to fetch from any Esplora provider');
}

// Cache for historical prices to avoid redundant API calls for the same day.
const priceCache = new Map<string, number>();

export async function getHistoricalPrice(date: Date, currency: Currency): Promise<number> {
    if (!(VALID_CURRENCIES as readonly string[]).includes(currency)) return 0;
    const dateKey = `${date.toISOString().split('T')[0]}-${currency}`;
    if (priceCache.has(dateKey)) {
        return priceCache.get(dateKey)!;
    }
    try {
        const price = await fetchJson('blockchain_info', '/toapi', {
            currency,
            value: '1',
            time: String(date.getTime()),
        }, {}, 86400);
        if (typeof price === 'number' && price > 0) {
            priceCache.set(dateKey, price);
        }
        return price || 0;
    } catch (error) {
        console.error(`Failed to fetch historical price for ${dateKey}:`, error);
        return 0;
    }
}

export async function getHistoricalPriceRange(days: number, currency: Currency): Promise<[number, number][]> {
    if (!(VALID_CURRENCIES as readonly string[]).includes(currency)) return [];
    const currencyCode = currency.toLowerCase();
    const safeDays = Math.max(1, Math.trunc(Number(days)) || 1);
    try {
        const data = await fetchJson('coingecko', '/api/v3/coins/bitcoin/market_chart', {
            vs_currency: currencyCode,
            days: String(safeDays),
            interval: 'daily',
        }, {}, 3600);
        return data.prices || [];
    } catch (error) {
        console.error('Failed to fetch historical price range for %s days:', String(days), error);
        return [];
    }
}


export async function getAddressData(address: string): Promise<{ data: { addressInfo: AddressInfo, transactions: Transaction[], btcPrice: number } | null; error: string | null; }> {
    try {
        const safeAddress = sanitizeAddress(address);
        const addressUrl = `/address/${safeAddress}`;
        const addressTxsUrl = `/address/${safeAddress}/txs`;
        const [addressStats, txsData, btcTicker] = await Promise.all([
            esploraGet(addressUrl, 300),
            esploraGet(addressTxsUrl, 300).catch(() => []),
            fetchJson('blockchain_info', '/ticker', undefined, {}, 60),
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
        const safeTxid = sanitizeTxid(txid);
        const txUrl = `/tx/${safeTxid}`;
        const txData = await esploraGet(txUrl, 86400);
        if (!txData) return { data: null, error: `Could not fetch data for this transaction ID (${txid}).` };

        const latestBlockHeight = await esploraGet(`/blocks/tip/height`, 60);
        const isConfirmed = txData.status.confirmed;
        const confirmations = isConfirmed && latestBlockHeight ? latestBlockHeight - txData.status.block_height + 1 : 0;
        const txDate = isConfirmed ? new Date(txData.status.block_time * 1000) : new Date();

        let netAmountSatoshis = 0;
        txData.vout?.forEach((out: any) => { netAmountSatoshis += out.value; });
        txData.vin?.forEach((inp: any) => { netAmountSatoshis -= inp.prevout?.value ?? 0; });

        const netBtc = netAmountSatoshis / 1e8;
        console.debug('[getTransactionData] Computed net BTC for %s:', txid, netBtc);

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
        const safeAddress = sanitizeAddress(address);
        const addressStatsUrl = `/address/${safeAddress}`;
        const stats = await esploraGet(addressStatsUrl, 300);
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
