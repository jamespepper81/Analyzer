
'use server';
/**
 * @fileOverview Enhanced AI flow for generating detailed tax reports with multiple accounting methods
 *
 * - getEnhancedTaxReport - Function that generates comprehensive tax reports
 * - EnhancedTaxReportInput - The input type for the function
 * - EnhancedTaxReportOutput - The return type for the function
 */

import { z } from '@genkit-ai/core';
import { VALID_CURRENCIES } from '@/lib/types';
import type { WalletData, Transaction, Currency } from '@/lib/types';
import { fetchJson } from '@/lib/blockchain-api';
import { eachDayOfInterval, startOfDay, isWithinInterval, format, subDays, addDays, differenceInDays } from 'date-fns';
import { 
  TaxCalculator, 
  AccountingMethod, 
  Jurisdiction,
  type TaxSummary,
  type TaxLot,
  classifyTransaction,
  JURISDICTION_RULES
} from '@/lib/tax-calculations';

// The input schema for the enhanced tax report flow
const EnhancedTaxReportInputSchema = z.object({
  walletData: z.string().describe('JSON string of the full WalletData object.'),
  startDate: z.string().describe('Start date for the report in ISO 8601 format.'),
  endDate: z.string().describe('End date for the report in ISO 8601 format.'),
  currency: z.enum(['USD', 'EUR', 'GBP']).describe('The currency for the report.'),
  accountingMethod: z.enum(['FIFO', 'LIFO', 'HIFO', 'SPEC_ID', 'AVG_COST', 'SHARED_POOL']).optional().default('FIFO'),
  jurisdiction: z.enum(['US', 'UK', 'CANADA', 'AUSTRALIA', 'GERMANY', 'OTHER']).optional().default('US'),
});
export type EnhancedTaxReportInput = z.infer<typeof EnhancedTaxReportInputSchema>;

// Enhanced output schema with detailed tax information
const EnhancedTaxReportOutputSchema = z.object({
  summary: z.object({
    startDate: z.string(),
    endDate: z.string(),
    startValue: z.number(),
    endValue: z.number(),
    totalValueChange: z.number(),
    totalValueChangePercentage: z.number(),
    costBasis: z.number(),
    unrealizedGains: z.number(),
    inflow: z.number(),
    outflow: z.number(),
    tradingFees: z.number(),
    realizedGains: z.number(),
    
    // Enhanced tax fields
    shortTermGains: z.number(),
    longTermGains: z.number(),
    totalCapitalGains: z.number(),
    ordinaryIncome: z.number(),
    deductibleFees: z.number(),
    harvestableShortTermLosses: z.number(),
    harvestableLongTermLosses: z.number(),
  }),
  portfolioHistory: z.array(z.object({
    date: z.string(),
    totalValue: z.number(),
    costBasis: z.number(),
  })),
  holdings: z.array(z.object({
    address: z.string(),
    balance: z.number(),
    cost: z.number(),
    marketValue: z.number(),
    roi: z.number(),
    potentialGain: z.number(),
    taxCategory: z.enum(['SHORT_TERM', 'LONG_TERM', 'INCOME', 'NON_TAXABLE']).optional(),
    holdingPeriodDays: z.number().optional(),
  })),
  
  // New detailed sections
  disposals: z.array(z.object({
    txid: z.string(),
    date: z.string(),
    amount: z.number(),
    proceeds: z.number(),
    costBasis: z.number(),
    realizedGain: z.number(),
    type: z.enum(['SALE', 'TRADE', 'SPEND', 'GIFT']),
    lots: z.array(z.object({
      lotId: z.string(),
      amount: z.number(),
      costBasis: z.number(),
      acquisitionDate: z.string(),
      holdingPeriodDays: z.number(),
      taxCategory: z.enum(['SHORT_TERM', 'LONG_TERM', 'INCOME', 'NON_TAXABLE']),
    })),
  })),
  
  income: z.array(z.object({
    txid: z.string(),
    date: z.string(),
    amount: z.number(),
    fairMarketValue: z.number(),
    type: z.enum(['MINING', 'STAKING', 'AIRDROP', 'GIFT', 'FORK', 'INTEREST', 'OTHER']),
  })),
  
  lots: z.array(z.object({
    id: z.string(),
    txid: z.string(),
    date: z.string(),
    amount: z.number(),
    costBasis: z.number(),
    costPerUnit: z.number(),
    remaining: z.number(),
    currentValue: z.number(),
    unrealizedGain: z.number(),
    taxCategory: z.enum(['SHORT_TERM', 'LONG_TERM', 'INCOME', 'NON_TAXABLE']),
    holdingPeriodDays: z.number(),
    address: z.string().optional(),
  })),
  
  accountingMethod: z.string(),
  jurisdiction: z.string(),
  jurisdictionRules: z.object({
    longTermHoldingPeriodDays: z.number(),
    washSalePeriodDays: z.number().optional(),
    sameDayMatching: z.boolean().optional(),
    bedAndBreakfastDays: z.number().optional(),
    superficialLossDays: z.number().optional(),
    capitalGainsDiscount: z.number().optional(),
    taxFreeThreshold: z.number().optional(),
  }),
});

export type EnhancedTaxReportOutput = z.infer<typeof EnhancedTaxReportOutputSchema>;

async function getDailyPrices(startDate: Date, endDate: Date, currency: Currency): Promise<Record<string, number>> {
    if (!(VALID_CURRENCIES as readonly string[]).includes(currency)) {
        throw new Error('Invalid currency for price lookup.');
    }
    const prices: Record<string, number> = {};

    const today = startOfDay(new Date());
    const maxAllowedStartDate = subDays(today, 364);

    if (startDate < maxAllowedStartDate) {
        const requestedDays = differenceInDays(endDate, startDate);
        const availableDays = differenceInDays(endDate, maxAllowedStartDate);

        if (requestedDays > 364) {
            console.warn(`CoinGecko API: Requested ${requestedDays} days of data, but only ${availableDays} days are available due to 364-day limit.`);
        }

        if (endDate < maxAllowedStartDate) {
            throw new Error(`CoinGecko API: Both dates are older than 364 days. Historical data is not available.`);
        }
    }

    const finalStartDate = startDate < maxAllowedStartDate ? maxAllowedStartDate : startDate;
    let currentStartDate = finalStartDate;
    const currencyCode = currency.toLowerCase();

    try {
        while (currentStartDate <= endDate) {
            let currentEndDate = addDays(currentStartDate, 90);
            if (currentEndDate > endDate) {
                currentEndDate = endDate;
            }

            const fromTimestamp = Math.floor(currentStartDate.getTime() / 1000);
            const toTimestamp = Math.floor(currentEndDate.getTime() / 1000) + 3600;

            const data = await fetchJson('coingecko', '/api/v3/coins/bitcoin/market_chart/range', {
                vs_currency: currencyCode,
                from: String(fromTimestamp),
                to: String(toTimestamp),
            }, {}, 3600);

            for (const [timestamp, price] of data.prices) {
                const dateKey = format(startOfDay(new Date(timestamp)), 'yyyy-MM-dd');
                prices[dateKey] = price;
            }
            currentStartDate = addDays(currentEndDate, 1);
        }
        return prices;
    } catch (error) {
        console.error("Error in getDailyPrices:", error);
        throw new Error("Failed to fetch historical prices from CoinGecko.");
    }
}

/**
 * Generates an enhanced tax report with detailed lot tracking and tax optimization
 */
export async function getEnhancedTaxReport(input: EnhancedTaxReportInput): Promise<EnhancedTaxReportOutput> {
    try {
        const { 
            walletData: walletDataString, 
            startDate: startDateString, 
            endDate: endDateString, 
            currency: currencyUpper,
            accountingMethod = 'FIFO',
            jurisdiction = 'US'
        } = input;
        
        const currency = currencyUpper as Currency;
        const walletData: WalletData = JSON.parse(walletDataString);
        const startDate = startOfDay(new Date(startDateString));
        const endDate = startOfDay(new Date(endDateString));
        
        // Initialize tax calculator
        const taxCalc = new TaxCalculator(accountingMethod as AccountingMethod, jurisdiction as Jurisdiction);
        
        // Build set of wallet addresses for self-transfer detection
        const walletAddresses = new Set(walletData.addresses.map(a => a.address));
        
        // Sort transactions chronologically
        const allTransactions = [...walletData.transactions].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Fetch daily prices
        const dailyPrices = await getDailyPrices(startDate, endDate, currency);
        const latestPrice = walletData.btcPrices[currency]?.last || 0;
        
        // Track for summary calculations
        let inflowDuringPeriod = 0;
        let outflowDuringPeriod = 0;
        let tradingFeesDuringPeriod = 0;
        
        // Process all transactions
        for (const tx of allTransactions) {
            const txDate = new Date(tx.date);
            const dateKey = format(startOfDay(txDate), 'yyyy-MM-dd');
            const historicalPrice = tx.historicalPrice || dailyPrices[dateKey] || latestPrice;
            const txValue = Math.abs(tx.btc) * historicalPrice;
            
            // Classify transaction
            const classification = classifyTransaction(tx, walletAddresses);
            
            if (classification.category === 'SELF_TRANSFER') {
                // Non-taxable, skip
                continue;
            }
            
            if (classification.category === 'ACQUISITION') {
                // Received BTC - add as acquisition
                // For purchases, fees paid should be added to cost basis
                const feeInBtc = tx.fee / 1e8;
                const feeValue = feeInBtc * historicalPrice;
                const adjustedCostBasis = txValue + feeValue; // Include fees in cost basis
                
                taxCalc.addAcquisition(
                    tx.id,
                    txDate,
                    tx.btc,
                    adjustedCostBasis,
                    tx.toAddress[0],
                    classification.incomeType
                );
                
                if (isWithinInterval(txDate, { start: startDate, end: endDate })) {
                    inflowDuringPeriod += txValue;
                }
            } else if (classification.category === 'DISPOSAL') {
                // Sent BTC - add as disposal
                const feeInBtc = tx.fee / 1e8;
                const amountSold = Math.abs(tx.btc); // Actual BTC amount disposed
                const feeValue = feeInBtc * historicalPrice;
                const proceeds = txValue - feeValue; // Net proceeds after fees
                
                taxCalc.addDisposal(
                    tx.id,
                    txDate,
                    amountSold,
                    proceeds,
                    classification.disposalType || 'SALE'
                );
                
                if (isWithinInterval(txDate, { start: startDate, end: endDate })) {
                    outflowDuringPeriod += txValue;
                    tradingFeesDuringPeriod += feeValue;
                }
            }
        }
        
        // Get tax summary
        const taxSummary = taxCalc.getSummary();
        
        // Calculate unrealized gains with current price
        const unrealizedData = taxCalc.calculateUnrealizedGains(latestPrice);
        
        // Build portfolio history
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Calculate starting portfolio state
        let runningBtc = 0;
        let runningCost = 0;
        
        const balanceHistory: Record<string, { btc: number; cost: number }> = {};
        
        for (const tx of allTransactions) {
            const txDate = startOfDay(new Date(tx.date));
            const dateKey = format(txDate, 'yyyy-MM-dd');
            const historicalPrice = tx.historicalPrice || dailyPrices[dateKey] || latestPrice;
            const txValue = Math.abs(tx.btc) * historicalPrice;
            
            const classification = classifyTransaction(tx, walletAddresses);
            if (classification.category === 'SELF_TRANSFER') continue;
            
            if (tx.btc > 0) {
                runningBtc += tx.btc;
                runningCost += txValue;
            } else {
                if (runningBtc > 0) {
                    const avgCost = runningCost / runningBtc;
                    runningCost -= Math.abs(tx.btc) * avgCost;
                }
                runningBtc += tx.btc;
            }
            
            runningBtc = Math.max(0, runningBtc);
            runningCost = Math.max(0, runningCost);
            
            balanceHistory[dateKey] = { btc: runningBtc, cost: runningCost };
        }
        
        let lastKnownBtc = 0;
        let lastKnownCost = 0;
        
        const portfolioHistory = dateInterval.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            if (balanceHistory[dateKey]) {
                lastKnownBtc = balanceHistory[dateKey].btc;
                lastKnownCost = balanceHistory[dateKey].cost;
            }
            const price = dailyPrices[dateKey] || latestPrice;
            return {
                date: day.toISOString(),
                totalValue: lastKnownBtc * price,
                costBasis: lastKnownCost,
            };
        });
        
        // Calculate holdings by address with tax information
        const addressBalances: { [address: string]: { balance: number } } = {};
        for (const utxo of walletData.utxos) {
            if (!addressBalances[utxo.address]) {
                addressBalances[utxo.address] = { balance: 0 };
            }
            addressBalances[utxo.address].balance += utxo.value / 1e8;
        }
        
        const totalBtc = Object.values(addressBalances).reduce((sum, a) => sum + a.balance, 0);
        const totalCostBasis = taxSummary.remainingLots.reduce((sum, lot) => sum + lot.costPerUnit * lot.remaining, 0);
        
        const holdings = Object.entries(addressBalances).map(([address, data]) => {
            const cost = totalBtc > 0 ? data.balance * (totalCostBasis / totalBtc) : 0;
            const marketValue = data.balance * latestPrice;
            const potentialGain = marketValue - cost;
            const roi = cost > 0 ? (potentialGain / cost) * 100 : 0;
            
            // Find average holding period for this address
            const addressLots = taxSummary.remainingLots.filter(lot => lot.address === address);
            const avgHoldingDays = addressLots.length > 0
                ? addressLots.reduce((sum, lot) => sum + differenceInDays(new Date(), lot.date), 0) / addressLots.length
                : 0;
            
            const taxCategory: 'LONG_TERM' | 'SHORT_TERM' = avgHoldingDays >= JURISDICTION_RULES[jurisdiction as Jurisdiction].longTermHoldingPeriodDays
                ? 'LONG_TERM'
                : 'SHORT_TERM';
            
            return {
                address,
                balance: data.balance,
                cost,
                marketValue,
                roi,
                potentialGain,
                taxCategory,
                holdingPeriodDays: Math.floor(avgHoldingDays),
            };
        });
        
        // Format lots with unrealized gains
        const lots = unrealizedData.lotDetails.map(detail => ({
            id: detail.lot.id,
            txid: detail.lot.txid,
            date: detail.lot.date.toISOString(),
            amount: detail.lot.amount,
            costBasis: detail.lot.costBasis,
            costPerUnit: detail.lot.costPerUnit,
            remaining: detail.lot.remaining,
            currentValue: detail.currentValue,
            unrealizedGain: detail.unrealizedGain,
            taxCategory: detail.taxCategory,
            holdingPeriodDays: differenceInDays(new Date(), detail.lot.date),
            address: detail.lot.address,
        }));
        
        // Format disposals
        const disposals = taxSummary.disposals.map(d => ({
            txid: d.txid,
            date: d.date.toISOString(),
            amount: d.amount,
            proceeds: d.proceeds,
            costBasis: d.costBasis,
            realizedGain: d.realizedGain,
            type: d.type,
            lots: d.lots.map(l => ({
                lotId: l.lotId,
                amount: l.amount,
                costBasis: l.costBasis,
                acquisitionDate: l.acquisitionDate.toISOString(),
                holdingPeriodDays: l.holdingPeriodDays,
                taxCategory: l.taxCategory,
            })),
        }));
        
        // Format income events
        const income = taxSummary.income.map(i => ({
            txid: i.txid,
            date: i.date.toISOString(),
            amount: i.amount,
            fairMarketValue: i.fairMarketValue,
            type: i.type,
        }));
        
        // Final summary
        const startValue = portfolioHistory.length > 0 ? portfolioHistory[0].totalValue : 0;
        const endValue = totalBtc * latestPrice;
        const totalValueChange = endValue - startValue;
        const totalValueChangePercentage = startValue > 0 ? (totalValueChange / startValue) * 100 : 0;
        
        const report: EnhancedTaxReportOutput = {
            summary: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                startValue,
                endValue,
                totalValueChange,
                totalValueChangePercentage,
                costBasis: totalCostBasis,
                unrealizedGains: unrealizedData.unrealized,
                inflow: inflowDuringPeriod,
                outflow: outflowDuringPeriod,
                tradingFees: tradingFeesDuringPeriod,
                realizedGains: taxSummary.totalCapitalGains,
                
                // Enhanced fields
                shortTermGains: taxSummary.shortTermGains,
                longTermGains: taxSummary.longTermGains,
                totalCapitalGains: taxSummary.totalCapitalGains,
                ordinaryIncome: taxSummary.ordinaryIncome,
                deductibleFees: tradingFeesDuringPeriod,
                harvestableShortTermLosses: unrealizedData.harvestableShortTermLosses,
                harvestableLongTermLosses: unrealizedData.harvestableLongTermLosses,
            },
            portfolioHistory,
            holdings,
            disposals,
            income,
            lots,
            accountingMethod,
            jurisdiction,
            jurisdictionRules: JURISDICTION_RULES[jurisdiction as Jurisdiction],
        };
        
        return report;
        
    } catch (e: any) {
        console.error("Critical error in getEnhancedTaxReport:", e);
        throw new Error(e.message || "An unexpected error occurred while generating the enhanced report.");
    }
}
