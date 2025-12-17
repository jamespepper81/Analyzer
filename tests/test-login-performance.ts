/**
 * Login Performance Test for XPUB
 * 
 * This test measures the actual login performance with a real XPUB
 * to verify that the optimizations work correctly and don't cause slowdowns.
 * 
 * Usage: TEST_XPUB="xpub..." npx tsx tests/test-login-performance.ts
 */

import { getWalletData } from '../src/lib/blockchain';
import * as crypto from 'crypto';

const TEST_XPUB = process.env.TEST_XPUB;

if (!TEST_XPUB) {
    console.error('❌ Error: TEST_XPUB environment variable is required');
    console.error('Usage: TEST_XPUB="xpub..." npx tsx tests/test-login-performance.ts');
    console.error('Or set TEST_XPUB in GitHub repository variables for CI/CD');
    process.exit(1);
}

const XPUB: string = TEST_XPUB;

// Performance thresholds
const EXCELLENT_TIME = 10;   // < 10s is excellent
const GOOD_TIME = 20;        // < 20s is good  
const ACCEPTABLE_TIME = 30;  // < 30s is acceptable
const MAX_TIME = 60;         // > 60s is a regression

interface TestResult {
    success: boolean;
    timeSeconds: number;
    addressCount: number;
    balanceBTC: number;
    transactionCount: number;
    rating: string;
    error?: string;
}

async function testLoginPerformance(): Promise<TestResult> {
    console.log('🚀 XPUB Login Performance Test');
    console.log('================================\n');
    
    // Log XPUB hash for identification (privacy-safe)
    const xpubHash = crypto.createHash('sha256').update(XPUB).digest('hex');
    console.log(`XPUB Hash: ${xpubHash.substring(0, 16)}...`);
    console.log(`XPUB Prefix: ${XPUB.substring(0, 4)}`);
    console.log('');
    
    const startTime = Date.now();
    
    try {
        console.log('⏳ Starting wallet data fetch (simulating login)...\n');
        
        const result = await getWalletData(XPUB, 'USD');
        
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const timeSeconds = durationMs / 1000;
        
        if (result.error) {
            return {
                success: false,
                timeSeconds,
                addressCount: 0,
                balanceBTC: 0,
                transactionCount: 0,
                rating: '❌ Failed',
                error: result.error
            };
        }
        
        if (!result.data) {
            return {
                success: false,
                timeSeconds,
                addressCount: 0,
                balanceBTC: 0,
                transactionCount: 0,
                rating: '❌ No Data',
                error: 'No data returned'
            };
        }
        
        // Determine performance rating
        let rating: string;
        if (timeSeconds < EXCELLENT_TIME) {
            rating = '🚀 Excellent';
        } else if (timeSeconds < GOOD_TIME) {
            rating = '✅ Good';
        } else if (timeSeconds < ACCEPTABLE_TIME) {
            rating = '⚠️  Acceptable';
        } else if (timeSeconds < MAX_TIME) {
            rating = '🐢 Slow';
        } else {
            rating = '❌ Too Slow (Regression)';
        }
        
        return {
            success: true,
            timeSeconds,
            addressCount: result.data.usedAddressCount,
            balanceBTC: result.data.balanceBTC,
            transactionCount: result.data.transactions.length,
            rating
        };
        
    } catch (error) {
        const endTime = Date.now();
        const timeSeconds = (endTime - startTime) / 1000;
        
        return {
            success: false,
            timeSeconds,
            addressCount: 0,
            balanceBTC: 0,
            transactionCount: 0,
            rating: '❌ Error',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

async function runTest() {
    const result = await testLoginPerformance();
    
    console.log('\n📊 Test Results');
    console.log('================================');
    console.log(`Status:        ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Time:          ${result.timeSeconds.toFixed(2)}s`);
    console.log(`Rating:        ${result.rating}`);
    console.log(`Addresses:     ${result.addressCount}`);
    console.log(`Balance:       ${result.balanceBTC.toFixed(8)} BTC`);
    console.log(`Transactions:  ${result.transactionCount}`);
    
    if (result.error) {
        console.log(`Error:         ${result.error}`);
    }
    
    console.log('');
    
    // Performance assessment
    console.log('📈 Performance Assessment');
    console.log('================================');
    console.log(`Target (Excellent): < ${EXCELLENT_TIME}s`);
    console.log(`Target (Good):      < ${GOOD_TIME}s`);
    console.log(`Target (Acceptable): < ${ACCEPTABLE_TIME}s`);
    console.log(`Maximum Allowed:    < ${MAX_TIME}s`);
    console.log('');
    
    if (result.timeSeconds > MAX_TIME) {
        console.error(`❌ PERFORMANCE REGRESSION DETECTED!`);
        console.error(`Login took ${result.timeSeconds.toFixed(2)}s, exceeding the ${MAX_TIME}s threshold.`);
        console.error('This indicates a potential performance issue with the address discovery logic.');
        process.exit(1);
    }
    
    if (result.timeSeconds > ACCEPTABLE_TIME) {
        console.warn(`⚠️  WARNING: Login time (${result.timeSeconds.toFixed(2)}s) exceeds acceptable threshold (${ACCEPTABLE_TIME}s)`);
        console.warn('Consider investigating address discovery performance.');
    }
    
    if (!result.success) {
        console.error('❌ Test failed!');
        process.exit(1);
    }
    
    console.log('✅ Test passed successfully!\n');
}

runTest().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
