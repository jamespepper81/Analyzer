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
 * Using Math.floor to avoid floating point precision issues
 */
export const DISCOVERY_TIMEOUT_MINUTES = Math.floor(DISCOVERY_TIMEOUT_MS / 60000); // 4 minutes

/**
 * Stage transition timeout (occurs at halfway point of discovery timeout)
 */
export const STAGE_TRANSITION_TIMEOUT_MS = DISCOVERY_TIMEOUT_MS / 2; // 120 seconds (2 minutes)

/**
 * Warning threshold percentages for progressive UI feedback
 */
export const SECOND_WARNING_THRESHOLD = 0.83; // Show final warning at 83% of timeout (200s of 240s)
export const FINAL_WARNING_THRESHOLD = 0.83; // Same as second warning - show red alert
