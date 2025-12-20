# Testing Guide for XPUB Performance Optimization

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
# Unit tests only
npm test -- tests/address-discovery-unit.test.ts

# Tax calculation tests
npm test -- tests/tax-calculations.test.ts
```

## Performance Testing with Real XPUB

### Prerequisites
- A Bitcoin XPUB key (Extended Public Key) for testing
- The XPUB should have some transaction history for meaningful results
- Set the XPUB via environment variable (never hardcode in source)

### Running Performance Tests

#### Option 1: One-time Test
```bash
TEST_XPUB="xpub6..." npx tsx tests/test-xpub-performance.ts
```

#### Option 2: Set Environment Variable
```bash
export TEST_XPUB="[REDACTED_TEST_XPUB]"
npx tsx tests/test-xpub-performance.ts
```

#### Option 3: GitHub Actions / CI/CD
Store the test XPUB as a GitHub secret named `TEST_XPUB` and reference it in workflows:

```yaml
- name: Run Performance Test
  run: npx tsx tests/test-xpub-performance.ts
  env:
    TEST_XPUB: ${{ secrets.TEST_XPUB }}
```

### Expected Output

```
🚀 Starting XPUB Performance Test
=====================================
Testing with XPUB: xpub6CUGRUonZSQ4...
⏳ Discovering addresses and fetching wallet data...

✅ SUCCESS!
=====================================
⏱️  Total time: 4.23s
📊 Addresses found: 127
💰 Balance: 0.12345678 BTC
📝 Transactions: 234
🔒 Security Score: 85/100
⚠️  OPSEC Threat: Medium
💎 UTXOs: 45

📈 Performance Rating: 🚀 Excellent

📋 Address types detected:
   - Native SegWit (P2WPKH)
   - Nested SegWit (P2SH)

🎉 Test completed successfully!
```

### Performance Benchmarks

| Performance Rating | Time Range | Expected for |
|-------------------|------------|--------------|
| 🚀 Excellent | < 10s | Small-medium wallets |
| ✅ Good | 10-20s | Medium-large wallets |
| ⚠️ Acceptable | 20-30s | Large wallets (200+ addresses) |
| ❌ Needs Improvement | > 30s | Very large wallets or network issues |

## Testing Different Address Types

The optimization supports all Bitcoin address formats:

### Native SegWit (P2WPKH - bech32)
- Address format: `bc1q...`
- Most efficient and modern
- Lowest transaction fees

### Legacy (P2PKH)
- Address format: `1...`
- Original Bitcoin address format
- Higher transaction fees

### Nested SegWit (P2SH)
- Address format: `3...`
- Backward-compatible SegWit
- Medium transaction fees

### Testing Multi-Format Wallets

To test a wallet that uses multiple address types:

```bash
# This XPUB has transactions across all 3 types
TEST_XPUB="xpub..." npx tsx tests/test-xpub-performance.ts
```

The test will report which address types were detected:
```
📋 Address types detected:
   - Native SegWit (P2WPKH)
   - Nested SegWit (P2SH)
   - Legacy (P2PKH)
```

## Debugging Slow Performance

### Enable Verbose Logging

Check browser console or server logs for detailed timing:

```
[Discovery] Detected active wallet types: native, nested in 1250ms
[Discovery] Found 127 used addresses in 4823ms (4.82s)
```

### Common Issues

#### 1. Slow Network Connection
**Symptoms**: All operations are slow, not just address discovery
**Solution**: Test from a better network or closer to API servers

#### 2. API Rate Limiting
**Symptoms**: Many failed requests in logs
**Solution**: Reduce `PARALLEL_BATCH_SIZE` in `src/lib/blockchain.ts`

#### 3. Large Wallet
**Symptoms**: Consistent 15-20+ second discovery times
**Expected**: Wallets with 200+ addresses will naturally take longer
**Solution**: Consider implementing address caching (future optimization)

#### 4. Blockstream API Issues
**Symptoms**: Errors mentioning "ESPLORA_PROVIDER_NOTICE"
**Expected**: Automatic failover to mempool.space
**Solution**: Wait a moment and retry, or check API status

### Testing API Response Times

```bash
# Test Blockstream API
curl -w "%{time_total}\n" -o /dev/null -s https://blockstream.info/api/blocks/tip/height

# Test mempool.space API
curl -w "%{time_total}\n" -o /dev/null -s https://mempool.space/api/blocks/tip/height
```

Good response time: < 0.3 seconds
Acceptable: 0.3-1.0 seconds
Slow: > 1.0 seconds

## Test Coverage

### Current Coverage

| Area | Coverage | Tests |
|------|----------|-------|
| Address Discovery Optimization | ✅ Covered | Unit tests |
| Parallel Type Detection | ✅ Covered | Unit tests |
| Chunked Parallel Processing | ✅ Covered | Unit tests |
| Tax Calculations | ✅ Covered | Unit tests |
| End-to-End Performance | ⚠️ Manual | Performance test script |

### Running Coverage Report

```bash
npm test -- --coverage
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/performance-test.yml`:

```yaml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test
        
      - name: Run performance test
        run: npx tsx tests/test-xpub-performance.ts
        env:
          TEST_XPUB: ${{ secrets.TEST_XPUB }}
        continue-on-error: true  # Don't fail CI if API is slow
```

## Test Data

### Safe Test XPUBs

These are publicly known test XPUBs that can be used safely:

**Bitcoin Testnet XPUB** (recommended for development):
```
tpubD6NzVbkrYhZ4XgiXtGrdW5XDAPFCL9h7we1vwNCpn8tGbBcgfVYjXyhWo4E1xkh56hjod1RhGjxbaTLV3X4FyWuejifB9jusQ46QzG87VKp
```

**Empty Mainnet XPUB** (for testing empty wallet scenario):
```
xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8
```

⚠️ **Warning**: Never use your personal XPUB in public examples or documentation!

## Troubleshooting Test Failures

### "TEST_XPUB environment variable is required"

**Cause**: Performance test script needs an XPUB to test
**Solution**: Set TEST_XPUB environment variable

```bash
export TEST_XPUB="xpub..."
npx tsx tests/test-xpub-performance.ts
```

### "Upstream data provider is temporarily unavailable"

**Cause**: Both Blockstream and mempool.space APIs are down or rate-limiting
**Solution**: 
1. Wait a few minutes and retry
2. Check API status pages
3. Reduce concurrent requests if rate-limited

### Test timeouts

**Cause**: Large wallet or slow network
**Solution**: Increase test timeout in test configuration

```typescript
// In vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 60000, // 60 seconds
  },
});
```

## Performance Regression Detection

### Baseline Metrics

Record baseline performance for your test XPUB:

```bash
# Run test 3 times and average
for i in {1..3}; do
  TEST_XPUB="xpub..." npx tsx tests/test-xpub-performance.ts | grep "Total time"
done
```

### Example Baseline
```
Wallet with 100 addresses:
- Baseline: 4.5s average
- Acceptable range: 3-8s
- Regression threshold: > 10s
```

### Automated Regression Detection

```bash
# In CI/CD, fail if performance degrades significantly
TEST_XPUB="xpub..." npx tsx tests/test-xpub-performance.ts | \
  grep "Total time" | \
  awk '{if ($3 > 15.0) exit 1}'
```

## Best Practices

### 1. Use Test Networks When Possible
- Testnet XPUBs are safer for testing
- No risk of exposing real wallet information
- Easier to generate test data

### 2. Never Commit XPUBs to Version Control
- Always use environment variables
- Use GitHub secrets for CI/CD
- Document how to set up test environment

### 3. Test with Various Wallet Sizes
- Small: 10-20 addresses
- Medium: 50-100 addresses
- Large: 200+ addresses

### 4. Monitor API Health
- Check both Blockstream and mempool.space
- Test failover behavior
- Document expected response times

### 5. Test Error Scenarios
- Invalid XPUB
- Network failures
- API rate limiting
- Empty wallets

## Additional Resources

- [Performance Optimization Documentation](./PERFORMANCE_OPTIMIZATION.md)
- [BIP32 Specification](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP44 Specification](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [Blockstream API Docs](https://github.com/Blockstream/esplora/blob/master/API.md)
- [mempool.space API Docs](https://mempool.space/docs/api)

## Support

If you encounter issues with testing:

1. Check this documentation
2. Review the [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) guide
3. Check GitHub Issues for similar problems
4. Open a new issue with test output and environment details
