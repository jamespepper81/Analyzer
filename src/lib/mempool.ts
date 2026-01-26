
'use server';

import type { MempoolData, BlockDetails, BlockTransaction } from '@/lib/types';
import { fetchJson } from './blockchain-api';

export async function getMempoolData(): Promise<{ data: MempoolData | null; error: string | null; }> {
  try {
    const recommendedFeesUrl = 'https://mempool.space/api/v1/fees/recommended';
    const mempoolBlocksUrl = 'https://mempool.space/api/v1/fees/mempool-blocks';
    const mempoolInfoUrl = 'https://mempool.space/api/mempool';
    const blocksUrl = 'https://mempool.space/api/blocks';

    const [
        recommendedFees,
        mempoolBlocks,
        mempoolInfo,
        latestBlocks,
    ] = await Promise.all([
        fetchJson(recommendedFeesUrl, {}, 60),
        fetchJson(mempoolBlocksUrl, {}, 60),
        fetchJson(mempoolInfoUrl, {}, 60),
        fetchJson(blocksUrl, {}, 60),
    ]);

    const networkFeeRate = recommendedFees?.fastestFee ?? 0;
    let networkFeeLevel: 'Low' | 'Medium' | 'High';
    if (networkFeeRate < 20) {
        networkFeeLevel = 'Low';
    } else if (networkFeeRate < 100) {
        networkFeeLevel = 'Medium';
    } else {
        networkFeeLevel = 'High';
    }

    const data: MempoolData = {
        recommendedFees,
        mempoolBlocks,
        mempoolInfo,
        latestBlocks: latestBlocks.slice(0, 5), // Take the 5 most recent blocks
        networkFeeRate,
        networkFeeLevel,
    };
    
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred while fetching mempool data.';
    return { data: null, error: message };
  }
}

export async function getBlockDetails(hash: string, startIndex: number = 0): Promise<{ data: BlockDetails | null; error: string | null; }> {
  try {
    const blockUrl = `https://mempool.space/api/block/${hash}`;
    const txsUrl = `https://mempool.space/api/block/${hash}/txs/${startIndex}`;
    
    // Block data is immutable, so we can cache it for a long time.
    const [blockData, blockTxsData] = await Promise.all([
        fetchJson(blockUrl, {}, 86400),
        fetchJson(txsUrl, {}, 86400).catch(() => [])
    ]);

    if (!blockData) {
      return { data: null, error: `Could not fetch data for this block hash (${hash}).` };
    }

    const transactions: BlockTransaction[] = blockTxsData.map((tx: any) => ({
      txid: tx.txid,
      fee: tx.fee,
      size: tx.size,
      weight: tx.weight,
      value: tx.vout.reduce((sum: number, out: any) => sum + out.value, 0),
    }));

    const data: BlockDetails = {
        ...blockData,
        transactions,
    };

    return { data, error: null };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred while fetching block details.';
     if (message.includes('Invalid block hash')) {
      return { data: null, error: 'The block hash you entered is not valid.' };
    }
    return { data: null, error: message };
  }
}
