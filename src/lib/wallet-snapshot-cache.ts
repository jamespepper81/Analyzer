/**
 * Wallet Snapshot Cache System
 * 
 * Provides in-memory caching with in-flight request deduplication for wallet data.
 * This significantly reduces blockchain API calls when:
 * - Switching between wallets repeatedly
 * - Changing currency (only fiat price needs to be refreshed)
 * - Reloading the same wallet
 * 
 * Cache Structure:
 * - Snapshot: Complete blockchain data (transactions, UTXOs, addresses, metadata)
 * - TTL: Time-to-live for cached snapshots (default: 5 minutes)
 * - In-flight: Deduplicate concurrent requests for the same XPUB
 */

import type { Transaction, AddressInfo, UTXO } from '@/lib/types';

export interface WalletSnapshot {
  xpub: string;
  timestamp: number;
  
  // Core blockchain data (currency-independent)
  transactions: Transaction[];
  utxos: UTXO[];
  addresses: AddressInfo[];
  usedAddressCount: number;
  
  // Security metrics (currency-independent)
  securityScore: number;
  opsecThreat: 'High' | 'Medium' | 'Low';
  dustUtxoCount: number;
  dustAmountBTC: number;
  
  // Performance metrics (currency-independent)
  averageFeeRate: number;
  inflowBTC: number;
  outflowBTC: number;
  
  // BTC balance (currency-independent)
  balanceBTC: number;
}

export interface WalletSnapshotCache {
  snapshot: WalletSnapshot;
  expiresAt: number;
}

// In-memory cache for wallet snapshots
const snapshotCache = new Map<string, WalletSnapshotCache>();

// In-flight request tracking to prevent duplicate blockchain calls
const inFlightRequests = new Map<string, Promise<WalletSnapshot | null>>();

// Default TTL: 5 minutes (300,000 ms)
const DEFAULT_SNAPSHOT_TTL_MS = 5 * 60 * 1000;

/**
 * Get a snapshot cache key for an XPUB
 */
function getSnapshotCacheKey(xpub: string): string {
  return `wallet_snapshot:${xpub}`;
}

/**
 * Check if a cached snapshot is still valid
 */
function isSnapshotValid(cache: WalletSnapshotCache): boolean {
  return Date.now() < cache.expiresAt;
}

/**
 * Get a cached wallet snapshot if available and valid
 */
export function getCachedSnapshot(xpub: string): WalletSnapshot | null {
  const key = getSnapshotCacheKey(xpub);
  const cached = snapshotCache.get(key);
  
  if (cached && isSnapshotValid(cached)) {
    console.log(`[SnapshotCache] Cache hit for ${xpub.substring(0, 20)}...`);
    return cached.snapshot;
  }
  
  if (cached) {
    console.log(`[SnapshotCache] Cache expired for ${xpub.substring(0, 20)}...`);
    snapshotCache.delete(key);
  }
  
  return null;
}

/**
 * Set a wallet snapshot in cache
 */
export function setCachedSnapshot(
  snapshot: WalletSnapshot,
  ttlMs: number = DEFAULT_SNAPSHOT_TTL_MS
): void {
  const key = getSnapshotCacheKey(snapshot.xpub);
  const cache: WalletSnapshotCache = {
    snapshot,
    expiresAt: Date.now() + ttlMs,
  };
  
  snapshotCache.set(key, cache);
  console.log(`[SnapshotCache] Cached snapshot for ${snapshot.xpub.substring(0, 20)}... (TTL: ${ttlMs}ms)`);
}

/**
 * Invalidate (remove) a cached snapshot
 */
export function invalidateSnapshot(xpub: string): void {
  const key = getSnapshotCacheKey(xpub);
  snapshotCache.delete(key);
  console.log(`[SnapshotCache] Invalidated snapshot for ${xpub.substring(0, 20)}...`);
}

/**
 * Clear all cached snapshots
 */
export function clearSnapshotCache(): void {
  snapshotCache.clear();
  console.log('[SnapshotCache] Cleared all cached snapshots');
}

/**
 * Get cache statistics for debugging
 */
export function getSnapshotCacheStats(): {
  totalCached: number;
  validCached: number;
  expiredCached: number;
} {
  let validCached = 0;
  let expiredCached = 0;
  
  snapshotCache.forEach((cache) => {
    if (isSnapshotValid(cache)) {
      validCached++;
    } else {
      expiredCached++;
    }
  });
  
  return {
    totalCached: snapshotCache.size,
    validCached,
    expiredCached,
  };
}

/**
 * Execute a function with in-flight request deduplication
 * 
 * If multiple calls are made for the same XPUB before the first completes,
 * they will all wait for and receive the same result, preventing duplicate
 * blockchain API calls.
 * 
 * @param xpub - The XPUB to fetch data for
 * @param fetchFn - The async function that fetches the wallet snapshot
 * @returns Promise that resolves to the wallet snapshot or null on error
 */
export async function withInFlightDeduplication<T extends WalletSnapshot | null>(
  xpub: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = getSnapshotCacheKey(xpub);
  
  // Check cache first - if valid snapshot exists, return it without fetching
  const cached = getCachedSnapshot(xpub);
  if (cached) {
    console.log(`[SnapshotCache] Using cached snapshot for ${xpub.substring(0, 20)}...`);
    return cached as T;
  }
  
  // Check if there's already an in-flight request for this XPUB
  const existing = inFlightRequests.get(key);
  if (existing) {
    console.log(`[SnapshotCache] Reusing in-flight request for ${xpub.substring(0, 20)}...`);
    return existing as Promise<T>;
  }
  
  // Create a new request and track it
  console.log(`[SnapshotCache] Starting new request for ${xpub.substring(0, 20)}...`);
  const request = fetchFn()
    .finally(() => {
      // Clean up in-flight tracking when done
      inFlightRequests.delete(key);
    });
  
  inFlightRequests.set(key, request as Promise<WalletSnapshot | null>);
  return request;
}

/**
 * Check if there's an in-flight request for an XPUB
 */
export function hasInFlightRequest(xpub: string): boolean {
  const key = getSnapshotCacheKey(xpub);
  return inFlightRequests.has(key);
}

/**
 * Get the number of in-flight requests
 */
export function getInFlightRequestCount(): number {
  return inFlightRequests.size;
}
