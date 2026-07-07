/**
 * Unit test for address discovery optimization
 * Validates that the parallel batching logic is implemented correctly
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock test to verify the constants and logic are set up correctly
describe('Address Discovery Optimization', () => {
    const blockchainPath = path.join(__dirname, '../src/lib/blockchain.ts');

    it('Constants are defined correctly', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // Verify the optimization constants are present
        expect(content).toContain('ADDRESS_BUNDLE_CHUNK_SIZE');
        expect(content).toContain('GAP_LIMIT');
        expect(content).toContain('INITIAL_CHECK_LIMIT');
        expect(content).toContain('ADDRESS_DISCOVERY_CACHE_TTL_MS');

        // Verify Promise.allSettled is used for parallel processing
        expect(content).toContain('Promise.allSettled');

        // Verify performance logging is added
        expect(content).toContain('discoveryStartTime');
        expect(content).toContain('totalDiscoveryTime');
    });

    it('Caches discovery results and infers address types from XPUB prefixes', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');

        expect(content).toContain('addressDiscoveryCache');
        expect(content).toContain('addressDiscoveryPromises');
        expect(content).toContain('inferAddressTypesFromXpub');
    });
    
    it('Smart type inference with primary type and conditional fallback', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // Verify improved inference returns structured result
        expect(content).toContain('primaryType');
        expect(content).toContain('shouldCheckOthers');
        expect(content).toContain('otherTypes');
        
        // Verify zpub/ypub skip fallback (specific types)
        expect(content).toContain('shouldCheckOthers: false');
        
        // Verify xpub allows fallback (ambiguous type)
        expect(content).toContain('shouldCheckOthers: true');
        
        // Verify precomputed type arrays for performance
        expect(content).toContain('ALL_ADDRESS_TYPES');
        expect(content).toContain('TYPES_WITHOUT_NATIVE');
        expect(content).toContain('TYPES_WITHOUT_NESTED');
        expect(content).toContain('TYPES_WITHOUT_LEGACY');
    });
    
    it('Optimized discovery with fast path and conditional fallback', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // Verify fast path that tries primary type first
        expect(content).toContain('fast path');
        expect(content).toContain('inferenceResult.primaryType');
        
        // Verify early exit when addresses found with descriptive variable names
        expect(content).toContain('primaryDiscoveredAddresses');
        expect(content).toContain('fallbackDiscoveredAddresses');
        expect(content).toContain('unknownPrefixDiscoveredAddresses');
        expect(content).toContain('return primaryDiscoveredAddresses');
        
        // Verify conditional fallback only for ambiguous types
        expect(content).toContain('inferenceResult.shouldCheckOthers');
        expect(content).toContain('checking other types for xpub');
    });
    
    it('INITIAL_CHECK_LIMIT is set to 5 for accurate type detection', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // Verify INITIAL_CHECK_LIMIT is 5 (provides better accuracy than 3)
        expect(content).toMatch(/const\s+INITIAL_CHECK_LIMIT\s*=\s*5/);
        expect(content).toContain('5 provides better accuracy');
    });
    
    it('Uses constants for maintainability (XPUB_LOG_PREFIX_LENGTH)', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // Verify XPUB_LOG_PREFIX_LENGTH constant is defined
        expect(content).toContain('XPUB_LOG_PREFIX_LENGTH');
        expect(content).toContain('substring(0, XPUB_LOG_PREFIX_LENGTH)');
    });
    
    it('Parallel type detection is implemented', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');

        // Type detection probes every candidate type in one batched
        // server call (Server Actions execute serially per client)
        expect(content).toContain('typesToCheck.map((type)');
        expect(content).toContain('getAddressStatsBatch(flatAddresses)');
        expect(content).toContain('activeTypes.push');
    });
    
    it('Parallel address discovery is implemented', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // The whole gap window resolves in one batched server round trip;
        // the server fans out to the provider in parallel
        expect(content).toContain('await getAddressStatsBatch(batch)');
        
        // Should use Promise.allSettled for resilience
        expect(content).toContain('Promise.allSettled');
    });

    it('Uses lightweight address stats endpoint for discovery', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // Should use batched /address stats lookups instead of /txs
        expect(content).toContain('getAddressStatsBatch');
        
        // Should combine chain + mempool transaction counts
        expect(content).toContain('chain_stats');
        expect(content).toContain('mempool_stats');
        expect(content).toContain('tx_count');
    });

    it('Wallet snapshot cache is integrated', () => {
        const content = fs.readFileSync(blockchainPath, 'utf-8');
        
        // Should import snapshot cache utilities
        expect(content).toContain('getCachedSnapshot');
        expect(content).toContain('setCachedSnapshot');
        expect(content).toContain('withInFlightDeduplication');
        
        // Should have fetchWalletSnapshot function
        expect(content).toContain('fetchWalletSnapshot');
        
        // Should check cache before fetching
        expect(content).toContain('No cached snapshot');
        expect(content).toContain('Using cached snapshot');
    });
});

describe('Progressive connect performance regression guards', () => {
    const blockchainPath = path.join(__dirname, '../src/lib/blockchain.ts');
    const content = fs.readFileSync(blockchainPath, 'utf-8');

    it('Both the progressive and snapshot paths use the shared bounded fetcher', () => {
        // The bounded worker-pool helper exists and is reused, not duplicated.
        expect(content).toContain('fetchAddressDataConcurrent');
        expect(content).toContain('ADDRESS_DATA_CONCURRENCY');
        const usages = content.match(/fetchAddressDataConcurrent\(/g) ?? [];
        // One definition + at least two call sites (fetchWalletSnapshot + progressive).
        expect(usages.length).toBeGreaterThanOrEqual(3);
    });

    it('getWalletDataProgressive does not fetch per-address data inside onAddressFound', () => {
        // The discovery callback must only COLLECT addresses; fetching there is
        // exactly the unbounded-flood regression we removed.
        const start = content.indexOf('getWalletDataProgressive');
        const slice = content.slice(start);
        const callbackStart = slice.indexOf('onAddressFound:');
        const callbackEnd = slice.indexOf('onBatchComplete:');
        expect(callbackStart).toBeGreaterThan(-1);
        expect(callbackEnd).toBeGreaterThan(callbackStart);
        const callbackBody = slice.slice(callbackStart, callbackEnd);
        expect(callbackBody).not.toContain('esploraGet');
    });

    it('Progressive discovery is wrapped in the discovery timeout for parity', () => {
        expect(content).toContain('DISCOVERY_TIMEOUT_MS');
        // The progressive path should race discovery against the timeout.
        const start = content.indexOf('getWalletDataProgressive');
        const slice = content.slice(start);
        expect(slice).toContain('Promise.race');
        expect(slice).toContain('DISCOVERY_TIMEOUT_MS');
    });

    it('Discovery-phase progress emits never report isComplete:true', () => {
        // discoverUsedAddressesProgressive fires a final onBatchComplete with
        // isComplete:true when DISCOVERY ends - but the heavy fetch still follows.
        // emitDiscoveryProgress must override isComplete:false, otherwise the
        // dashboard flips out of loading (and clobbers cached data) with an empty
        // zero-balance wallet before any transaction data is fetched.
        const start = content.indexOf('const emitDiscoveryProgress');
        const end = content.indexOf('};', start);
        expect(start).toBeGreaterThan(-1);
        const body = content.slice(start, end);
        expect(body).toContain('isComplete: false');
    });
});
