import { test, expect } from '@playwright/test';

/**
 * E2E Test for Login / Connect Wallet Flow
 * 
 * This test verifies that:
 * 1. User can connect a wallet with an XPUB
 * 2. The app successfully navigates to the dashboard
 * 3. The connect screen is not displayed after wallet data is received
 * 4. The dashboard is rendered with wallet data
 * 
 * Usage:
 *   TEST_XPUB="xpub..." npm run test:e2e
 */

const TEST_XPUB = process.env.TEST_XPUB || 'xpub6CYVnTTLwfs7uFDEhikm2SGgEcScto2YWriD6kD6WoLHGhP8MbD3Y1r4s6jgaxqr4DLChb4FQnerXM9B1nxWQNUJ4sobt9ivsFGdHuoPFKN';

test.describe('Login / Connect Wallet Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing wallet data
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should successfully connect wallet and navigate to dashboard', async ({ page }) => {
    // Navigate to the connect page
    await page.goto('/');
    
    // Wait for the page to load
    await expect(page.locator('h1:has-text("BitSleuth Analyzer")')).toBeVisible();
    
    // Fill in the XPUB
    const xpubInput = page.locator('input[placeholder="xpub..."]');
    await expect(xpubInput).toBeVisible();
    await xpubInput.fill(TEST_XPUB);
    
    // Click the Connect Wallet button
    const connectButton = page.locator('button:has-text("Connect Wallet")');
    await expect(connectButton).toBeVisible();
    
    // Start timing
    const startTime = Date.now();
    
    await connectButton.click();
    
    // Wait for the loading dialog to appear
    await expect(page.locator('text=Connecting Your Wallet')).toBeVisible({ timeout: 5000 });
    
    // Wait for navigation to dashboard (should happen within 60 seconds)
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    
    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000;
    
    console.log(`✅ Navigation to dashboard took ${elapsedTime.toFixed(2)} seconds`);
    
    // Assert we're on the dashboard
    expect(page.url()).toContain('/dashboard');
    
    // Assert the connect page is no longer visible
    await expect(page.locator('h1:has-text("BitSleuth Analyzer")')).not.toBeVisible();
    
    // Wait for dashboard content to load (header shows the section title)
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot of the dashboard for verification
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/dashboard-after-connect.png',
      fullPage: true 
    });
    
    console.log('📸 Dashboard screenshot saved to tests/e2e/screenshots/dashboard-after-connect.png');
    
    // Verify that wallet data is loaded (check for balance or transactions section)
    const hasWalletData = await page.locator('text=Balance').isVisible() || 
                          await page.locator('text=Transactions').isVisible() ||
                          await page.locator('text=Empty Wallet').isVisible();
    
    expect(hasWalletData).toBe(true);
    
    // Performance assertion - should complete within 60 seconds
    expect(elapsedTime).toBeLessThan(60);
    
    // Ideal performance - warn if slower than 30 seconds
    if (elapsedTime > 30) {
      console.warn(`⚠️  Warning: Login took ${elapsedTime.toFixed(2)}s, exceeding ideal threshold of 30s`);
    }
  });

  test('should handle fast connection with cached data', async ({ page, context }) => {
    // First, connect a wallet to populate the cache
    await page.goto('/');
    const xpubInput = page.locator('input[placeholder="xpub..."]');
    await xpubInput.fill(TEST_XPUB);
    await page.locator('button:has-text("Connect Wallet")').click();
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    
    // Disconnect the wallet
    const disconnectButton = page.locator('button:has-text("Disconnect")');
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();
      await page.waitForURL('**/', { timeout: 5000 });
    } else {
      // Mobile view - need to click elsewhere
      await page.goto('/');
    }
    
    // Now reconnect with the same XPUB (should use cache and be faster)
    await page.goto('/');
    await xpubInput.fill(TEST_XPUB);
    
    const startTime = Date.now();
    await page.locator('button:has-text("Connect Wallet")').click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000;
    
    console.log(`✅ Cached connection to dashboard took ${elapsedTime.toFixed(2)} seconds`);
    
    // Cached connection should be faster (under 20 seconds)
    expect(elapsedTime).toBeLessThan(20);
    
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/dashboard-cached-connect.png',
      fullPage: true 
    });
  });

  test('should not get stuck on connect page', async ({ page }) => {
    // This test verifies the specific issue mentioned in the problem statement
    await page.goto('/');
    
    const xpubInput = page.locator('input[placeholder="xpub..."]');
    await xpubInput.fill(TEST_XPUB);
    await page.locator('button:has-text("Connect Wallet")').click();
    
    // Wait a reasonable amount of time for the connection
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    
    // Verify we're not stuck on the connect page
    const url = page.url();
    expect(url).not.toContain('Connect Wallet');
    expect(url).toContain('/dashboard');
    
    // Verify the loading dialog is gone
    await expect(page.locator('text=Connecting Your Wallet')).not.toBeVisible();
    
    console.log('✅ Successfully navigated away from connect page - not stuck!');
  });
});
