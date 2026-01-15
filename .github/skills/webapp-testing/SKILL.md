---
name: webapp-testing
description: Toolkit for interacting with and testing the BitSleuth Analyzer web application using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and validating Bitcoin wallet analysis features.
---

# Web Application Testing

This skill enables comprehensive testing and debugging of the BitSleuth Analyzer web application using Playwright automation and Vitest for unit testing.

## When to Use This Skill

Use this skill when you need to:
- Test frontend functionality in a real browser
- Verify Bitcoin wallet analysis UI behavior and interactions
- Debug web application issues in the dashboard, transactions, or analysis views
- Capture screenshots for documentation or debugging
- Inspect browser console logs
- Validate form submissions and user flows (XPUB input, Nostr login)
- Test AI chat interactions and security recommendations
- Check responsive design across viewports
- Verify chart rendering and data visualizations
- Test real-time mempool and market data displays

## Prerequisites

- Node.js 20+ (required) installed on the system
- A locally running BitSleuth application at `http://localhost:3000`
- Playwright will be installed automatically if not present
- Optional: Test XPUB for wallet analysis testing (set via `TEST_XPUB` environment variable)

## Core Capabilities

### 1. Browser Automation with Playwright
- Navigate to application routes (`/dashboard`, `/transactions`, `/analysis`, etc.)
- Click buttons and links (wallet selection, currency switcher, tabs)
- Fill form fields (XPUB input, Nostr login, transaction labels)
- Select dropdowns (currency selector, time range picker)
- Handle dialogs and alerts

### 2. Verification
- Assert element presence (wallet cards, transaction lists, charts)
- Verify text content (balance display, security score, recommendations)
- Check element visibility (loading states, error messages)
- Validate URLs and navigation
- Test responsive behavior across desktop/mobile viewports

### 3. Debugging
- Capture screenshots of wallet dashboards and analysis views
- View console logs for blockchain API calls and errors
- Inspect network requests to Blockstream, mempool.space, CoinGecko
- Debug failed tests with detailed error reports

### 4. Unit Testing with Vitest
- Test business logic (wallet calculations, tax classifications)
- Validate cache mechanisms (wallet snapshot cache, API deduplication)
- Performance testing (address discovery optimization, load times)
- Type safety validation with TypeScript strict mode

## Usage Examples

### Example 1: Navigate to Dashboard and Verify Balance
```javascript
// Start the app and navigate to dashboard
await page.goto('http://localhost:3000');

// Enter a test XPUB
await page.fill('#xpub-input', 'zpub6...');
await page.click('button[type="submit"]');

// Wait for dashboard to load
await page.waitForURL('**/dashboard');

// Verify balance is displayed
const balance = await page.locator('[data-testid="wallet-balance"]').textContent();
console.log('Wallet balance:', balance);
```

### Example 2: Test Transaction Explorer
```javascript
// Navigate to transactions page
await page.goto('http://localhost:3000/transactions');

// Wait for transaction list to load
await page.waitForSelector('[data-testid="transaction-list"]');

// Click on first transaction
await page.click('[data-testid="transaction-item"]:first-child');

// Verify transaction details page
await page.waitForURL('**/transactions/**');
const txId = await page.locator('[data-testid="tx-id"]').textContent();
console.log('Transaction ID:', txId);
```

### Example 3: Test AI Chat Interface
```javascript
// Navigate to chat page
await page.goto('http://localhost:3000/chat');

// Type a message
await page.fill('#chat-input', 'Analyze my wallet security');
await page.press('#chat-input', 'Enter');

// Wait for AI response
await page.waitForSelector('[data-testid="chat-message"]', { timeout: 10000 });
const response = await page.locator('[data-testid="chat-message"]:last-child').textContent();
console.log('AI response received:', response);
```

### Example 4: Screenshot Dashboard
```javascript
// Navigate to dashboard
await page.goto('http://localhost:3000/dashboard');
await page.waitForSelector('[data-testid="dashboard-loaded"]');

// Capture full page screenshot
await page.screenshot({ path: 'dashboard.png', fullPage: true });
console.log('Dashboard screenshot saved');
```

### Example 5: Run Unit Tests
```bash
# Run all unit tests
npm test

# Run specific test file
npm test wallet-snapshot-cache.test.ts

# Run tests in watch mode
npm test -- --watch
```

## Guidelines

1. **Always verify the app is running** - Check that `http://localhost:3000` is accessible before running browser tests
2. **Use explicit waits** - Wait for elements or navigation to complete before interacting (blockchain data loading can be slow)
3. **Capture screenshots on failure** - Take screenshots to help debug UI issues, especially for complex chart visualizations
4. **Clean up resources** - Always close the browser when done
5. **Handle timeouts gracefully** - Set reasonable timeouts for slow operations (XPUB analysis can take 30-60 seconds)
6. **Test incrementally** - Start with simple interactions (navigation) before complex flows (wallet analysis)
7. **Use selectors wisely** - Prefer `data-testid` or role-based selectors over CSS classes
8. **Mock external APIs when needed** - Use environment variables to control blockchain API calls in tests
9. **Test both light and dark themes** - BitSleuth supports theme switching
10. **Verify real-time updates** - Test mempool and market data refresh behavior

## Common Patterns

### Pattern: Wait for Wallet Data to Load
```javascript
// XPUB analysis takes time - wait for completion
await page.goto('http://localhost:3000/dashboard');
await page.waitForSelector('[data-testid="wallet-loaded"]', { 
  state: 'visible',
  timeout: 60000 // 60 seconds for blockchain API calls
});
```

### Pattern: Check if Security Score is Displayed
```javascript
const scoreExists = await page.locator('[data-testid="security-score"]').count() > 0;
if (scoreExists) {
  const score = await page.locator('[data-testid="security-score"]').textContent();
  console.log('Security score:', score);
}
```

### Pattern: Get Console Logs for API Debugging
```javascript
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('Browser error:', msg.text());
  }
});

// Monitor network requests to blockchain APIs
page.on('request', request => {
  const url = request.url();
  if (url.includes('blockstream') || url.includes('mempool.space')) {
    console.log('Blockchain API request:', url);
  }
});
```

### Pattern: Handle Errors with Screenshots
```javascript
try {
  await page.click('#analyze-button');
  await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });
} catch (error) {
  await page.screenshot({ path: 'error-analysis.png', fullPage: true });
  console.error('Analysis failed:', error.message);
  throw error;
}
```

### Pattern: Test Currency Switching
```javascript
// Verify currency switch uses cached data (should be fast)
const startTime = Date.now();
await page.selectOption('[data-testid="currency-selector"]', 'EUR');
await page.waitForSelector('[data-testid="balance-updated"]');
const duration = Date.now() - startTime;
console.log(`Currency switch took ${duration}ms (should be <1000ms)`);
```

### Pattern: Unit Test for Business Logic
```javascript
import { describe, it, expect, vi } from 'vitest';
import { classifyTransaction } from '../src/lib/tax-calculations';

describe('Tax Calculations', () => {
  it('identifies self-transfers correctly', () => {
    const tx = {
      fromAddress: ['wallet-addr-1'],
      toAddress: ['wallet-addr-2'],
    };
    const walletAddresses = new Set(['wallet-addr-1', 'wallet-addr-2']);
    
    const classification = classifyTransaction(tx, walletAddresses);
    
    expect(classification).toEqual({
      isTaxable: false,
      category: 'SELF_TRANSFER',
    });
  });
});
```

## Limitations

- Requires Node.js environment
- Cannot test native mobile apps
- XPUB analysis requires real blockchain API access (or mocked responses)
- AI chat responses are non-deterministic and require manual quality assessment
- Performance tests need actual test XPUBs (set via environment variables)
- Some features require API keys (CoinGecko, CryptoCompare) for full functionality
- End-to-end testing is limited due to external blockchain API dependencies
- Visual regression testing not yet implemented for chart components
- Browser automation cannot fully test Nostr cryptographic operations (nsec handling)
