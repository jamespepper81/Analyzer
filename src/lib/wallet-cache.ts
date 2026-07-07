/**
 * @fileOverview Deferred, deduplicated localStorage persistence for wallet
 * snapshots.
 *
 * Serializing a full WalletData (all transactions and UTXOs) with
 * JSON.stringify blocks the main thread, and getWalletData previously did it
 * inline on every wallet switch and background refresh. This helper
 * - skips the write entirely when the snapshot hasn't meaningfully changed,
 * - defers serialization to browser idle time (with a timeout fallback), and
 * - coalesces rapid successive writes per xpub, keeping only the latest.
 *
 * The stored shape ({ _cacheMetadata: { xpub, timestamp }, data }) is
 * unchanged, so the read path in wallet-context stays as-is.
 */

import type { WalletData } from '@/lib/types';
import { logger } from '@/lib/logger';

type Fingerprint = string;

const lastWritten = new Map<string, Fingerprint>();
const pending = new Map<string, WalletData>();
let flushScheduled = false;

function fingerprint(data: WalletData): Fingerprint {
  const lastTxId = data.transactions.length > 0 ? data.transactions[0].id : '';
  return `${data.transactions.length}:${data.balanceBTC}:${lastTxId}`;
}

let unloadFlushHooked = false;

// Idle-deferred writes would otherwise be lost if the tab is closed or
// backgrounded before the idle callback runs — which would defeat the
// instant cached-reconnect path. Flush synchronously on pagehide (covers
// close / bfcache) and when the tab becomes hidden.
function ensureUnloadFlush() {
  if (unloadFlushHooked || typeof window === 'undefined') return;
  unloadFlushHooked = true;
  const flushNow = () => {
    if (pending.size > 0) flushPendingWrites();
  };
  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
}

function scheduleFlush() {
  ensureUnloadFlush();
  if (flushScheduled) return;
  flushScheduled = true;
  const run = () => {
    flushScheduled = false;
    flushPendingWrites();
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 500 });
  } else {
    setTimeout(run, 200);
  }
}

function flushPendingWrites() {
  for (const [xpub, data] of pending) {
    pending.delete(xpub);
    try {
      const cacheEntry = {
        _cacheMetadata: { xpub, timestamp: Date.now() },
        data,
      };
      localStorage.setItem(`walletCache:${xpub}`, JSON.stringify(cacheEntry));
      lastWritten.set(xpub, fingerprint(data));
    } catch (storageError) {
      logger.warn('[wallet-cache] Failed to persist wallet snapshot', storageError);
    }
  }
}

/** Queue a wallet snapshot for persistence; no-op if nothing changed. */
export function writeWalletCache(xpub: string, data: WalletData): void {
  if (typeof window === 'undefined') return;
  if (lastWritten.get(xpub) === fingerprint(data)) return;
  pending.set(xpub, data);
  scheduleFlush();
}

/** Forget the change-tracking state for an xpub (e.g. after cache removal). */
export function resetWalletCacheTracking(xpub?: string): void {
  if (xpub) {
    lastWritten.delete(xpub);
    pending.delete(xpub);
  } else {
    lastWritten.clear();
    pending.clear();
  }
}
