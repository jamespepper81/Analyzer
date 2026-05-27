
'use server';

import type { MempoolData, BlockDetails, BlockTransaction } from '@/lib/types';
import { fetchJson } from './blockchain-api';

export async function getMempoolData(): Promise<{ data: MempoolData | null; error: string | null; }> {
  try {
    const [
        recommendedFees,
        mempoolBlocks,
        mempoolInfo,
        latestBlocks,
    ] = await Promise.all([
        fetchJson('mempool', '/api/v1/fees/recommended', undefined, {}, 60),
        fetchJson('mempool', '/api/v1/fees/mempool-blocks', undefined, {}, 60),
        fetchJson('mempool', '/api/mempool', undefined, {}, 60),
        fetchJson('mempool', '/api/blocks', undefined, {}, 60),
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
    const normalizedHash = hash.trim();
    if (!/^[a-fA-F0-9]{64}$/.test(normalizedHash)) {
      return { data: null, error: 'The block hash you entered is not valid.' };
    }

    const n = Number(startIndex);
    const safeStartIndex = Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
    const encodedHash = encodeURIComponent(normalizedHash);

    const [blockData, blockTxsData] = await Promise.all([
        fetchJson('mempool', `/api/block/${encodedHash}`, undefined, {}, 86400),
        fetchJson('mempool', `/api/block/${encodedHash}/txs/${safeStartIndex}`, undefined, {}, 86400).catch(() => [])
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
