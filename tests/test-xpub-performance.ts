/**
 * Performance test for XPUB address discovery
 * Tests the optimized parallel address discovery implementation
 */

import { getWalletData } from '../src/lib/blockchain';
import { getAddressType } from '../src/lib/utils';
import * as crypto from 'crypto';

// Test XPUB - MUST be set from environment variable or GitHub secrets
// DO NOT hardcode real XPUBs in the codebase as they reveal wallet structure
const TEST_XPUB = process.env.TEST_XPUB;

if (!TEST_XPUB) {
    console.error('❌ Error: TEST_XPUB environment variable is required');
    console.error('Usage: TEST_XPUB="xpub..." npx tsx tests/test-xpub-performance.ts');
    console.error('Or set TEST_XPUB in GitHub secrets for CI/CD testing');
    process.exit(1);
}

// Type assertion: TEST_XPUB is guaranteed to be defined after the check above
const XPUB: string = TEST_XPUB;

async function testXpubPerformance() {
    console.log('🚀 Starting XPUB Performance Test');
    console.log('=====================================');
    // Log a hash of the XPUB for identification without leaking sensitive information
    const xpubHash = crypto.createHash('sha256').update(XPUB).digest('hex');
    console.log(`Testing with XPUB hash: ${xpubHash.substring(0, 12)}...`);
    console.log('');
    
    const startTime = Date.now();
    
    try {
        console.log('⏳ Discovering addresses and fetching wallet data...');
        const result = await getWalletData(XPUB, 'USD');
        
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const durationSeconds = durationMs / 1000;
        const duration = durationSeconds.toFixed(2);
        
        if (result.error) {
            console.error('❌ Error:', result.error);
            process.exit(1);
        }
        
        if (!result.data) {
            console.error('❌ No data returned');
            process.exit(1);
        }
        
        console.log('');
        console.log('✅ SUCCESS!');
        console.log('=====================================');
        console.log(`⏱️  Total time: ${duration}s`);
        console.log(`📊 Addresses found: ${result.data.usedAddressCount}`);
        console.log(`💰 Balance: ${result.data.balanceBTC.toFixed(8)} BTC`);
        console.log(`📝 Transactions: ${result.data.transactions.length}`);
        console.log(`🔒 Security Score: ${result.data.securityScore}/100`);
        console.log(`⚠️  OPSEC Threat: ${result.data.opsecThreat}`);
        console.log(`💎 UTXOs: ${result.data.utxos.length}`);
        console.log('');
        
        // Performance targets
        const expectedMaxTime = 20; // seconds
        const EXCELLENT_MAX_TIME = 10;
        const GOOD_MAX_TIME = 20;
        const ACCEPTABLE_MAX_TIME = 30;
        
        const performanceRating = durationSeconds < EXCELLENT_MAX_TIME ? '🚀 Excellent' : 
                                   durationSeconds < GOOD_MAX_TIME ? '✅ Good' : 
                                   durationSeconds < ACCEPTABLE_MAX_TIME ? '⚠️  Acceptable' : 
                                   '❌ Needs Improvement';
        
        console.log(`📈 Performance Rating: ${performanceRating}`);
        console.log('');
        
        if (durationSeconds > expectedMaxTime) {
            console.warn(`⚠️  Warning: Time exceeded expected maximum of ${expectedMaxTime}s`);
        }
        
        // Verify address type detection worked
        const addressTypes = new Set<string>();
        result.data.addresses.forEach(addr => {
            const type = getAddressType(addr.address);
            if (type) addressTypes.add(type);
        });
        
        if (addressTypes.size > 0) {
            console.log('📋 Address types detected:');
            addressTypes.forEach(type => console.log(`   - ${type}`));
        }
        
        console.log('');
        console.log('🎉 Test completed successfully!');
        
    } catch (error) {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.error('');
        console.error('❌ Test failed!');
        console.error(`⏱️  Time before failure: ${duration}s`);
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Run the test
testXpubPerformance().catch(console.error);
