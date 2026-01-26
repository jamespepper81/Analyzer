/**
 * Fast authentication validation utilities.
 *
 * These functions perform CLIENT-SIDE ONLY validation with ZERO network calls.
 * Target: <50ms validation time to enable instant routing to dashboard.
 */

// XPUB validation constants
const XPUB_PREFIXES = new Set(['xpub', 'ypub', 'zpub', 'tpub', 'upub', 'vpub']);
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
const XPUB_LENGTH_MIN = 100;
const XPUB_LENGTH_MAX = 120;

// Nostr validation constants
const NSEC_PREFIX = 'nsec1';
const NSEC_LENGTH = 63; // nsec1 + 58 chars

export interface AuthValidationResult {
  success: boolean;
  error?: string;
  authType?: 'xpub' | 'nostr';
  credentials?: {
    xpub?: string;
    nsec?: string;
    fingerprint?: string;
  };
}

/**
 * Normalize input by trimming whitespace.
 */
export function normalizeInput(input: string): string {
  return input.trim();
}

/**
 * Generate a fingerprint for an XPUB (first 8 chars of simple hash).
 * Used for caching and identification without exposing the full key.
 * Uses a simple string hash that works in both browser and Node.
 */
export function generateXpubFingerprint(xpub: string): string {
  // Simple hash function that works in browser
  let hash = 0;
  for (let i = 0; i < xpub.length; i++) {
    const char = xpub.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex and take first 8 chars, with prefix from xpub
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return xpub.substring(0, 4) + hexHash.substring(0, 4);
}

/**
 * Check if a string looks like an XPUB format.
 * Fast preliminary check before full validation.
 */
export function isXpubFormat(input: string): boolean {
  const normalized = normalizeInput(input);

  // Length check
  if (normalized.length < XPUB_LENGTH_MIN || normalized.length > XPUB_LENGTH_MAX) {
    return false;
  }

  // Base58 character check
  if (!BASE58_RE.test(normalized)) {
    return false;
  }

  // Prefix check
  const prefix = normalized.slice(0, 4).toLowerCase();
  return XPUB_PREFIXES.has(prefix);
}

/**
 * Check if a string looks like a Nostr nsec format.
 */
export function isNsecFormat(input: string): boolean {
  const normalized = normalizeInput(input);
  return normalized.startsWith(NSEC_PREFIX) && normalized.length === NSEC_LENGTH;
}

/**
 * Validate XPUB format synchronously.
 * Returns validation result without any network calls.
 */
export function validateXpubSync(input: string): AuthValidationResult {
  const normalized = normalizeInput(input);

  if (!normalized) {
    return { success: false, error: 'XPUB key is required.' };
  }

  if (!isXpubFormat(normalized)) {
    return {
      success: false,
      error: 'Invalid XPUB format. Please check that you entered the correct extended public key.',
    };
  }

  // Additional validation could be added here (checksum, etc.)
  // For now we rely on the format check for instant validation

  return {
    success: true,
    authType: 'xpub',
    credentials: {
      xpub: normalized,
      fingerprint: generateXpubFingerprint(normalized),
    },
  };
}

/**
 * Validate Nostr nsec format synchronously.
 * Returns validation result without any network calls.
 */
export function validateNsecSync(input: string): AuthValidationResult {
  const normalized = normalizeInput(input);

  if (!normalized) {
    return { success: false, error: 'Nostr private key is required.' };
  }

  if (!isNsecFormat(normalized)) {
    return {
      success: false,
      error: 'Invalid key type. Your key must start with "nsec1".',
    };
  }

  return {
    success: true,
    authType: 'nostr',
    credentials: {
      nsec: normalized,
    },
  };
}

/**
 * Validate any auth input (XPUB or Nostr nsec) synchronously.
 * Detects the type automatically and validates accordingly.
 *
 * Target: <50ms execution time
 */
export function validateAuthInput(input: string): AuthValidationResult {
  const normalized = normalizeInput(input);

  if (!normalized) {
    return { success: false, error: 'Please enter an XPUB or Nostr key.' };
  }

  // Try XPUB first (most common)
  if (isXpubFormat(normalized)) {
    return validateXpubSync(normalized);
  }

  // Try Nostr nsec
  if (isNsecFormat(normalized)) {
    return validateNsecSync(normalized);
  }

  // Neither format matched
  return {
    success: false,
    error: 'Invalid format. Please enter a valid XPUB (xpub/ypub/zpub) or Nostr private key (nsec1).',
  };
}

/**
 * Infer the address type from XPUB prefix for optimized discovery.
 * This allows skipping unnecessary address type checks.
 */
export function inferAddressType(xpub: string): 'native' | 'nested' | 'legacy' | 'unknown' {
  const prefix = xpub.slice(0, 4).toLowerCase();

  switch (prefix) {
    case 'zpub':
    case 'vpub':
      return 'native'; // Native SegWit (bech32)
    case 'ypub':
    case 'upub':
      return 'nested'; // Nested SegWit (P2SH-P2WPKH)
    case 'xpub':
    case 'tpub':
      return 'legacy'; // Legacy (P2PKH)
    default:
      return 'unknown';
  }
}

/**
 * Check if we have cached data for this XPUB.
 * Returns the cache entry if valid, null otherwise.
 */
export function getCachedWalletData(xpub: string): {
  data: unknown;
  isStale: boolean;
  timestamp: number;
} | null {
  try {
    const cacheKey = `walletCache:${xpub}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached);
    const metadata = parsed._cacheMetadata;

    // Validate cache belongs to this XPUB
    if (metadata?.xpub && metadata.xpub !== xpub) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    const timestamp = metadata?.timestamp || 0;
    const age = Date.now() - timestamp;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const isStale = age > CACHE_TTL;

    return {
      data: parsed.data || parsed,
      isStale,
      timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Check if we have cached Nostr XPUBs for the given npub.
 */
export function getCachedNostrXpubs(npub: string): string[] | null {
  try {
    const cacheKey = `nostrXpubs:${npub}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed.xpubs) && parsed.xpubs.length > 0) {
      return parsed.xpubs;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get the last known balance for instant display.
 */
export function getLastKnownBalance(xpub: string): number | null {
  try {
    const key = `lastBalance:${generateXpubFingerprint(xpub)}`;
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached);
    return typeof parsed.btc === 'number' ? parsed.btc : null;
  } catch {
    return null;
  }
}

/**
 * Store the last known balance for instant display on next load.
 */
export function setLastKnownBalance(xpub: string, btc: number): void {
  try {
    const key = `lastBalance:${generateXpubFingerprint(xpub)}`;
    localStorage.setItem(key, JSON.stringify({
      btc,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Performance timing helper for measuring auth validation.
 */
export function measureAuthValidation(input: string): {
  result: AuthValidationResult;
  durationMs: number;
} {
  const start = performance.now();
  const result = validateAuthInput(input);
  const durationMs = performance.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[FastAuth] Validation completed in ${durationMs.toFixed(2)}ms`);
  }

  return { result, durationMs };
}
