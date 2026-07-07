/**
 * @fileOverview Shared number/currency formatters.
 *
 * Centralizes the Intl.NumberFormat logic that was previously redefined in
 * a dozen pages. Formatter instances are cached — constructing
 * Intl.NumberFormat is expensive, and several pages call these in tight
 * render loops (tables, chart ticks).
 */

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Format a fiat value in the given currency, e.g. `$1,234.56`.
 * `compact` renders large values as `$1.2M`.
 */
export function formatCurrency(
  value: number | undefined | null,
  currency: string = 'USD',
  options: { compact?: boolean } = {}
): string {
  return getFormatter({
    style: 'currency',
    currency,
    ...(options.compact ? { notation: 'compact' as const } : {}),
  }).format(value ?? 0);
}

/** Format a BTC amount with 8 decimal places, e.g. `0.01234567 BTC`. */
export function formatBTC(
  value: number | undefined | null,
  options: { decimals?: number; withUnit?: boolean } = {}
): string {
  const { decimals = 8, withUnit = true } = options;
  const formatted = getFormatter({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);
  return withUnit ? `${formatted} BTC` : formatted;
}

/** Format a plain number with thousands separators, e.g. `12,345`. */
export function formatNumber(
  value: number | undefined | null,
  options: Intl.NumberFormatOptions = {}
): string {
  return getFormatter(options).format(value ?? 0);
}

/** Format a ratio/percentage value (already in percent units), e.g. `12.34%`. */
export function formatPercent(
  value: number | undefined | null,
  decimals: number = 2
): string {
  const safe = value ?? 0;
  return `${Number.isFinite(safe) ? safe.toFixed(decimals) : (0).toFixed(decimals)}%`;
}
