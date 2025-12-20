/**
 * Multiple Performance Test Runs
 * 
 * Runs the login performance test multiple times to validate consistency
 * and ensure the fix is reliable across different runs.
 */

import { getWalletData } from '../src/lib/blockchain';
import { clearSnapshotCache } from '../src/lib/wallet-snapshot-cache';
import * as crypto from 'crypto';

const TEST_XPUB = process.env.TEST_XPUB;

if (!TEST_XPUB) {
    console.error('❌ Error: TEST_XPUB environment variable is required');
    console.error('Usage: TEST_XPUB="xpub..." npx tsx tests/run-multiple-performance-tests.ts');
    process.exit(1);
}

const XPUB: string = TEST_XPUB;
const NUM_RUNS = 3; // Number of test runs

interface TestRun {
    runNumber: number;
    success: boolean;
    timeSeconds: number;
    addressCount: number;
    transactionCount: number;
    rating: string;
    usedCache: boolean;
}

async function runSingleTest(runNumber: number, clearCache: boolean): Promise<TestRun> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Test Run #${runNumber}`);
    console.log('='.repeat(60));
    
    if (clearCache) {
        console.log('🧹 Clearing cache for fresh test...');
        clearSnapshotCache();
    } else {
        console.log('♻️  Using cached data if available...');
    }
    
    const startTime = Date.now();
    
    try {
        const result = await getWalletData(XPUB, 'USD');
        const endTime = Date.now();
        const timeSeconds = (endTime - startTime) / 1000;
        
        if (result.error || !result.data) {
            return {
                runNumber,
                success: false,
                timeSeconds,
                addressCount: 0,
                transactionCount: 0,
                rating: '❌ Failed',
                usedCache: false
            };
        }
        
        let rating: string;
        if (timeSeconds < 10) {
            rating = '🚀 Excellent';
        } else if (timeSeconds < 20) {
            rating = '✅ Good';
        } else if (timeSeconds < 30) {
            rating = '⚠️  Acceptable';
        } else {
            rating = '🐢 Slow';
        }
        
        const usedCache = timeSeconds < 2; // Cache hits are typically < 2s
        
        console.log(`⏱️  Time: ${timeSeconds.toFixed(2)}s`);
        console.log(`📊 Addresses: ${result.data.usedAddressCount}`);
        console.log(`📝 Transactions: ${result.data.transactions.length}`);
        console.log(`🏆 Rating: ${rating}`);
        console.log(`💾 Cache: ${usedCache ? 'Hit ✅' : 'Miss (fresh fetch)'}`);
        
        return {
            runNumber,
            success: true,
            timeSeconds,
            addressCount: result.data.usedAddressCount,
            transactionCount: result.data.transactions.length,
            rating,
            usedCache
        };
        
    } catch (error) {
        const endTime = Date.now();
        const timeSeconds = (endTime - startTime) / 1000;
        
        console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        
        return {
            runNumber,
            success: false,
            timeSeconds,
            addressCount: 0,
            transactionCount: 0,
            rating: '❌ Error',
            usedCache: false
        };
    }
}

async function runMultipleTests() {
    console.log('🚀 Multiple Performance Test Runs');
    console.log('==================================\n');
    
    const xpubHash = crypto.createHash('sha256').update(XPUB).digest('hex');
    console.log(`XPUB Hash: ${xpubHash.substring(0, 16)}...`);
    console.log(`XPUB Prefix: ${XPUB.substring(0, 4)}`);
    console.log(`Number of Runs: ${NUM_RUNS}`);
    
    const results: TestRun[] = [];
    
    // Run 1: Fresh test (no cache)
    results.push(await runSingleTest(1, true));
    
    // Wait a bit between runs
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run 2: Second test (should use cache)
    results.push(await runSingleTest(2, false));
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run 3: Fresh test again (clear cache)
    results.push(await runSingleTest(3, true));
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 SUMMARY OF ALL RUNS');
    console.log('='.repeat(60));
    
    console.log('\n| Run | Status | Time | Rating | Cache | Addresses | TXs |');
    console.log('|-----|--------|------|--------|-------|-----------|-----|');
    
    results.forEach(run => {
        console.log(
            `| ${run.runNumber}   | ${run.success ? '✅' : '❌'}     | ${run.timeSeconds.toFixed(2)}s | ${run.rating.padEnd(15)} | ${run.usedCache ? 'Hit' : 'Miss'} | ${run.addressCount.toString().padEnd(9)} | ${run.transactionCount.toString().padEnd(3)} |`
        );
    });
    
    console.log('');
    
    // Statistics
    const successfulRuns = results.filter(r => r.success);
    const freshRuns = results.filter(r => r.success && !r.usedCache);
    
    if (successfulRuns.length === 0) {
        console.error('❌ All runs failed!');
        process.exit(1);
    }
    
    const avgTime = successfulRuns.reduce((sum, r) => sum + r.timeSeconds, 0) / successfulRuns.length;
    const minTime = Math.min(...successfulRuns.map(r => r.timeSeconds));
    const maxTime = Math.max(...successfulRuns.map(r => r.timeSeconds));
    
    const avgFreshTime = freshRuns.length > 0 
        ? freshRuns.reduce((sum, r) => sum + r.timeSeconds, 0) / freshRuns.length
        : 0;
    
    console.log('📈 Statistics');
    console.log('-------------');
    console.log(`Total Runs:        ${results.length}`);
    console.log(`Successful:        ${successfulRuns.length}/${results.length}`);
    console.log(`Fresh Runs:        ${freshRuns.length}`);
    console.log(`Cached Runs:       ${successfulRuns.length - freshRuns.length}`);
    console.log('');
    console.log(`Average Time:      ${avgTime.toFixed(2)}s`);
    console.log(`Min Time:          ${minTime.toFixed(2)}s`);
    console.log(`Max Time:          ${maxTime.toFixed(2)}s`);
    console.log(`Avg Fresh Time:    ${avgFreshTime > 0 ? avgFreshTime.toFixed(2) + 's' : 'N/A'}`);
    console.log('');
    
    // Performance assessment
    console.log('🎯 Performance Assessment');
    console.log('-------------------------');
    
    const avgFreshPerf = avgFreshTime > 0 ? avgFreshTime : avgTime;
    
    if (avgFreshPerf < 10) {
        console.log(`✅ EXCELLENT: Average fresh login time ${avgFreshPerf.toFixed(2)}s < 10s threshold`);
    } else if (avgFreshPerf < 20) {
        console.log(`✅ GOOD: Average fresh login time ${avgFreshPerf.toFixed(2)}s < 20s threshold`);
    } else if (avgFreshPerf < 30) {
        console.log(`⚠️  ACCEPTABLE: Average fresh login time ${avgFreshPerf.toFixed(2)}s < 30s threshold`);
    } else if (avgFreshPerf < 60) {
        console.log(`🐢 SLOW: Average fresh login time ${avgFreshPerf.toFixed(2)}s < 60s threshold`);
    } else {
        console.log(`❌ REGRESSION: Average fresh login time ${avgFreshPerf.toFixed(2)}s > 60s threshold`);
        process.exit(1);
    }
    
    // Consistency check
    const freshTimes = freshRuns.map(r => r.timeSeconds);
    if (freshTimes.length >= 2) {
        const variance = freshTimes.reduce((sum, t) => sum + Math.pow(t - avgFreshTime, 2), 0) / freshTimes.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = (stdDev / avgFreshTime) * 100;
        
        console.log('');
        console.log('📊 Consistency Analysis (Fresh Runs Only)');
        console.log('------------------------------------------');
        console.log(`Standard Deviation: ${stdDev.toFixed(2)}s`);
        console.log(`Coefficient of Variation: ${coefficientOfVariation.toFixed(1)}%`);
        
        if (coefficientOfVariation < 10) {
            console.log(`✅ HIGHLY CONSISTENT: CV < 10%`);
        } else if (coefficientOfVariation < 20) {
            console.log(`✅ CONSISTENT: CV < 20%`);
        } else if (coefficientOfVariation < 30) {
            console.log(`⚠️  MODERATE VARIANCE: CV < 30%`);
        } else {
            console.log(`⚠️  HIGH VARIANCE: CV > 30% (network conditions may vary)`);
        }
    }
    
    console.log('');
    console.log('✨ Testing Complete!');
    
    // Exit with success if average is acceptable
    if (avgFreshPerf < 60 && successfulRuns.length === results.length) {
        console.log('✅ All tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests had issues');
        process.exit(1);
    }
}

runMultipleTests().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
