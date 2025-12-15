
'use server';

import { bitcoin, bip32 } from '@/lib/bitcoin-init';
import type { WalletData, Transaction, AddressInfo, UTXO, Currency, TransactionLabel } from '@/lib/types';
import { KNOWN_EXCHANGE_ADDRESSES } from '@/lib/exchange-labels';
import { esploraGet, fetchJson, getHistoricalPriceRange } from './blockchain-api';
import { format, startOfDay } from 'date-fns';

const GAP_LIMIT = 20; // Standard gap limit for address discovery
const INITIAL_CHECK_LIMIT = 5; // How many addresses to check initially to determine wallet type
const PARALLEL_BATCH_SIZE = 10; // How many addresses to check in parallel
const TYPE_DETECTION_CONCURRENCY = 3; // Check all types concurrently

function getP2wpkhAddress(pubKey: Buffer): string {
    return bitcoin.payments.p2wpkh({ pubkey: pubKey }).address!;
}

function getP2pkhAddress(pubKey: Buffer): string {
    return bitcoin.payments.p2pkh({ pubkey: pubKey }).address!;
}

function getP2shP2wpkhAddress(pubKey: Buffer): string {
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: pubKey });
    return bitcoin.payments.p2sh({ redeem: p2wpkh }).address!;
}

// Derives a batch of addresses for a given chain (external/internal) and type
function deriveAddressBatch(node: any, chain: number, from: number, to: number, type: 'native' | 'legacy' | 'nested'): string[] {
    const addresses: string[] = [];
    const chainNode = node.derive(chain);
    for (let i = from; i < to; i++) {
        const childNode = chainNode.derive(i);
        let address: string;
        if (type === 'legacy') {
            address = getP2pkhAddress(childNode.publicKey);
        } else if (type === 'nested') {
            address = getP2shP2wpkhAddress(childNode.publicKey);
        } else {
            address = getP2wpkhAddress(childNode.publicKey);
        }
        addresses.push(address);
    }
    return addresses;
}

// This is the new, more robust implementation with provider readiness check and fallback.
async function discoverUsedAddresses(xpub: string): Promise<string[]> {
    const discoveryStartTime = Date.now();
    const node = bip32.fromBase58(xpub, bitcoin.networks.bitcoin);
    let allUsedAddresses: string[] = [];

    // Quick provider readiness check (with fallback & retry under the hood)
    try {
        await esploraGet(`/blocks/tip/height`, 60);
    } catch (e) {
        throw new Error('Upstream data provider is temporarily unavailable. Please try again in a moment.');
    }

    // 1. Determine which address types are active by checking the first few addresses of each type.
    // We check External chain (0) indices 0-4.
    // ALL types are checked in PARALLEL for faster detection
    const typesToCheck: ('native' | 'legacy' | 'nested')[] = ['native', 'nested', 'legacy'];
    const activeTypes: ('native' | 'legacy' | 'nested')[] = [];

    // Check all address types concurrently
    const typeDetectionResults = await Promise.allSettled(
        typesToCheck.map(async (type) => {
            const batch = deriveAddressBatch(node, 0, 0, INITIAL_CHECK_LIMIT, type);
            // Check all addresses in this batch in parallel
            const results = await Promise.allSettled(
                batch.map(addr => esploraGet(`/address/${addr}/txs`, 300))
            );
            // If any address in the batch has transactions, mark this type as active
            const hasActivity = results.some(result => 
                result.status === 'fulfilled' && 
                Array.isArray(result.value) && 
                result.value.length > 0
            );
            return { type, hasActivity };
        })
    );

    // Collect active types from successful checks
    typeDetectionResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.hasActivity) {
            activeTypes.push(result.value.type);
        }
    });

    // If no activity detected, default to Native Segwit (most common modern standard)
    // or scan all if we want to be super thorough, but defaulting to Native is a safe bet for "new" empty wallets.
    // However, if it's truly empty, it doesn't matter which we pick, but Native is best practice.
    if (activeTypes.length === 0) {
        activeTypes.push('native');
    }

    const typeDetectionTime = Date.now() - discoveryStartTime;
    console.log(`[Discovery] Detected active wallet types: ${activeTypes.join(', ')} in ${typeDetectionTime}ms`);

    // 2. Perform full discovery for active types
    // Use parallel processing within each batch for much faster discovery
    for (const type of activeTypes) {
        for (const chain of [0, 1]) { // 0 for external, 1 for internal
            let gap = 0;
            let index = 0;

            while (gap < GAP_LIMIT) {
                const batch = deriveAddressBatch(node, chain, index, index + GAP_LIMIT, type);
                
                // Process addresses in parallel chunks to avoid overwhelming the API
                // but still get significant speedup
                const chunkSize = PARALLEL_BATCH_SIZE;
                const addressTxs: any[] = new Array(batch.length);
                
                for (let chunkStart = 0; chunkStart < batch.length; chunkStart += chunkSize) {
                    const chunkEnd = Math.min(chunkStart + chunkSize, batch.length);
                    const chunkAddresses = batch.slice(chunkStart, chunkEnd);
                    
                    // Check this chunk of addresses in parallel
                    const chunkResults = await Promise.allSettled(
                        chunkAddresses.map(addr => esploraGet(`/address/${addr}/txs/chain`, 300))
                    );
                    
                    // Store results
                    chunkResults.forEach((result, i) => {
                        const absoluteIndex = chunkStart + i;
                        if (result.status === 'fulfilled') {
                            addressTxs[absoluteIndex] = result.value;
                        } else {
                            addressTxs[absoluteIndex] = [];
                        }
                    });
                }

                let foundInBatch = false;
                for (let i = 0; i < addressTxs.length; i++) {
                    if (addressTxs[i] && addressTxs[i].length > 0) {
                        allUsedAddresses.push(batch[i]);
                        gap = 0;
                        foundInBatch = true;
                    } else {
                        gap++;
                    }
                }

                if (!foundInBatch) {
                    // If a whole batch of 20 is unused, we can likely stop for this chain.
                    break;
                }

                index += GAP_LIMIT;
            }
        }
    }

    const totalDiscoveryTime = Date.now() - discoveryStartTime;
    const uniqueAddresses = [...new Set(allUsedAddresses)];
    console.log(`[Discovery] Found ${uniqueAddresses.length} used addresses in ${totalDiscoveryTime}ms (${(totalDiscoveryTime/1000).toFixed(2)}s)`);
    
    return uniqueAddresses;
}

async function getBatchedHistoricalPrices(dates: Date[], currency: Currency): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    if (dates.length === 0) return priceMap;

    const uniqueDates = [...new Set(dates.map(d => format(startOfDay(d), 'yyyy-MM-dd')))];
    const oldestDate = new Date(Math.min(...uniqueDates.map(d => new Date(d).getTime())));
    const days = Math.ceil((new Date().getTime() - oldestDate.getTime()) / (1000 * 3600 * 24));

    const prices = await getHistoricalPriceRange(Math.max(1, days), currency);
    const geckoPriceMap = new Map(prices.map(([timestamp, price]) => [format(startOfDay(new Date(timestamp)), 'yyyy-MM-dd'), price]));

    uniqueDates.forEach(dateStr => {
        const price = geckoPriceMap.get(dateStr);
        if (price !== undefined) {
            priceMap.set(dateStr, price);
        }
    });

    return priceMap;
}

export async function getWalletData(xpub: string, currency: Currency = 'USD'): Promise<{ data: WalletData | null; error: string | null; }> {
    try {
        const usedAddresses = await discoverUsedAddresses(xpub);

        if (usedAddresses.length === 0) {
            return { data: null, error: 'This xpub key has no transaction history and cannot be analyzed. Address discovery failed.' };
        }

        // Fetch critical price data first. If this fails, we can't proceed.
        const btcPrices = await fetchJson('https://blockchain.info/ticker');
        if (typeof btcPrices?.USD?.last !== 'number') {
            return { data: null, error: 'Could not fetch critical BTC price data. The API may be down.' };
        }

        // Fetch non-critical data, allowing for graceful failure.
        const [latestBlockHeight, priceHistory24h, priceHistory7d, priceHistory30d] = await Promise.all([
            esploraGet(`/blocks/tip/height`, 60).catch(() => null),
            getHistoricalPriceRange(1, currency).catch(() => []),
            getHistoricalPriceRange(7, currency).catch(() => []),
            getHistoricalPriceRange(30, currency).catch(() => [])
        ]);

        const allTxs = new Map<string, any>();
        const utxos: UTXO[] = [];
        const addressInfos: AddressInfo[] = [];

        // Fetch all data for used addresses with limited concurrency to avoid provider throttling
        const concurrency = 6;
        let idx = 0;
        async function worker() {
            while (idx < usedAddresses.length) {
                const address = usedAddresses[idx++];
                try {
                    const [txs, initialAddressUtxos, addressInfo] = await Promise.all([
                        esploraGet(`/address/${address}/txs`).catch(() => []),
                        esploraGet(`/address/${address}/utxo`).catch(() => []),
                        esploraGet(`/address/${address}`).catch(() => null)
                    ]);

                    // If the address shows a positive balance but the first UTXO call failed,
                    // try a dedicated retry to avoid silently undercounting UTXOs.
                    const addressBalanceSats =
                        (addressInfo?.chain_stats?.funded_txo_sum || 0) -
                        (addressInfo?.chain_stats?.spent_txo_sum || 0);
                    const addressUtxos =
                        Array.isArray(initialAddressUtxos) && initialAddressUtxos.length > 0
                            ? initialAddressUtxos
                            : addressBalanceSats > 0
                                ? await esploraGet(`/address/${address}/utxo`).catch(() => [])
                                : [];
                    if (Array.isArray(txs)) {
                        txs.forEach((tx: any) => allTxs.set(tx.txid, tx));
                    }
                    if (Array.isArray(addressUtxos)) {
                        addressUtxos.forEach((utxo: any) => {
                            utxos.push({ txid: utxo.txid, vout: utxo.vout, address, value: utxo.value });
                        });
                    }
                    if (addressInfo && addressInfo.chain_stats?.tx_count > 0) {
                        addressInfos.push({
                            address,
                            n_tx: addressInfo.chain_stats.tx_count,
                            balance: addressInfo.chain_stats.funded_txo_sum - addressInfo.chain_stats.spent_txo_sum,
                        });
                    }
                } catch {
                    // Skip this address on failure
                }
            }
        }
        await Promise.all(Array.from({ length: Math.min(concurrency, usedAddresses.length) }, () => worker()));

        const transactionDates = Array.from(allTxs.values())
            .map(tx => new Date(tx.status.confirmed ? tx.status.block_time * 1000 : Date.now()));

        const historicalPrices = await getBatchedHistoricalPrices(transactionDates, currency);

        const transactions: Transaction[] = Array.from(allTxs.values()).map((tx: any): Transaction => {
            let netAmountSatoshis = 0;
            const ourAddressesSet = new Set(usedAddresses);

            tx.vout.forEach((out: any) => {
                if (out.scriptpubkey_address && ourAddressesSet.has(out.scriptpubkey_address)) {
                    netAmountSatoshis += out.value;
                }
            });
            tx.vin.forEach((inp: any) => {
                if (inp.prevout?.scriptpubkey_address && ourAddressesSet.has(inp.prevout.scriptpubkey_address)) {
                    netAmountSatoshis -= inp.prevout.value;
                }
            });

            const netBtc = netAmountSatoshis / 1e8;
            const isConfirmed = tx.status.confirmed;
            const confirmations = isConfirmed && latestBlockHeight ? latestBlockHeight - tx.status.block_height + 1 : 0;
            const txDate = isConfirmed ? new Date(tx.status.block_time * 1000) : new Date();

            const fromAddress = tx.vin?.map((i: any) => i.prevout?.scriptpubkey_address).filter(Boolean) ?? [];
            const toAddress = tx.vout?.map((o: any) => o.scriptpubkey_address).filter(Boolean) ?? [];

            const labels: TransactionLabel[] = [];
            fromAddress.forEach((addr: string) => {
                if (KNOWN_EXCHANGE_ADDRESSES[addr]) {
                    labels.push({ address: addr, label: KNOWN_EXCHANGE_ADDRESSES[addr], type: 'exchange' });
                }
            });
            toAddress.forEach((addr: string) => {
                if (KNOWN_EXCHANGE_ADDRESSES[addr]) {
                    labels.push({ address: addr, label: KNOWN_EXCHANGE_ADDRESSES[addr], type: 'exchange' });
                }
            });

            const dateKey = format(startOfDay(txDate), 'yyyy-MM-dd');
            const historicalPrice = historicalPrices.get(dateKey) || 0;

            const totalValue = tx.vout?.reduce((sum: number, o: any) => sum + o.value, 0) / 1e8;

            return {
                id: tx.txid, date: txDate.toISOString(), btc: netBtc, status: isConfirmed ? 'Confirmed' : 'Pending', type: netBtc >= 0 ? 'Received' : 'Sent',
                fromAddress, toAddress, confirmations, fee: tx.fee, size: tx.size, weight: tx.weight, version: tx.version, locktime: tx.locktime,
                rbf: tx.vin.some((i: any) => i.sequence < 0xfffffffe), blockHeight: tx.status.block_height ?? null,
                inputs: tx.vin?.map((i: any) => ({ address: i.prevout?.scriptpubkey_address, value: i.prevout?.value })) || [],
                outputs: tx.vout?.map((o: any) => ({ address: o.scriptpubkey_address, value: o.value, spent: false })) || [],
                labels: labels.length > 0 ? labels : undefined,
                historicalPrice,
                totalValue,
            };
        });

        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


        const finalBalanceBTC = utxos.reduce((sum, utxo) => sum + utxo.value, 0) / 1e8;
        const fiatPriceForDust = btcPrices[currency]?.last || btcPrices.USD.last;
        const dustUtxos = utxos.filter(utxo => (utxo.value / 1e8) * fiatPriceForDust < 1.0);
        const dustAmountBTC = dustUtxos.reduce((sum, utxo) => sum + utxo.value, 0) / 1e8;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let inflowBTC = 0, outflowBTC = 0;
        transactions.forEach(tx => {
            if (new Date(tx.date).getTime() > thirtyDaysAgo.getTime()) {
                if (tx.btc > 0) inflowBTC += tx.btc; else outflowBTC += tx.btc;
            }
        });

        const reusedAddressCount = addressInfos.filter(addr => addr.n_tx > 1).length;
        const reusePercentage = addressInfos.length > 0 ? (reusedAddressCount / addressInfos.length) * 100 : 0;

        let totalFee = 0, totalVSize = 0;
        transactions.forEach(tx => {
            if (tx.type === 'Sent' && tx.size > 0 && tx.fee > 0) {
                totalFee += tx.fee;
                totalVSize += tx.weight ? tx.weight / 4 : tx.size;
            }
        });

        const price24h = priceHistory24h.length > 0 ? priceHistory24h[0][1] : 0;
        const price7d = priceHistory7d.length > 0 ? priceHistory7d[0][1] : 0;
        const price30d = priceHistory30d.length > 0 ? priceHistory30d[0][1] : 0;

        const currentPrice = btcPrices[currency]?.last || 0;

        const walletData: WalletData = {
            btcPrices, balanceBTC: finalBalanceBTC, transactions,
            securityScore: Math.max(10, 100 - Math.floor(reusePercentage)),
            opsecThreat: reusePercentage > 50 ? 'High' : reusePercentage > 0 ? 'Medium' : 'Low',
            usedAddressCount: addressInfos.length, dustAmountBTC, dustUtxoCount: dustUtxos.length, addresses: addressInfos, utxos,
            performance: {
                change24h: price24h > 0 ? ((currentPrice - price24h) / price24h) * 100 : 0,
                change7d: price7d > 0 ? ((currentPrice - price7d) / price7d) * 100 : 0,
                change30d: price30d > 0 ? ((currentPrice - price30d) / price30d) * 100 : 0,
            },
            inflowOutflow: { inflowBTC, outflowBTC },
            averageFeeRate: totalVSize > 0 ? totalFee / totalVSize : 0,
            btcPrice: currentPrice,
        };

        return { data: walletData, error: null };
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred while fetching wallet data.';
        return { data: null, error: message };
    }
}
