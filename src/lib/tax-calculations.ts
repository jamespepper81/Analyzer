/**
 * @fileOverview Core tax calculation engine for Bitcoin transactions
 * Implements multiple accounting methods and jurisdiction-specific rules
 */

import { startOfDay, differenceInDays } from 'date-fns';
import type { Transaction } from './types';

export type AccountingMethod = 'FIFO' | 'LIFO' | 'HIFO' | 'SPEC_ID' | 'AVG_COST' | 'SHARED_POOL';
export type Jurisdiction = 'US' | 'UK' | 'CANADA' | 'AUSTRALIA' | 'GERMANY' | 'OTHER';
export type TaxCategory = 'SHORT_TERM' | 'LONG_TERM' | 'INCOME' | 'NON_TAXABLE';

export interface TaxLot {
  id: string;
  txid: string;
  date: Date;
  amount: number; // BTC amount
  costBasis: number; // Total cost in fiat
  costPerUnit: number; // Cost per BTC
  remaining: number; // Remaining BTC in this lot
  address?: string;
}

/** Augmented tax lot with average cost override for AVG_COST and SHARED_POOL methods */
export interface AugmentedTaxLot extends TaxLot {
  _avgCostOverride?: number;
}

export interface DisposalEvent {
  txid: string;
  date: Date;
  amount: number; // BTC disposed
  proceeds: number; // Sale proceeds in fiat
  costBasis: number; // Cost basis of disposed amount
  realizedGain: number; // Proceeds - cost basis
  lots: Array<{
    lotId: string;
    amount: number;
    costBasis: number;
    acquisitionDate: Date;
    holdingPeriodDays: number;
    taxCategory: TaxCategory;
  }>;
  type: 'SALE' | 'TRADE' | 'SPEND' | 'GIFT';
}

export interface IncomeEvent {
  txid: string;
  date: Date;
  amount: number; // BTC received
  fairMarketValue: number; // FMV at time of receipt
  type: 'MINING' | 'STAKING' | 'AIRDROP' | 'GIFT' | 'FORK' | 'INTEREST' | 'OTHER';
}

export interface TaxSummary {
  shortTermGains: number;
  longTermGains: number;
  totalCapitalGains: number;
  ordinaryIncome: number;
  deductibleFees: number;
  harvestableShortTermLosses: number;
  harvestableLongTermLosses: number;
  disposals: DisposalEvent[];
  income: IncomeEvent[];
  unrealizedGains: number;
  unrealizedLosses: number;
  remainingLots: TaxLot[];
}

export interface JurisdictionRules {
  longTermHoldingPeriodDays: number;
  washSalePeriodDays?: number; // US: not currently applied to crypto
  sameDayMatching?: boolean; // UK
  bedAndBreakfastDays?: number; // UK: 30 days
  superficialLossDays?: number; // Canada: 30 days
  capitalGainsDiscount?: number; // Australia: 50% for >12 months
  taxFreeThreshold?: number; // Germany: tax-free after 1 year
}

export const JURISDICTION_RULES: Record<Jurisdiction, JurisdictionRules> = {
  US: {
    longTermHoldingPeriodDays: 365,
  },
  UK: {
    longTermHoldingPeriodDays: 0, // No distinction in UK
    sameDayMatching: true,
    bedAndBreakfastDays: 30,
  },
  CANADA: {
    longTermHoldingPeriodDays: 0, // 50% inclusion rate for all capital gains
    superficialLossDays: 30,
  },
  AUSTRALIA: {
    longTermHoldingPeriodDays: 365,
    capitalGainsDiscount: 0.5, // 50% discount for >12 months
  },
  GERMANY: {
    longTermHoldingPeriodDays: 365,
    taxFreeThreshold: 600, // €600 exempt amount per year
  },
  OTHER: {
    longTermHoldingPeriodDays: 365,
  },
};

/**
 * Tax calculation engine that processes transactions using specified accounting method
 */
export class TaxCalculator {
  private lots: TaxLot[] = [];
  private disposals: DisposalEvent[] = [];
  private income: IncomeEvent[] = [];
  private method: AccountingMethod;
  private jurisdiction: Jurisdiction;
  private rules: JurisdictionRules;

  constructor(method: AccountingMethod = 'FIFO', jurisdiction: Jurisdiction = 'US') {
    this.method = method;
    this.jurisdiction = jurisdiction;
    this.rules = JURISDICTION_RULES[jurisdiction];
  }

  /**
   * Process a received (buy/inflow) transaction
   */
  addAcquisition(
    txid: string,
    date: Date,
    amount: number,
    costBasis: number,
    address?: string,
    incomeType?: IncomeEvent['type']
  ): void {
    const costPerUnit = amount > 0 ? costBasis / amount : 0;

    // If this is income (mining, staking, etc.), record it
    if (incomeType && incomeType !== 'OTHER') {
      this.income.push({
        txid,
        date,
        amount,
        fairMarketValue: costBasis,
        type: incomeType,
      });
    }

    // Add to lots for future disposal tracking
    this.lots.push({
      id: `${txid}-${date.getTime()}`,
      txid,
      date: startOfDay(date),
      amount,
      costBasis,
      costPerUnit,
      remaining: amount,
      address,
    });
  }

  /**
   * Process a disposal (sell/outflow) transaction
   */
  addDisposal(
    txid: string,
    date: Date,
    amount: number,
    proceeds: number,
    type: DisposalEvent['type'] = 'SALE'
  ): DisposalEvent {
    const disposalDate = startOfDay(date);
    const matchedLots = this.matchLots(amount, disposalDate);
    
    let totalCostBasis = 0;
    const lotsUsed: DisposalEvent['lots'] = [];

    for (const match of matchedLots) {
      const lot = match.lot as AugmentedTaxLot;
      const amountFromLot = match.amount;
      // Use average cost override if present (for AVG_COST/SHARED_POOL methods)
      const effectiveCostPerUnit = lot._avgCostOverride || lot.costPerUnit;
      const costBasisFromLot = effectiveCostPerUnit * amountFromLot;
      
      totalCostBasis += costBasisFromLot;
      
      // Find and update the original lot in this.lots array
      const originalLot = this.lots.find(l => l.id === lot.id);
      if (originalLot) {
        originalLot.remaining -= amountFromLot;
      }

      const holdingPeriodDays = differenceInDays(disposalDate, lot.date);
      const taxCategory = this.determineTaxCategory(holdingPeriodDays);

      lotsUsed.push({
        lotId: lot.id,
        amount: amountFromLot,
        costBasis: costBasisFromLot,
        acquisitionDate: lot.date,
        holdingPeriodDays,
        taxCategory,
      });
    }

    const realizedGain = proceeds - totalCostBasis;

    const disposal: DisposalEvent = {
      txid,
      date: disposalDate,
      amount,
      proceeds,
      costBasis: totalCostBasis,
      realizedGain,
      lots: lotsUsed,
      type,
    };

    this.disposals.push(disposal);
    return disposal;
  }

  /**
   * Match lots to a disposal based on the accounting method
   */
  private matchLots(amountToDispose: number, disposalDate: Date): Array<{ lot: TaxLot; amount: number }> {
    const availableLots = this.lots.filter(lot => lot.remaining > 0);
    let remaining = amountToDispose;
    const matches: Array<{ lot: TaxLot; amount: number }> = [];

    // UK same-day matching rule
    if (this.jurisdiction === 'UK' && this.rules.sameDayMatching) {
      const sameDayLots = availableLots.filter(lot => 
        lot.date.getTime() === disposalDate.getTime()
      );
      for (const lot of sameDayLots) {
        if (remaining <= 0) break;
        const amount = Math.min(remaining, lot.remaining);
        matches.push({ lot, amount });
        remaining -= amount;
      }
      if (remaining <= 0) return matches;
    }

    // UK 30-day bed and breakfast rule
    if (this.jurisdiction === 'UK' && this.rules.bedAndBreakfastDays) {
      const thirtyDaysLater = new Date(disposalDate);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + this.rules.bedAndBreakfastDays);
      
      const bedAndBreakfastLots = availableLots.filter(lot =>
        lot.date > disposalDate && lot.date <= thirtyDaysLater
      );
      for (const lot of bedAndBreakfastLots) {
        if (remaining <= 0) break;
        const amount = Math.min(remaining, lot.remaining);
        matches.push({ lot, amount });
        remaining -= amount;
      }
      if (remaining <= 0) return matches;
    }

    // Apply standard accounting method
    let sortedLots = [...availableLots.filter(lot => !matches.find(m => m.lot.id === lot.id))];
    
    switch (this.method) {
      case 'FIFO':
        sortedLots.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case 'LIFO':
        sortedLots.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case 'HIFO':
        sortedLots.sort((a, b) => b.costPerUnit - a.costPerUnit);
        break;
      case 'AVG_COST':
      case 'SHARED_POOL':
        // For average cost and shared pool, we calculate weighted average
        const totalRemaining = sortedLots.reduce((sum, lot) => sum + lot.remaining, 0);
        const totalCost = sortedLots.reduce((sum, lot) => sum + (lot.remaining * lot.costPerUnit), 0);
        const avgCost = totalRemaining > 0 ? totalCost / totalRemaining : 0;
        
        // For average cost, we need to match lots but use average cost basis
        // We'll store the avgCost in a special property that addDisposal can use
        if (sortedLots.length > 0 && remaining > 0) {
          for (const lot of sortedLots) {
            if (remaining <= 0) break;
            const amount = Math.min(remaining, lot.remaining);
            // Store average cost as metadata that addDisposal will use
            const lotWithAvgCost: AugmentedTaxLot = { 
              ...lot, 
              _avgCostOverride: avgCost 
            };
            matches.push({ lot: lotWithAvgCost, amount });
            remaining -= amount;
          }
        }
        return matches;
      case 'SPEC_ID':
        // For specific ID, lots should be pre-selected by user
        // For now, default to FIFO
        sortedLots.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
    }

    // Match lots sequentially
    for (const lot of sortedLots) {
      if (remaining <= 0) break;
      const amount = Math.min(remaining, lot.remaining);
      matches.push({ lot, amount });
      remaining -= amount;
    }

    return matches;
  }

  /**
   * Determine tax category based on holding period
   */
  private determineTaxCategory(holdingPeriodDays: number): TaxCategory {
    if (holdingPeriodDays >= this.rules.longTermHoldingPeriodDays) {
      return 'LONG_TERM';
    }
    return 'SHORT_TERM';
  }

  /**
   * Calculate comprehensive tax summary
   */
  getSummary(): TaxSummary {
    let shortTermGains = 0;
    let longTermGains = 0;
    let ordinaryIncome = 0;

    // Sum up capital gains
    for (const disposal of this.disposals) {
      for (const lot of disposal.lots) {
        const gain = (disposal.proceeds / disposal.amount) * lot.amount - lot.costBasis;
        
        if (lot.taxCategory === 'SHORT_TERM') {
          shortTermGains += gain;
        } else if (lot.taxCategory === 'LONG_TERM') {
          longTermGains += gain;
        }
      }
    }

    // Sum up ordinary income
    for (const incomeEvent of this.income) {
      ordinaryIncome += incomeEvent.fairMarketValue;
    }

    // Calculate unrealized gains/losses
    let unrealizedGains = 0;
    let unrealizedLosses = 0;
    let harvestableShortTermLosses = 0;
    let harvestableLongTermLosses = 0;

    for (const lot of this.lots) {
      if (lot.remaining > 0) {
        // We'd need current market price to calculate this accurately
        // This will be filled in by the calling code
      }
    }

    return {
      shortTermGains,
      longTermGains,
      totalCapitalGains: shortTermGains + longTermGains,
      ordinaryIncome,
      deductibleFees: 0, // Calculated separately
      harvestableShortTermLosses,
      harvestableLongTermLosses,
      disposals: this.disposals,
      income: this.income,
      unrealizedGains,
      unrealizedLosses,
      remainingLots: this.lots.filter(lot => lot.remaining > 0),
    };
  }

  /**
   * Get all remaining lots (for unrealized gain/loss calculation)
   */
  getRemainingLots(): TaxLot[] {
    return this.lots.filter(lot => lot.remaining > 0);
  }

  /**
   * Calculate unrealized gains/losses given current market price
   */
  calculateUnrealizedGains(currentPrice: number): {
    unrealized: number;
    harvestableShortTermLosses: number;
    harvestableLongTermLosses: number;
    lotDetails: Array<{
      lot: TaxLot;
      currentValue: number;
      unrealizedGain: number;
      taxCategory: TaxCategory;
    }>;
  } {
    let totalUnrealized = 0;
    let harvestableShortTermLosses = 0;
    let harvestableLongTermLosses = 0;
    const lotDetails: Array<{
      lot: TaxLot;
      currentValue: number;
      unrealizedGain: number;
      taxCategory: TaxCategory;
    }> = [];

    const now = new Date();

    for (const lot of this.lots) {
      if (lot.remaining > 0) {
        const currentValue = lot.remaining * currentPrice;
        const costBasis = lot.remaining * lot.costPerUnit;
        const unrealizedGain = currentValue - costBasis;
        
        const holdingPeriodDays = differenceInDays(now, lot.date);
        const taxCategory = this.determineTaxCategory(holdingPeriodDays);

        totalUnrealized += unrealizedGain;

        if (unrealizedGain < 0) {
          if (taxCategory === 'SHORT_TERM') {
            harvestableShortTermLosses += Math.abs(unrealizedGain);
          } else {
            harvestableLongTermLosses += Math.abs(unrealizedGain);
          }
        }

        lotDetails.push({
          lot,
          currentValue,
          unrealizedGain,
          taxCategory,
        });
      }
    }

    return {
      unrealized: totalUnrealized,
      harvestableShortTermLosses,
      harvestableLongTermLosses,
      lotDetails,
    };
  }
}

/**
 * Helper function to classify transaction type for tax purposes
 */
export function classifyTransaction(tx: Transaction, walletAddresses: Set<string>): {
  isTaxable: boolean;
  category: 'ACQUISITION' | 'DISPOSAL' | 'SELF_TRANSFER' | 'INCOME';
  incomeType?: IncomeEvent['type'];
  disposalType?: DisposalEvent['type'];
} {
  // Received transaction
  if (tx.btc > 0) {
    // Check if it's from our own addresses (self-transfer)
    const fromOwnAddress = tx.fromAddress.some(addr => addr && walletAddresses.has(addr));
    const toOwnAddress = tx.toAddress.some(addr => walletAddresses.has(addr));
    
    if (fromOwnAddress && toOwnAddress) {
      return {
        isTaxable: false,
        category: 'SELF_TRANSFER',
      };
    }

    // Could be mining, staking, etc. - default to acquisition
    return {
      isTaxable: true,
      category: 'ACQUISITION',
    };
  }

  // Sent transaction
  if (tx.btc < 0) {
    // Check if all outputs go to our own addresses (self-transfer)
    const allToOwnAddresses = tx.toAddress.every(addr => walletAddresses.has(addr));
    
    if (allToOwnAddresses) {
      return {
        isTaxable: false,
        category: 'SELF_TRANSFER',
      };
    }

    // This is a disposal
    return {
      isTaxable: true,
      category: 'DISPOSAL',
      disposalType: 'SALE', // Could be TRADE, SPEND, GIFT based on labels
    };
  }

  return {
    isTaxable: false,
    category: 'SELF_TRANSFER',
  };
}
