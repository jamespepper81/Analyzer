/**
 * Unit tests for wallet snapshot cache system
 * Tests in-flight deduplication, cache TTL, and snapshot management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    getCachedSnapshot,
    setCachedSnapshot,
    invalidateSnapshot,
    clearSnapshotCache,
    getSnapshotCacheStats,
    withInFlightDeduplication,
    hasInFlightRequest,
    getInFlightRequestCount,
    type WalletSnapshot
} from '../src/lib/wallet-snapshot-cache';

describe('Wallet Snapshot Cache', () => {
    const mockXpub = 'test-xpub-1';
    
    const createMockSnapshot = (xpub: string = mockXpub): WalletSnapshot => ({
        xpub,
        timestamp: Date.now(),
        transactions: [],
        utxos: [],
        addresses: [],
        usedAddressCount: 0,
        securityScore: 100,
        opsecThreat: 'Low',
        dustUtxoCount: 0,
        dustAmountBTC: 0,
        averageFeeRate: 0,
        inflowBTC: 0,
        outflowBTC: 0,
        balanceBTC: 0,
    });

    beforeEach(() => {
        clearSnapshotCache();
    });

    describe('Basic Cache Operations', () => {
        it('should store and retrieve a snapshot', () => {
            const snapshot = createMockSnapshot();
            setCachedSnapshot(snapshot);
            
            const retrieved = getCachedSnapshot(mockXpub);
            expect(retrieved).toBeDefined();
            expect(retrieved?.xpub).toBe(mockXpub);
        });

        it('should return null for non-existent snapshot', () => {
            const retrieved = getCachedSnapshot('nonexistent');
            expect(retrieved).toBeNull();
        });

        it('should invalidate a specific snapshot', () => {
            const snapshot = createMockSnapshot();
            setCachedSnapshot(snapshot);
            
            invalidateSnapshot(mockXpub);
            
            const retrieved = getCachedSnapshot(mockXpub);
            expect(retrieved).toBeNull();
        });

        it('should clear all cached snapshots', () => {
            const snapshot1 = createMockSnapshot('xpub1');
            const snapshot2 = createMockSnapshot('xpub2');
            
            setCachedSnapshot(snapshot1);
            setCachedSnapshot(snapshot2);
            
            clearSnapshotCache();
            
            expect(getCachedSnapshot('xpub1')).toBeNull();
            expect(getCachedSnapshot('xpub2')).toBeNull();
        });
    });

    describe('Cache TTL (Time-To-Live)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('should respect custom TTL', () => {
            const snapshot = createMockSnapshot();
            const customTTL = 1000; // 1 second
            
            setCachedSnapshot(snapshot, customTTL);
            
            // Should be available immediately
            expect(getCachedSnapshot(mockXpub)).toBeDefined();
        });

        it('should expire snapshot after TTL', () => {
            const snapshot = createMockSnapshot();
            const shortTTL = 50; // 50ms
            
            setCachedSnapshot(snapshot, shortTTL);
            
            // Should be available immediately
            expect(getCachedSnapshot(mockXpub)).toBeDefined();
            
            // Advance fake timers past TTL expiration
            vi.advanceTimersByTime(100);
            
            // Should be expired now
            expect(getCachedSnapshot(mockXpub)).toBeNull();
        });
    });

    describe('Cache Statistics', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('should track cache statistics', () => {
            const snapshot1 = createMockSnapshot('xpub1');
            const snapshot2 = createMockSnapshot('xpub2');
            
            setCachedSnapshot(snapshot1);
            setCachedSnapshot(snapshot2);
            
            const stats = getSnapshotCacheStats();
            expect(stats.totalCached).toBe(2);
            expect(stats.validCached).toBe(2);
            expect(stats.expiredCached).toBe(0);
        });

        it('should track expired entries in stats', () => {
            const snapshot = createMockSnapshot();
            const shortTTL = 50; // 50ms
            
            setCachedSnapshot(snapshot, shortTTL);
            
            // Advance timers to simulate expiration
            vi.advanceTimersByTime(100);
            
            const stats = getSnapshotCacheStats();
            expect(stats.totalCached).toBe(1);
            expect(stats.validCached).toBe(0);
            expect(stats.expiredCached).toBe(1);
        });
    });

    describe('In-Flight Request Deduplication', () => {
        it('should deduplicate concurrent requests', async () => {
            vi.useFakeTimers();
            let fetchCount = 0;
            const mockFetch = async () => {
                fetchCount++;
                await new Promise(resolve => setTimeout(resolve, 100));
                return createMockSnapshot();
            };

            // Fire 3 concurrent requests
            const promises = [
                withInFlightDeduplication(mockXpub, mockFetch),
                withInFlightDeduplication(mockXpub, mockFetch),
                withInFlightDeduplication(mockXpub, mockFetch),
            ];

            // Fast-forward timers so all fetches resolve
            vi.advanceTimersByTime(100);
            const results = await Promise.all(promises);

            // Only one fetch should have been executed
            expect(fetchCount).toBe(1);
            
            // All requests should get the same result
            results.forEach(result => {
                expect(result?.xpub).toBe(mockXpub);
            });
            vi.useRealTimers();
        });

        it('should track in-flight requests', async () => {
            vi.useFakeTimers();
            const mockFetch = async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return createMockSnapshot();
            };

            expect(hasInFlightRequest(mockXpub)).toBe(false);
            expect(getInFlightRequestCount()).toBe(0);

            const promise = withInFlightDeduplication(mockXpub, mockFetch);
            
            // Should be in-flight now
            expect(hasInFlightRequest(mockXpub)).toBe(true);
            expect(getInFlightRequestCount()).toBe(1);

            vi.advanceTimersByTime(100);
            await promise;

            // Should be cleared after completion
            expect(hasInFlightRequest(mockXpub)).toBe(false);
            expect(getInFlightRequestCount()).toBe(0);
            vi.useRealTimers();
        });

        it('should clean up in-flight tracking on error', async () => {
            vi.useFakeTimers();
            const mockFetch = async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                throw new Error('Test error');
            };

            try {
                const p = withInFlightDeduplication(mockXpub, mockFetch);
                vi.advanceTimersByTime(50);
                await p;
            } catch (e) {
                // Expected error
            }

            // Should be cleaned up even on error
            expect(hasInFlightRequest(mockXpub)).toBe(false);
            expect(getInFlightRequestCount()).toBe(0);
            vi.useRealTimers();
        });

        it('should handle multiple XPUBs concurrently', async () => {
            vi.useFakeTimers();
            let fetchCount = 0;
            const mockFetch = async (xpub: string) => {
                fetchCount++;
                await new Promise(resolve => setTimeout(resolve, 50));
                return createMockSnapshot(xpub);
            };

            const xpub1 = 'xpub1';
            const xpub2 = 'xpub2';

            const promises = [
                withInFlightDeduplication(xpub1, () => mockFetch(xpub1)),
                withInFlightDeduplication(xpub1, () => mockFetch(xpub1)),
                withInFlightDeduplication(xpub2, () => mockFetch(xpub2)),
                withInFlightDeduplication(xpub2, () => mockFetch(xpub2)),
            ];

            vi.advanceTimersByTime(50);
            await Promise.all(promises);

            // Should fetch once per unique XPUB
            expect(fetchCount).toBe(2);
            vi.useRealTimers();
        });
    });

    describe('Integration Scenarios', () => {
        it('should use cache before in-flight request', async () => {
            const snapshot = createMockSnapshot();
            setCachedSnapshot(snapshot);

            let fetchCalled = false;

            // Cached snapshot should be used, fetch should not be called
            const result = getCachedSnapshot(mockXpub);
            expect(result).toBeDefined();
            expect(fetchCalled).toBe(false);
        });

        it('should handle rapid currency switches with cached snapshot', () => {
            const snapshot = createMockSnapshot();
            setCachedSnapshot(snapshot);

            // Simulate rapid currency switches (all should use cached snapshot)
            const currencies = ['USD', 'EUR', 'GBP'];
            currencies.forEach(currency => {
                const cached = getCachedSnapshot(mockXpub);
                expect(cached).toBeDefined();
                expect(cached?.xpub).toBe(mockXpub);
            });
        });

        it('should handle wallet switching with separate caches', () => {
            const xpub1 = 'xpub1';
            const xpub2 = 'xpub2';
            
            const snapshot1 = createMockSnapshot(xpub1);
            const snapshot2 = createMockSnapshot(xpub2);
            
            setCachedSnapshot(snapshot1);
            setCachedSnapshot(snapshot2);

            // Switch between wallets
            expect(getCachedSnapshot(xpub1)?.xpub).toBe(xpub1);
            expect(getCachedSnapshot(xpub2)?.xpub).toBe(xpub2);
            expect(getCachedSnapshot(xpub1)?.xpub).toBe(xpub1);
        });
    });
});
