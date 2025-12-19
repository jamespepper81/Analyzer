/**
 * Shared constants across the BitSleuth application
 */

/**
 * Address discovery timeout in milliseconds (4 minutes)
 * Extended from 2 to 4 minutes to accommodate wallets with many addresses
 */
export const DISCOVERY_TIMEOUT_MS = 240000; // 4 minutes

/**
 * Address discovery timeout in seconds (for UI display)
 */
export const DISCOVERY_TIMEOUT_SECONDS = DISCOVERY_TIMEOUT_MS / 1000; // 240 seconds
