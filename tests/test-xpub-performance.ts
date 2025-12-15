/**
 * Performance test for XPUB address discovery
 * Tests the optimized parallel address discovery implementation
 */

import { getWalletData } from '../src/lib/blockchain';

// Test XPUB - this should be set from environment variable
const TEST_XPUB = process.env.TEST_XPUB || 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';

async function testXpubPerformance() {
    console.log('🚀 Starting XPUB Performance Test');
    console.log('=====================================');
    console.log(`Testing with XPUB: ${TEST_XPUB.substring(0, 20)}...`);
    console.log('');
    
    const startTime = Date.now();
    
    try {
        console.log('⏳ Discovering addresses and fetching wallet data...');
        const result = await getWalletData(TEST_XPUB, 'USD');
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
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
        const performanceRating = duration < 10 ? '🚀 Excellent' : 
                                   duration < 20 ? '✅ Good' : 
                                   duration < 30 ? '⚠️  Acceptable' : 
                                   '❌ Needs Improvement';
        
        console.log(`📈 Performance Rating: ${performanceRating}`);
        console.log('');
        
        if (parseFloat(duration) > expectedMaxTime) {
            console.warn(`⚠️  Warning: Time exceeded expected maximum of ${expectedMaxTime}s`);
        }
        
        // Verify address type detection worked
        const addressTypes = new Set<string>();
        result.data.addresses.forEach(addr => {
            if (addr.address.startsWith('bc1')) {
                addressTypes.add('Native SegWit (P2WPKH)');
            } else if (addr.address.startsWith('3')) {
                addressTypes.add('Nested SegWit (P2SH)');
            } else if (addr.address.startsWith('1')) {
                addressTypes.add('Legacy (P2PKH)');
            }
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
