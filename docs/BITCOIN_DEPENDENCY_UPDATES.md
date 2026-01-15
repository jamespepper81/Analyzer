# Bitcoin Dependency Updates - Migration Guide

This document describes the updates made to the Bitcoin-related dependencies and the migration from Buffer to Uint8Array.

## Updated Dependencies

| Package | Previous Version | New Version | Breaking Changes |
|---------|-----------------|-------------|------------------|
| bip32 | 4.0.0 | 5.0.0 | ✅ Yes - Buffer → Uint8Array |
| bitcoinjs-lib | 6.1.7 | 7.0.1 | ✅ Yes - Buffer → Uint8Array |
| bs58check | 3.0.1 | 4.0.0 | ✅ Yes - Built-in TypeScript types |
| ecpair | 2.1.0 | 3.0.0 | ✅ Yes - Buffer → Uint8Array |
| @types/bs58check | 2.1.2 | Removed | No longer needed |

## Breaking Changes

### Buffer → Uint8Array Migration

The primary breaking change across all these libraries is the migration from Node.js `Buffer` to standard JavaScript `Uint8Array`. This change improves browser compatibility and aligns with modern JavaScript standards.

#### What Changed

**Before (v4/v6/v2):**
```typescript
const node = bip32.fromBase58(xpub);
const childNode = node.derive(0).derive(0);
const pubKey: Buffer = childNode.publicKey; // Returns Buffer
```

**After (v5/v7/v3):**
```typescript
const node = bip32.fromBase58(xpub);
const childNode = node.derive(0).derive(0);
const pubKey: Uint8Array = childNode.publicKey; // Returns Uint8Array
```

### Code Changes Required

#### 1. Type Annotations

Update function signatures that accept public keys or scripts:

**Before:**
```typescript
function getP2wpkhAddress(pubKey: Buffer): string {
    return bitcoin.payments.p2wpkh({ pubkey: pubKey }).address!;
}
```

**After:**
```typescript
function getP2wpkhAddress(pubKey: Uint8Array): string {
    return bitcoin.payments.p2wpkh({ pubkey: pubKey }).address!;
}
```

#### 2. Files Modified

- **src/lib/blockchain.ts**
  - `getP2wpkhAddress()`: Changed parameter type from `Buffer` to `Uint8Array`
  - `getP2pkhAddress()`: Changed parameter type from `Buffer` to `Uint8Array`
  - `getP2shP2wpkhAddress()`: Changed parameter type from `Buffer` to `Uint8Array`

- **src/lib/bitcoin-init.ts**: No changes needed (already compatible)
- **src/ai/flows/wallet-insights-chat.ts**: No changes needed (already compatible)

## TypeScript Types

### bs58check v4.0.0

The `@types/bs58check` package is no longer needed because bs58check v4.0.0 includes built-in TypeScript type definitions. The package was removed from `devDependencies`.

## Compatibility

### Uint8Array vs Buffer

While `Uint8Array` replaces `Buffer` in the API, both are compatible for most operations:

- ✅ Both can be passed to payment functions (`p2wpkh`, `p2pkh`, `p2sh`)
- ✅ Both work with `fromOutputScript()` and address decoding
- ✅ Both are binary data types with similar methods
- ⚠️ If you need Buffer-specific methods, you can convert: `Buffer.from(uint8Array)`

## Testing

All functionality was verified with comprehensive tests:

### Unit Tests
- ✅ 45/45 tests passing in test suite
- Address discovery optimization tests
- Wallet snapshot cache tests
- Tax calculation tests

### Integration Tests
- ✅ XPUB parsing and address derivation
- ✅ All address types (P2WPKH, P2PKH, P2SH-P2WPKH)
- ✅ Batch address generation (100 addresses)
- ✅ Transaction decoding with Uint8Array scripts
- ✅ PSBT creation and decoding
- ✅ ECPair key generation

### Build Verification
- ✅ TypeScript compilation (no Buffer-related errors)
- ✅ Next.js production build successful
- ✅ All pages render correctly

## Known Issues

### Valibot Dependency Vulnerability

The bip32 and ecpair packages depend on valibot 0.37.0, which has a known ReDoS vulnerability in emoji regex validation ([GHSA-vqpr-j7v3-hqw9](https://github.com/advisories/GHSA-vqpr-j7v3-hqw9)).

**Risk Assessment:**
- 🟡 Low risk for our use case
- Our code does not validate emoji or user input with valibot
- The vulnerability requires specific malicious input to the emoji regex
- This is a transitive dependency that will be resolved when bip32/ecpair update

**Mitigation:**
- Monitor for updates to bip32 and ecpair that use valibot >= 1.1.0
- No user input flows through valibot validation in our implementation

## Migration Checklist

If you're adding new Bitcoin-related code, ensure:

- [ ] Use `Uint8Array` type annotations for public keys and scripts
- [ ] Don't assume `Buffer` methods are available (use `Uint8Array` methods instead)
- [ ] Test address generation with all types (native SegWit, legacy, nested SegWit)
- [ ] Verify PSBT handling if working with unsigned transactions
- [ ] Check transaction decoding if parsing raw transactions

## References

- [bitcoinjs-lib v7 release notes](https://github.com/bitcoinjs/bitcoinjs-lib/releases/tag/v7.0.0)
- [bip32 v5 migration guide](https://github.com/bitcoinjs/bip32/blob/master/CHANGELOG.md)
- [bs58check v4 changelog](https://github.com/bitcoinjs/bs58check/blob/master/CHANGELOG.md)
- [ecpair v3 release](https://github.com/bitcoinjs/ecpair/releases)

## Version History

- **2026-01-15**: Updated to bip32 v5.0.0, bitcoinjs-lib v7.0.1, bs58check v4.0.0, ecpair v3.0.0
- All Buffer → Uint8Array migrations completed
- All tests passing
- Production build verified
