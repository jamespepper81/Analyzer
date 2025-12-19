/**
 * Shared constants across the BitSleuth application
 */

/**
 * Address discovery timeout in milliseconds (4 minutes)
 * Extended from 2 to 4 minutes to accommodate wallets with many addresses
 */
export const DISCOVERY_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes in milliseconds

/**
 * Address discovery timeout in seconds (for UI display)
 */
export const DISCOVERY_TIMEOUT_SECONDS = DISCOVERY_TIMEOUT_MS / 1000; // 240 seconds

/**
 * Address discovery timeout in minutes (for error messages)
 */
export const DISCOVERY_TIMEOUT_MINUTES = DISCOVERY_TIMEOUT_MS / 1000 / 60; // 4 minutes

/**
 * Stage transition timeout (occurs at halfway point of discovery timeout)
 */
export const STAGE_TRANSITION_TIMEOUT_MS = (DISCOVERY_TIMEOUT_SECONDS / 2) * 1000; // 120 seconds (2 minutes)

