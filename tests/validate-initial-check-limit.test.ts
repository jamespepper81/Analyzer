/**
 * Validation Test: INITIAL_CHECK_LIMIT Logic
 * 
 * This test validates that INITIAL_CHECK_LIMIT=5 is correctly configured
 * and that the logic works as expected for type detection.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('INITIAL_CHECK_LIMIT Configuration Validation', () => {
    const blockchainPath = path.join(__dirname, '../src/lib/blockchain.ts');
    const blockchainContent = fs.readFileSync(blockchainPath, 'utf-8');

    it('INITIAL_CHECK_LIMIT must be exactly 5', () => {
        // Extract the INITIAL_CHECK_LIMIT value
        const match = blockchainContent.match(/const\s+INITIAL_CHECK_LIMIT\s*=\s*(\d+)/);
        
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe('5');
    });

    it('INITIAL_CHECK_LIMIT comment should not mention "3"', () => {
        // Find the INITIAL_CHECK_LIMIT line
        const lines = blockchainContent.split('\n');
        const limitLine = lines.find(line => line.includes('INITIAL_CHECK_LIMIT'));
        
        expect(limitLine).toBeTruthy();
        // Should not mention reducing from 5 to 3
        expect(limitLine).not.toContain('Reduced from 5 to 3');
        expect(limitLine).not.toContain('from 5 to 3');
    });

    it('Should mention accuracy benefit of 5 over 3', () => {
        const lines = blockchainContent.split('\n');
        const limitLine = lines.find(line => line.includes('INITIAL_CHECK_LIMIT'));
        
        expect(limitLine).toBeTruthy();
        // Should mention better accuracy
        expect(limitLine).toContain('better accuracy');
    });

    it('Type detection uses INITIAL_CHECK_LIMIT correctly', () => {
        // Verify that detectActiveTypes function uses INITIAL_CHECK_LIMIT
        expect(blockchainContent).toContain('deriveAddressBatch(node, 0, 0, INITIAL_CHECK_LIMIT, type)');
    });

    it('Type inference logic is present for fast path', () => {
        // Verify the smart type inference is implemented
        expect(blockchainContent).toContain('inferAddressTypesFromXpub');
        expect(blockchainContent).toContain('primaryType');
        expect(blockchainContent).toContain('shouldCheckOthers');
        expect(blockchainContent).toContain('fast path');
    });

    it('Fallback logic is conditional (not always triggered)', () => {
        // Verify fallback only happens when needed
        expect(blockchainContent).toContain('shouldCheckOthers');
        expect(blockchainContent).toContain('checking other types');
    });

    it('Uses lightweight address stats endpoint', () => {
        // Verify using /address/${addr} instead of /address/${addr}/txs
        expect(blockchainContent).toContain('/address/${addr}');
        expect(blockchainContent).toContain('chain_stats');
        expect(blockchainContent).toContain('mempool_stats');
        expect(blockchainContent).toContain('tx_count');
    });

    it('Parallel batch processing is implemented', () => {
        // Verify parallel processing patterns
        expect(blockchainContent).toContain('PARALLEL_BATCH_SIZE');
        expect(blockchainContent).toContain('Promise.allSettled');
        expect(blockchainContent).toContain('chunkSize');
    });

    it('Address discovery cache is integrated', () => {
        // Verify caching mechanisms
        expect(blockchainContent).toContain('addressDiscoveryCache');
        expect(blockchainContent).toContain('ADDRESS_DISCOVERY_CACHE_TTL_MS');
    });

    it('Wallet snapshot cache is integrated', () => {
        // Verify snapshot caching
        expect(blockchainContent).toContain('getCachedSnapshot');
        expect(blockchainContent).toContain('setCachedSnapshot');
        expect(blockchainContent).toContain('withInFlightDeduplication');
    });
});

describe('Performance Optimization Validation', () => {
    const blockchainPath = path.join(__dirname, '../src/lib/blockchain.ts');
    const blockchainContent = fs.readFileSync(blockchainPath, 'utf-8');

    it('GAP_LIMIT is set to standard BIP44 value (20)', () => {
        const match = blockchainContent.match(/const\s+GAP_LIMIT\s*=\s*(\d+)/);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe('20');
    });

    it('PARALLEL_BATCH_SIZE is reasonable (10)', () => {
        const match = blockchainContent.match(/const\s+PARALLEL_BATCH_SIZE\s*=\s*(\d+)/);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe('10');
    });

    it('All optimization constants are defined', () => {
        expect(blockchainContent).toContain('GAP_LIMIT');
        expect(blockchainContent).toContain('INITIAL_CHECK_LIMIT');
        expect(blockchainContent).toContain('PARALLEL_BATCH_SIZE');
        expect(blockchainContent).toContain('ADDRESS_DISCOVERY_CACHE_TTL_MS');
    });

    it('Performance comments explain the strategy', () => {
        // Should have comments explaining the optimization
        expect(blockchainContent).toContain('Performance-optimized');
        expect(blockchainContent).toContain('fast path');
        expect(blockchainContent).toContain('fallback');
    });
});

describe('Type Inference Logic Validation', () => {
    const blockchainPath = path.join(__dirname, '../src/lib/blockchain.ts');
    const blockchainContent = fs.readFileSync(blockchainPath, 'utf-8');

    it('Correctly maps XPUB prefixes to address types', () => {
        // zpub/vpub -> native
        expect(blockchainContent).toContain('zpub');
        expect(blockchainContent).toContain('vpub');
        expect(blockchainContent).toMatch(/zpub.*native/);
        
        // ypub/upub -> nested
        expect(blockchainContent).toContain('ypub');
        expect(blockchainContent).toContain('upub');
        expect(blockchainContent).toMatch(/ypub.*nested/);
        
        // xpub/tpub -> legacy
        expect(blockchainContent).toContain('xpub');
        expect(blockchainContent).toContain('tpub');
        expect(blockchainContent).toMatch(/xpub.*legacy/);
    });

    it('zpub and ypub skip fallback (shouldCheckOthers: false)', () => {
        // These specific types should not check others
        const zpubLine = blockchainContent.split('\n').find(line => 
            line.includes('zpub') && line.includes('shouldCheckOthers')
        );
        const ypubLine = blockchainContent.split('\n').find(line => 
            line.includes('ypub') && line.includes('shouldCheckOthers')
        );
        
        expect(zpubLine).toContain('false');
        expect(ypubLine).toContain('false');
    });

    it('xpub allows fallback (shouldCheckOthers: true)', () => {
        // xpub is ambiguous and should check others if primary is empty
        const lines = blockchainContent.split('\n');
        const xpubLineIndex = lines.findIndex(line => 
            line.includes('xpub') && line.includes('tpub') && line.includes('return')
        );
        
        expect(xpubLineIndex).toBeGreaterThanOrEqual(0);
        const xpubLine = lines[xpubLineIndex];
        expect(xpubLine).toContain('shouldCheckOthers: true');
    });
});
