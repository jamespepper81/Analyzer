import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detect Bitcoin address type from address string
 * @param address Bitcoin address string
 * @returns Address type string or null if unknown
 */
export function getAddressType(address: string): string | null {
  if (address.startsWith('bc1')) {
    return 'Native SegWit (P2WPKH)';
  } else if (address.startsWith('3')) {
    return 'Nested SegWit (P2SH)';
  } else if (address.startsWith('1')) {
    return 'Legacy (P2PKH)';
  }
  return null;
}
