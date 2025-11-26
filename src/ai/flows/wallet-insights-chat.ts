
'use server';

/**
 * @fileOverview An AI agent that answers questions about a user's Bitcoin wallet.
 *
 * - walletInsightsChat - A function that handles the chat interaction.
 * - WalletInsightsChatInput - The input type for the walletInsightsChat function.
 * - WalletInsightsChatOutput - The return type for the walletInsightsChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { securityRecommendationsTool } from './security-recommendations';
import { analyzeBitcoinTransaction, analyzeBitcoinAddress } from './enhanced-bitcoin-analysis';
import { getLatestBitcoinNews } from '@/lib/newsService';
import { bitcoin } from '@/lib/bitcoin-init';
import type { WalletData } from '@/lib/types';

const HistoryMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
}).passthrough();

const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CHARS = 1200;
const MAX_TX_FOR_MODEL = 40;
const MAX_UTXO_FOR_MODEL = 80;
const MAX_ADDRESS_FOR_MODEL = 25;
const WALLET_JSON_CHAR_BUDGET = 14000;

const trimMessageContent = (content: string): string => {
  if (content.length <= MAX_HISTORY_CHARS) {
    return content;
  }

  return `${content.slice(0, MAX_HISTORY_CHARS)}…`;
};

const minifyJsonString = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
};

const buildModelHistory = (
  history: WalletInsightsChatInput['history']
): { role: 'user' | 'model'; content: { text: string }[] }[] => {
  const trimmedHistory = (history || [])
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((item) => item.role !== 'system')
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      content: [{ text: trimMessageContent(item.content) }],
    })) as { role: 'user' | 'model'; content: { text: string }[] }[];

  // Ensure the conversation starts with a user message to reduce model confusion
  while (trimmedHistory.length > 0 && trimmedHistory[0].role === 'model') {
    trimmedHistory.shift();
  }

  return trimmedHistory;
};

const normalizeWalletData = (wallet: any): WalletData => {
  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions : [];
  const utxos = Array.isArray(wallet?.utxos) ? wallet.utxos : [];
  const addresses = Array.isArray(wallet?.addresses) ? wallet.addresses : [];

  return {
    ...wallet,
    balanceBTC: typeof wallet?.balanceBTC === 'number' ? wallet.balanceBTC : 0,
    btcPrice: typeof wallet?.btcPrice === 'number' ? wallet.btcPrice : 0,
    securityScore: typeof wallet?.securityScore === 'number' ? wallet.securityScore : 0,
    opsecThreat: wallet?.opsecThreat ?? 'Low',
    usedAddressCount: typeof wallet?.usedAddressCount === 'number' ? wallet.usedAddressCount : addresses.length,
    dustAmountBTC: typeof wallet?.dustAmountBTC === 'number' ? wallet.dustAmountBTC : 0,
    dustUtxoCount: typeof wallet?.dustUtxoCount === 'number' ? wallet.dustUtxoCount : 0,
    btcPrices: wallet?.btcPrices ?? {},
    performance: wallet?.performance ?? { change24h: 0, change7d: 0, change30d: 0 },
    inflowOutflow: wallet?.inflowOutflow ?? { inflowBTC: 0, outflowBTC: 0 },
    utxos,
    transactions,
    addresses,
    averageFeeRate: typeof wallet?.averageFeeRate === 'number' ? wallet.averageFeeRate : 0,
  } as WalletData;
};

const clampArray = <T,>(items: T[], limit: number) => items.slice(0, Math.max(0, limit));

const compactWalletDataForPrompt = (walletDataString: string): string => {
  try {
    const normalizedWallet = normalizeWalletData(JSON.parse(walletDataString));

    const transactions = clampArray(
      [...normalizedWallet.transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      MAX_TX_FOR_MODEL
    ).map((tx) => ({
      id: tx.id,
      date: tx.date,
      btc: tx.btc,
      fee: tx.fee,
      type: tx.type,
      status: tx.status,
      confirmations: tx.confirmations,
      historicalPrice: tx.historicalPrice,
      fromAddress: tx.fromAddress?.slice(0, 2),
      toAddress: tx.toAddress?.slice(0, 2),
      labels: clampArray(tx.labels || [], 3),
    }));

    const utxos = clampArray(
      [...normalizedWallet.utxos].sort((a, b) => b.value - a.value),
      MAX_UTXO_FOR_MODEL
    ).map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      address: utxo.address,
    }));

    const addresses = clampArray(
      [...normalizedWallet.addresses].sort((a, b) => b.balance - a.balance),
      MAX_ADDRESS_FOR_MODEL
    ).map((address) => ({
      address: address.address,
      balance: address.balance,
      n_tx: address.n_tx,
      totalReceived: address.totalReceived,
    }));

    const compactPayload = {
      balanceBTC: normalizedWallet.balanceBTC,
      btcPrice: normalizedWallet.btcPrice,
      btcPrices: normalizedWallet.btcPrices,
      securityScore: normalizedWallet.securityScore,
      opsecThreat: normalizedWallet.opsecThreat,
      usedAddressCount: normalizedWallet.usedAddressCount,
      dustAmountBTC: normalizedWallet.dustAmountBTC,
      dustUtxoCount: normalizedWallet.dustUtxoCount,
      averageFeeRate: normalizedWallet.averageFeeRate,
      performance: normalizedWallet.performance,
      inflowOutflow: normalizedWallet.inflowOutflow,
      counts: {
        transactions: normalizedWallet.transactions.length,
        utxos: normalizedWallet.utxos.length,
        addresses: normalizedWallet.addresses.length,
      },
      transactions,
      utxos,
      addresses,
    };

    const primaryPayloadString = JSON.stringify(compactPayload);
    if (primaryPayloadString.length <= WALLET_JSON_CHAR_BUDGET) {
      return primaryPayloadString;
    }

    const tighterPayloadString = JSON.stringify({
      ...compactPayload,
      transactions: clampArray(transactions, Math.ceil(MAX_TX_FOR_MODEL / 2)),
      utxos: clampArray(utxos, Math.ceil(MAX_UTXO_FOR_MODEL / 2)),
      addresses: clampArray(addresses, Math.ceil(MAX_ADDRESS_FOR_MODEL / 2)),
    });

    if (tighterPayloadString.length <= WALLET_JSON_CHAR_BUDGET) {
      return tighterPayloadString;
    }

    return JSON.stringify({
      ...compactPayload,
      transactions: [],
      utxos: [],
      addresses: [],
    });
  } catch {
    const minified = minifyJsonString(walletDataString);
    try {
      return JSON.stringify(JSON.parse(minified));
    } catch {
      return minified;
    }
  }
};

const WalletInsightsChatInputSchema = z.object({
  question: z.string().describe('The user question about their Bitcoin wallet.'),
  walletData: z.string().describe('JSON string containing wallet data including balance, transaction history, security analysis, UTXOs, etc.'),
  history: z.array(HistoryMessageSchema).optional().describe("The history of the conversation so far."),
  preferredCurrency: z.string().optional().describe('The user\'s preferred fiat currency (e.g., "USD", "EUR", "GBP", "CAD", "AUD", "JPY"). Use this as the default currency unless the user explicitly specifies a different currency in their question.'),
});
export type WalletInsightsChatInput = z.infer<typeof WalletInsightsChatInputSchema>;

const ChartDataSchema = z.object({
  type: z.enum(['pie', 'bar', 'line', 'scatter', 'area', 'treemap', 'radial', 'radar']).describe('The type of chart to render.'),
  data: z
    .array(
      z
        .object({
          name: z
            .string()
            .describe(
              'For pie/bar/line/area charts, the name/label for the data point. For scatter plots, a unique identifier for the point.'
            ),
          value: z
            .number()
            .optional() // Made optional to support other chart data structures
            .describe(
              'For pie/bar/line/area charts, the numerical value of the data point.'
            ),
        })
        .passthrough() // Allows other keys, e.g. `x` and `y` for scatter plots
    )
    .describe(
      'The data for the chart. For scatter plots, you MUST include additional keys `x` and `y`. For treemaps, you MUST include a key for size (e.g. `size`).'
    ),
  config: z.object({
    pie: z.object({
        dataKey: z.string(),
        nameKey: z.string(),
    }).optional().describe('Configuration for pie charts.'),
    bar: z.object({
        dataKey: z.string(),
    }).optional().describe('Configuration for bar charts.'),
    line: z.object({
        dataKey: z.string(),
    }).optional().describe('Configuration for line charts.'),
    area: z.object({
        dataKey: z.string(),
    }).optional().describe('Configuration for area charts.'),
    scatter: z.object({
        xAxisLabel: z.string().optional().describe('Label for the x-axis.'),
        yAxisLabel: z.string().optional().describe('Label for the y-axis.'),
    }).optional().describe('Configuration for scatter plots. The data for scatter plots MUST contain `x` and `y` keys.'),
    treemap: z.object({
        dataKey: z.string(),
        nameKey: z.string(),
    }).optional().describe('Configuration for treemaps. Data MUST contain a key for size (e.g. `size`).'),
    radial: z.object({
        dataKey: z.string(),
        nameKey: z.string(),
    }).optional().describe('Configuration for radial bar charts.'),
    radar: z.object({
        angleKey: z.string().describe("The key in the data array representing the axis label (e.g., 'subject')."),
        dataKey: z.string().describe("The key in the data array representing the value for that axis."),
    }).optional().describe('Configuration for radar charts.'),
    xAxis: z.object({
        dataKey: z.string(),
    }).optional().describe('Configuration for the x-axis of bar, line, and area charts.'),
  }).describe('The configuration for the chart, including data keys and labels. This must correspond to the chart type requested.'),
  title: z.string().optional().describe('An optional title for the chart.'),
}).describe('Structured data for rendering a chart.');


const FollowUpSuggestionSchema = z.object({
  question: z.string().describe('A helpful follow-up question or suggestion'),
  context: z.string().describe('Brief context explaining why this follow-up is relevant'),
});

const WalletInsightsChatOutputSchema = z.object({
  answer: z.string().describe('The AI answer to the user question. This should summarize the findings and mention that a chart was created if applicable.'),
  chart: ChartDataSchema.optional().nullable().describe('If the user asks for a visualization or a chart, generate the data for it here.'),
  followUpSuggestions: z.array(FollowUpSuggestionSchema).optional().describe('Helpful follow-up questions or suggestions based on the response. Include 1-3 relevant suggestions that would be natural next steps for the user.'),
});
export type WalletInsightsChatOutput = z.infer<typeof WalletInsightsChatOutputSchema>;

const SimplifiedChatOutputSchema = z.object({
  answer: z.string(),
  followUpSuggestions: z.array(FollowUpSuggestionSchema).optional(),
});

// Enhanced Bitcoin analysis tools
export const enhancedTransactionAnalysisTool = ai.defineTool(
  {
    name: 'analyzeBitcoinTransaction',
    description: 'Provides detailed Bitcoin transaction analysis including privacy score, fee efficiency, risk factors, and recommendations. Use when user asks for "detailed transaction analysis", "privacy analysis", or "transaction insights".',
    inputSchema: z.object({
      transactionId: z.string(),
      walletData: z.string(),
    }),
    outputSchema: z.object({
      analysis: z.object({
        transactionType: z.enum(['send', 'receive', 'self-transfer', 'exchange', 'unknown']),
        privacyScore: z.number().min(0).max(100),
        feeEfficiency: z.enum(['excellent', 'good', 'fair', 'poor']),
        riskFactors: z.array(z.string()),
        recommendations: z.array(z.string()),
        associatedEntities: z.array(z.string()).optional(),
      }),
      summary: z.string(),
    }),
  },
  async (input) => {
    return await analyzeBitcoinTransaction(input);
  }
);

const getWalletCurrency = (wallet: WalletData): { code: string; symbol: string } => {
  const currencyEntry = Object.entries(wallet.btcPrices || {}).find(([, value]: any) => {
    return typeof value?.last === 'number' && value.last === wallet.btcPrice;
  });

  const code = (currencyEntry?.[0] || 'USD').toUpperCase();
  const symbol =
    (currencyEntry?.[1] as any)?.symbol ||
    (code === 'GBP'
      ? '£'
      : code === 'EUR'
        ? '€'
        : code === 'JPY'
          ? '¥'
          : '$');

  return { code, symbol };
};

const computePnlAnalytics = (wallet: WalletData) => {
  const { code, symbol } = getWalletCurrency(wallet);
  const transactions = [...wallet.transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningHoldings = 0;
  let runningCostBasisFiat = 0;
  let realizedPnlFiat = 0;

  transactions.forEach((tx) => {
    const price = typeof tx.historicalPrice === 'number' && tx.historicalPrice > 0
      ? tx.historicalPrice
      : wallet.btcPrice || 0;
    const amount = tx.btc;

    if (amount > 0) {
      const fiatCost = amount * price;
      runningHoldings += amount;
      runningCostBasisFiat += fiatCost;
    } else if (amount < 0 && runningHoldings > 0) {
      const sellAmount = Math.abs(amount);
      const costPerBtc = runningHoldings > 0 ? runningCostBasisFiat / runningHoldings : 0;
      const costRemoved = costPerBtc * sellAmount;
      const proceeds = sellAmount * price;
      realizedPnlFiat += proceeds - costRemoved;
      runningHoldings -= sellAmount;
      runningCostBasisFiat = Math.max(0, runningCostBasisFiat - costRemoved);
    }
  });

  const currentValueFiat = wallet.balanceBTC * (wallet.btcPrice || 0);
  const unrealizedPnlFiat = currentValueFiat - runningCostBasisFiat;
  const roiPercent = runningCostBasisFiat > 0
    ? ((currentValueFiat - runningCostBasisFiat) / runningCostBasisFiat) * 100
    : null;

  const remainingCostPerBtc = wallet.balanceBTC > 0 && runningCostBasisFiat > 0
    ? runningCostBasisFiat / wallet.balanceBTC
    : null;

  const costBasisPerUtxo = wallet.utxos.slice(0, 50).map((utxo) => {
    const valueBTC = utxo.value / 1e8;
    return {
      txid: utxo.txid,
      vout: utxo.vout,
      valueBTC,
      estimatedCostBasisFiat: remainingCostPerBtc ? remainingCostPerBtc * valueBTC : null,
      estimatedCostPerBTC: remainingCostPerBtc,
    };
  });

  // Use available performance windows to approximate a time-weighted return signal
  const timeWeightedReturnPercent =
    wallet.performance?.change30d ?? wallet.performance?.change7d ?? wallet.performance?.change24h ?? null;

  // Compute volatility resilience from BTC balance drawdowns
  let peak = 0;
  let trough = 0;
  let maxDrawdown = 0;
  let running = 0;
  transactions.forEach((tx) => {
    running += tx.btc;
    if (running > peak) {
      peak = running;
      trough = running;
    }
    if (running < trough) {
      trough = running;
    }
    if (peak > 0) {
      const drawdown = (peak - trough) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  });
  const volatilityResilienceScore = Math.max(0, Math.min(100, 100 - maxDrawdown * 120));

  return {
    code,
    symbol,
    currentValueFiat,
    costBasisFiat: runningCostBasisFiat,
    roiPercent,
    realizedPnlFiat,
    unrealizedPnlFiat,
    timeWeightedReturnPercent,
    volatilityResilienceScore,
    costBasisPerUtxo,
  };
};

const bucketHodlWaves = (wallet: WalletData) => {
  const now = Date.now();
  const txDateMap = new Map(wallet.transactions.map((tx) => [tx.id, new Date(tx.date).getTime()]));
  const buckets: Record<string, number> = {
    '0-30d': 0,
    '1-6m': 0,
    '6-12m': 0,
    '1-2y': 0,
    '2-5y': 0,
    '5y+': 0,
  };

  wallet.utxos.forEach((utxo) => {
    const createdAt = txDateMap.get(utxo.txid) ?? now;
    const ageDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    const valueBTC = utxo.value / 1e8;

    if (ageDays <= 30) buckets['0-30d'] += valueBTC;
    else if (ageDays <= 180) buckets['1-6m'] += valueBTC;
    else if (ageDays <= 365) buckets['6-12m'] += valueBTC;
    else if (ageDays <= 365 * 2) buckets['1-2y'] += valueBTC;
    else if (ageDays <= 365 * 5) buckets['2-5y'] += valueBTC;
    else buckets['5y+'] += valueBTC;
  });

  const totalBTC = Object.values(buckets).reduce((sum, v) => sum + v, 0) || 1;

  return Object.entries(buckets).map(([bucket, btc]) => ({
    bucket,
    btc,
    percentage: (btc / totalBTC) * 100,
  }));
};

const computeDormancyScore = (wallet: WalletData) => {
  const now = Date.now();
  const txDateMap = new Map(wallet.transactions.map((tx) => [tx.id, new Date(tx.date).getTime()]));
  const weightedAge = wallet.utxos.reduce((sum, utxo) => {
    const createdAt = txDateMap.get(utxo.txid) ?? now;
    const ageDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    return sum + ageDays * (utxo.value / 1e8);
  }, 0);
  const totalBTC = wallet.utxos.reduce((sum, utxo) => sum + utxo.value / 1e8, 0);
  const averageAge = totalBTC > 0 ? weightedAge / totalBTC : 0;
  return Math.max(0, Math.min(100, Math.min(averageAge / 5, 100)));
};

const computeSpendingHabits = (wallet: WalletData) => {
  const monthly = new Map<string, { sent: number; received: number; sendAmounts: number[]; receiveAmounts: number[] }>();
  const monthlyFlow = new Map<string, { inflow: number; outflow: number }>();
  wallet.transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const entry = monthly.get(key) || { sent: 0, received: 0, sendAmounts: [], receiveAmounts: [] };
    if (tx.type === 'Sent') {
      entry.sent += 1;
      entry.sendAmounts.push(Math.abs(tx.btc));
      const flow = monthlyFlow.get(key) || { inflow: 0, outflow: 0 };
      flow.outflow += Math.abs(tx.btc);
      monthlyFlow.set(key, flow);
    } else {
      entry.received += 1;
      entry.receiveAmounts.push(tx.btc);
      const flow = monthlyFlow.get(key) || { inflow: 0, outflow: 0 };
      flow.inflow += tx.btc;
      monthlyFlow.set(key, flow);
    }
    monthly.set(key, entry);
  });

  const monthlyActivity = Array.from(monthly.entries())
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .slice(0, 6)
    .map(([month, stats]) => ({
      month,
      sentCount: stats.sent,
      receivedCount: stats.received,
      averageSendSizeBTC: stats.sendAmounts.length > 0
        ? stats.sendAmounts.reduce((sum, v) => sum + v, 0) / stats.sendAmounts.length
        : null,
      averageReceiveSizeBTC: stats.receiveAmounts.length > 0
        ? stats.receiveAmounts.reduce((sum, v) => sum + v, 0) / stats.receiveAmounts.length
        : null,
    }));

  const recentNetFlow = wallet.transactions
    .filter((tx) => new Date(tx.date).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000)
    .reduce((sum, tx) => sum + tx.btc, 0);

  const accumulationTrend = recentNetFlow > 0.01
    ? 'accumulating'
    : recentNetFlow < -0.01
      ? 'distributing'
      : 'neutral';

  const txIntervals = wallet.transactions
    .map((tx) => new Date(tx.date).getTime())
    .sort((a, b) => a - b)
    .map((timestamp, index, arr) => (index === 0 ? null : timestamp - arr[index - 1]))
    .filter((v): v is number => typeof v === 'number');
  const averageIntervalDays = txIntervals.length > 0
    ? txIntervals.reduce((sum, v) => sum + v, 0) / txIntervals.length / (1000 * 60 * 60 * 24)
    : null;
  const dcaScore = averageIntervalDays ? Math.max(0, Math.min(100, 100 - averageIntervalDays * 2)) : 50;

  const inflowOutflowHeatmap = Array.from(monthlyFlow.entries())
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .slice(0, 6)
    .map(([bucket, flow]) => ({ bucket, inflowBTC: flow.inflow, outflowBTC: flow.outflow }));

  return { monthlyActivity, accumulationTrend, dcaScore, inflowOutflowHeatmap };
};

const computeFeeEconomics = (wallet: WalletData) => {
  const sentTxs = wallet.transactions.filter((tx) => tx.type === 'Sent' && tx.fee > 0);
  const totalFeesPaidBTC = sentTxs.reduce((sum, tx) => sum + tx.fee / 1e8, 0);
  const averageFeePaidBTC = sentTxs.length > 0 ? totalFeesPaidBTC / sentTxs.length : null;
  const feeOptimalityScore = wallet.averageFeeRate > 0
    ? Math.max(0, Math.min(100, 80 - Math.abs(wallet.averageFeeRate - 20)))
    : 50;

  const txDateMap = new Map(wallet.transactions.map((tx) => [tx.id, new Date(tx.date).getTime()]));
  const hotVsColdSeparation = wallet.utxos.reduce(
    (acc, utxo) => {
      const createdAt = txDateMap.get(utxo.txid) ?? Date.now();
      const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
      const valueBTC = utxo.value / 1e8;

      if (ageDays <= 90) {
        acc.hotCount += 1;
        acc.hotValueBTC += valueBTC;
      } else {
        acc.coldCount += 1;
        acc.coldValueBTC += valueBTC;
      }

      return acc;
    },
    { hotCount: 0, coldCount: 0, hotValueBTC: 0, coldValueBTC: 0 }
  );

  return { totalFeesPaidBTC, averageFeePaidBTC, feeOptimalityScore, hotVsColdSeparation };
};

const computeCounterpartyProfile = (wallet: WalletData) => {
  const labeledTxs = wallet.transactions.flatMap((tx) => tx.labels || []);
  const exchangeTouchpoints = labeledTxs.filter((label) => label.type === 'exchange').length;
  const taggedEntityCount = labeledTxs.length;
  const institutionalProximityScore = Math.max(0, Math.min(100, exchangeTouchpoints * 10));
  const categoryCounts = labeledTxs.reduce<Record<string, number>>((acc, label) => {
    const category = label.type || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const knownRecipientCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  return { exchangeTouchpoints, taggedEntityCount, institutionalProximityScore, knownRecipientCategories };
};

const computeRiskSignals = (wallet: WalletData, currentFiatValue: number) => {
  const unusualActivityAlert: string[] = [];
  const largeTx = wallet.transactions.find((tx) => Math.abs(tx.btc) * (wallet.btcPrice || 0) > currentFiatValue * 0.5);
  if (largeTx) {
    unusualActivityAlert.push(`Large movement of ${Math.abs(largeTx.btc).toFixed(4)} BTC detected in tx ${largeTx.id}.`);
  }
  if (wallet.dustUtxoCount > 0) {
    unusualActivityAlert.push('Dust UTXOs present; monitor for potential tracking attempts.');
  }

  const destinationRiskLevel = wallet.transactions.some((tx) =>
    (tx.labels || []).some((label) => label.type === 'exchange')
  )
    ? 'medium'
    : 'low';

  const minerProximityScore = wallet.transactions.some((tx) => tx.labels?.some((label) => label.label.toLowerCase().includes('miner')))
    ? 70
    : 30;

  const dustAttackSuspicion = wallet.dustUtxoCount > 3;

  return { unusualActivityAlert, destinationRiskLevel, minerProximityScore, dustAttackSuspicion };
};

const computeMetaAnalytics = (wallet: WalletData) => {
  const txCount = wallet.transactions.length;
  const sendRatio = txCount > 0
    ? wallet.transactions.filter((tx) => tx.type === 'Sent').length / txCount
    : 0;

  const walletPersona = sendRatio < 0.35
    ? 'HODLer'
    : sendRatio < 0.55
      ? 'DCA investor'
      : 'trader';

  const labelCoverageScore = wallet.transactions.length > 0
    ? Math.min(100, ((wallet.transactions.filter((tx) => (tx.labels || []).length > 0).length / wallet.transactions.length) * 100))
    : 0;

  return {
    walletPersona,
    diversificationScore: 100, // Only BTC supported currently
    labelCoverageScore,
  };
};

export const enhancedAddressAnalysisTool = ai.defineTool(
  {
    name: 'analyzeBitcoinAddress',
    description: 'Provides detailed Bitcoin address analysis including address type, privacy risk, reuse patterns, and associated entities. Use when user asks for "address analysis", "privacy assessment", or "address insights".',
    inputSchema: z.object({
      address: z.string(),
      walletData: z.string(),
    }),
    outputSchema: z.object({
      analysis: z.object({
        addressType: z.enum(['p2pkh', 'p2sh', 'p2wpkh', 'p2wsh', 'p2tr']),
        reuseCount: z.number(),
        privacyRisk: z.enum(['low', 'medium', 'high', 'critical']),
        associatedEntities: z.array(z.string()),
        clusteringScore: z.number().min(0).max(100).optional(),
      }),
      summary: z.string(),
    }),
  },
  async (input) => {
    return await analyzeBitcoinAddress(input);
  }
);

export const marketAnalysisTool = ai.defineTool(
  {
    name: 'analyzeBitcoinMarket',
    description: 'Provides Bitcoin market analysis including sentiment, trends, and market conditions. Use when user asks about "market sentiment", "bull/bear market", "Fear & Greed Index", or general market questions.',
    inputSchema: z.object({
      question: z.string(),
      walletData: z.string().optional(), // Optional for market analysis
    }),
    outputSchema: z.object({
      marketAnalysis: z.object({
        currentSentiment: z.enum(['bullish', 'bearish', 'neutral', 'mixed']),
        marketPhase: z.enum(['bull market', 'bear market', 'sideways', 'transition']),
        fearGreedLevel: z.enum(['extreme fear', 'fear', 'neutral', 'greed', 'extreme greed']),
        keyFactors: z.array(z.string()),
        outlook: z.string(),
      }),
      summary: z.string(),
    }),
  },
  async (input) => {
    // For now, provide a basic market analysis based on general knowledge
    // In the future, this could integrate with real market data APIs
    const currentDate = new Date().toISOString().split('T')[0];
    
    return {
      marketAnalysis: {
        currentSentiment: 'neutral' as const,
        marketPhase: 'sideways' as const,
        fearGreedLevel: 'neutral' as const,
        keyFactors: [
          'Bitcoin adoption continues to grow globally',
          'Institutional interest remains strong',
          'Regulatory clarity is improving in many jurisdictions',
          'Network security and hash rate are at all-time highs'
        ],
        outlook: 'Bitcoin continues to mature as a digital asset with growing institutional adoption and improving infrastructure.',
      },
      summary: `Based on current market conditions as of ${currentDate}, Bitcoin is experiencing a neutral market sentiment with sideways price action. The Fear & Greed Index suggests neutral market psychology. Key factors influencing the market include continued institutional adoption, improving regulatory clarity, and strong network fundamentals. The long-term outlook remains positive as Bitcoin continues to mature as a digital store of value.`
    };
  }
);

const BitcoinDecodeOutputSchema = z.object({
  decodedType: z.enum(['transaction', 'psbt', 'unknown']),
  summary: z.string(),
  details: z.object({
    inputs: z.array(
      z.object({
        address: z.string().nullable(),
        valueSats: z.number().nullable(),
        index: z.number(),
        finalized: z.boolean().optional(),
      })
    ),
    outputs: z.array(
      z.object({
        address: z.string().nullable(),
        valueSats: z.number().nullable(),
        index: z.number(),
      })
    ),
    feeSats: z.number().nullable(),
    locktime: z.number().nullable(),
    version: z.number().nullable(),
    isRbf: z.boolean().optional(),
    warnings: z.array(z.string()).default([]),
  }),
});

export const bitcoinDecodeTool = ai.defineTool(
  {
    name: 'decodeBitcoinData',
    description:
      'Decodes raw Bitcoin transactions (hex) or PSBTs to summarize inputs, outputs, and signing status. Use when the user pastes raw tx hex, PSBT base64, or asks to decode a transaction.',
    inputSchema: z.object({
      rawData: z.string(),
    }),
    outputSchema: BitcoinDecodeOutputSchema,
  },
  async (input) => {
    const warnings: string[] = [];

    try {
      const psbt = bitcoin.Psbt.fromBase64(input.rawData);
      const inputs = psbt.txInputs.map((txIn, index) => {
        const data = psbt.data.inputs[index];
        const finalized = Boolean(data.finalScriptSig || data.finalScriptWitness);
        return {
          address: (data as any)?.bip32Derivation?.[0]?.address || null,
          valueSats: (data as any)?.witnessUtxo?.value ?? null,
          index,
          finalized,
        };
      });

      const outputs = psbt.txOutputs.map((txOut, index) => {
        let address: string | null = null;
        try {
          address = bitcoin.address.fromOutputScript(txOut.script, bitcoin.networks.bitcoin);
        } catch {
          warnings.push(`Could not decode address for output ${index}.`);
        }

        return {
          address,
          valueSats: txOut.value ?? null,
          index,
        };
      });

      const unsignedInputs = inputs.filter((inputItem) => inputItem.finalized === false).length;
      const summary = `Decoded PSBT with ${inputs.length} input(s) and ${outputs.length} output(s). ${unsignedInputs} input(s) still need signatures.`;

      return {
        decodedType: 'psbt',
        summary,
        details: {
          inputs,
          outputs,
          feeSats: null,
          locktime: psbt.locktime ?? null,
          version: psbt.version ?? null,
          isRbf: psbt.txInputs.some((inputItem) => inputItem.sequence < 0xfffffffe),
          warnings,
        },
      };
    } catch {
      warnings.push('Not a valid PSBT or PSBT decoding failed.');
    }

    try {
      const tx = bitcoin.Transaction.fromHex(input.rawData);
      const inputs = tx.ins.map((inputItem, index) => ({
        address: null,
        valueSats: null,
        index,
        finalized: true,
      }));

      const outputs = tx.outs.map((output, index) => {
        let address: string | null = null;
        try {
          address = bitcoin.address.fromOutputScript(output.script, bitcoin.networks.bitcoin);
        } catch {
          warnings.push(`Could not decode address for output ${index}.`);
        }

        return {
          address,
          valueSats: output.value ?? null,
          index,
        };
      });

      const summary = `Decoded raw transaction with ${inputs.length} input(s) and ${outputs.length} output(s).`;

      return {
        decodedType: 'transaction',
        summary,
        details: {
          inputs,
          outputs,
          feeSats: null,
          locktime: tx.locktime ?? null,
          version: tx.version ?? null,
          isRbf: tx.ins.some((inputItem) => inputItem.sequence < 0xfffffffe),
          warnings: [...warnings, 'Fee cannot be determined without previous output values.'],
        },
      };
    } catch {
      warnings.push('Not a valid raw transaction.');
    }

    return {
      decodedType: 'unknown',
      summary: 'Unable to decode the provided data. Please ensure it is valid Bitcoin transaction hex or PSBT base64.',
      details: {
        inputs: [],
        outputs: [],
        feeSats: null,
        locktime: null,
        version: null,
        warnings,
      },
    };
  }
);

export const bitcoinNewsAnalysisTool = ai.defineTool(
  {
    name: 'analyzeBitcoinNews',
    description: 'Fetches and analyzes the latest Bitcoin news. Use when user asks about "latest Bitcoin news", "Bitcoin headlines", "what\'s happening with Bitcoin", or similar news-related questions.',
    inputSchema: z.object({
      question: z.string(),
    }),
    outputSchema: z.object({
      newsAnalysis: z.object({
        headlines: z.array(z.object({
          title: z.string(),
          summary: z.string(),
          date: z.string(),
          sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
          impact: z.enum(['low', 'medium', 'high']),
        })),
        overallSentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
        keyThemes: z.array(z.string()),
        marketImplications: z.string(),
      }),
      summary: z.string(),
    }),
  },
  async (input) => {
    try {
      const articles = await getLatestBitcoinNews();
      
      if (articles.length === 0 || (articles.length === 1 && (articles[0].title.includes('Error') || articles[0].title.includes('Misconfigured')))) {
        return {
          newsAnalysis: {
            headlines: [],
            overallSentiment: 'neutral' as const,
            keyThemes: ['News service unavailable'],
            marketImplications: 'Unable to assess market implications due to news service issues.',
          },
          summary: articles[0]?.summary || "I couldn't fetch the latest Bitcoin news at this time. Please try again later."
        };
      }

      // Analyze the news for sentiment and themes
      const headlines = articles.map(article => ({
        title: article.title,
        summary: article.summary,
        date: article.date,
        sentiment: 'neutral' as const, // Could be enhanced with sentiment analysis
        impact: 'medium' as const, // Could be enhanced with impact analysis
      }));

      // Simple keyword-based sentiment analysis
      const positiveKeywords = ['adoption', 'institutional', 'approval', 'growth', 'bullish', 'surge', 'rally'];
      const negativeKeywords = ['crash', 'decline', 'bearish', 'regulation', 'ban', 'hack', 'security'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      const themes: string[] = [];

      articles.forEach(article => {
        const text = (article.title + ' ' + article.summary).toLowerCase();
        
        positiveKeywords.forEach(keyword => {
          if (text.includes(keyword)) positiveCount++;
        });
        
        negativeKeywords.forEach(keyword => {
          if (text.includes(keyword)) negativeCount++;
        });

        // Extract themes
        if (text.includes('institutional')) themes.push('Institutional Adoption');
        if (text.includes('regulation') || text.includes('regulatory')) themes.push('Regulatory Developments');
        if (text.includes('etf')) themes.push('ETF News');
        if (text.includes('mining')) themes.push('Mining Updates');
        if (text.includes('security') || text.includes('hack')) themes.push('Security News');
      });

      const uniqueThemes = [...new Set(themes)];
      
      let overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
      if (positiveCount > negativeCount + 2) overallSentiment = 'positive';
      else if (negativeCount > positiveCount + 2) overallSentiment = 'negative';
      else if (positiveCount > 0 && negativeCount > 0) overallSentiment = 'mixed';

      const marketImplications = overallSentiment === 'positive' 
        ? 'The positive news sentiment suggests potential upward price pressure and increased market confidence.'
        : overallSentiment === 'negative'
        ? 'The negative news sentiment may create downward price pressure and reduced market confidence.'
        : 'The mixed news sentiment suggests balanced market conditions with both positive and negative factors at play.';

      return {
        newsAnalysis: {
          headlines,
          overallSentiment,
          keyThemes: uniqueThemes.length > 0 ? uniqueThemes : ['General Bitcoin News'],
          marketImplications,
        },
        summary: `Here are the latest Bitcoin headlines with ${overallSentiment} overall sentiment. Key themes include ${uniqueThemes.join(', ')}. ${marketImplications}`
      };
    } catch (error) {
      console.error('Error in bitcoinNewsAnalysisTool:', error);
      return {
        newsAnalysis: {
          headlines: [],
          overallSentiment: 'neutral' as const,
          keyThemes: ['Error fetching news'],
          marketImplications: 'Unable to assess market implications due to technical issues.',
        },
        summary: 'I encountered an error while fetching the latest Bitcoin news. Please try again later.'
      };
    }
  }
);

export const investmentInsightsTool = ai.defineTool(
  {
    name: 'provideInvestmentInsights',
    description: 'Provides Bitcoin investment insights and analysis. Use when user asks "is this a good time to buy Bitcoin", "should I invest in Bitcoin", "investment advice", or similar investment-related questions.',
    inputSchema: z.object({
      question: z.string(),
      context: z.string().optional(), // Could include news context or market conditions
    }),
    outputSchema: z.object({
      investmentAnalysis: z.object({
        currentConditions: z.string(),
        riskAssessment: z.enum(['low', 'medium', 'high']),
        timeHorizon: z.enum(['short-term', 'medium-term', 'long-term']),
        recommendations: z.array(z.string()),
        disclaimer: z.string(),
      }),
      summary: z.string(),
    }),
  },
  async (input) => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return {
      investmentAnalysis: {
        currentConditions: 'Bitcoin continues to mature as a digital asset with growing institutional adoption, improving regulatory clarity, and strong network fundamentals.',
        riskAssessment: 'high' as const,
        timeHorizon: 'long-term' as const,
        recommendations: [
          'Only invest what you can afford to lose',
          'Consider Bitcoin as part of a diversified portfolio',
          'Dollar-cost averaging can help reduce timing risk',
          'Focus on long-term fundamentals rather than short-term price movements',
          'Ensure you understand Bitcoin\'s volatility and risks',
          'Consider your risk tolerance and investment timeline'
        ],
        disclaimer: 'This is not financial advice. Bitcoin is a highly volatile asset. Always do your own research and consider consulting with a financial advisor before making investment decisions.',
      },
      summary: `As of ${currentDate}, Bitcoin presents both opportunities and risks for investors. While Bitcoin continues to mature with growing institutional adoption and improving infrastructure, it remains a high-risk, high-volatility asset. For those considering Bitcoin investment, it's important to only invest what you can afford to lose, consider it as part of a diversified portfolio, and focus on long-term fundamentals rather than short-term price movements. Remember, this is not financial advice and you should always do your own research.`
    };
  }
);

const WalletIntelligenceOutputSchema = z.object({
  balanceBTC: z.number(),
  balanceFiat: z.number().optional(),
  currency: z.string().optional(),
  valuations: z.object({
    totalFiatValue: z.number().nullable(),
    costBasisFiat: z.number().nullable(),
    roiPercent: z.number().nullable(),
    realizedPnlFiat: z.number().nullable(),
    unrealizedPnlFiat: z.number().nullable(),
    timeWeightedReturnPercent: z.number().nullable(),
    volatilityResilienceScore: z.number().nullable(),
    costBasisPerUtxo: z.array(
      z.object({
        txid: z.string(),
        vout: z.number(),
        valueBTC: z.number(),
        estimatedCostBasisFiat: z.number().nullable(),
        estimatedCostPerBTC: z.number().nullable(),
      })
    ),
  }),
  utxoSummary: z.object({
    total: z.number(),
    dustCount: z.number(),
    largestBTC: z.number().nullable(),
    averageBTC: z.number().nullable(),
    consolidationHint: z.string(),
  }),
  spendingPatterns: z.object({
    sentTxs: z.number(),
    receivedTxs: z.number(),
    rolling30dInflow: z.number(),
    rolling30dOutflow: z.number(),
    largestSendBTC: z.number().nullable(),
    largestReceiveBTC: z.number().nullable(),
    monthlyActivity: z.array(
      z.object({
        month: z.string(),
        sentCount: z.number(),
        receivedCount: z.number(),
        averageSendSizeBTC: z.number().nullable(),
        averageReceiveSizeBTC: z.number().nullable(),
      })
    ),
    accumulationTrend: z.enum(['accumulating', 'distributing', 'neutral']),
    dcaScore: z.number(),
    inflowOutflowHeatmap: z.array(
      z.object({
        bucket: z.string(),
        inflowBTC: z.number(),
        outflowBTC: z.number(),
      })
    ),
  }),
  whaleWatch: z.array(
    z.object({
      txid: z.string(),
      amountBTC: z.number(),
      direction: z.enum(['Sent', 'Received']),
      note: z.string(),
    })
  ),
  activity: z.object({
    mostActiveDay: z.string().nullable(),
    timeBuckets: z.array(
      z.object({
        bucket: z.string(),
        count: z.number(),
      })
    ),
    hodlWaves: z.array(
      z.object({
        bucket: z.string(),
        percentage: z.number(),
        btc: z.number(),
      })
    ),
    dormancyScore: z.number(),
    coinAgeDestroyed: z.number().nullable(),
  }),
  feeInsight: z.object({
    averageFeeRate: z.number(),
    guidance: z.string(),
    totalFeesPaidBTC: z.number(),
    averageFeePaidBTC: z.number().nullable(),
    feeOptimalityScore: z.number(),
    hotVsColdSeparation: z.object({
      hotCount: z.number(),
      coldCount: z.number(),
      hotValueBTC: z.number(),
      coldValueBTC: z.number(),
    }),
  }),
  addressReuse: z.object({
    reuseRate: z.number(),
    mostReused: z.array(
      z.object({
        address: z.string(),
        count: z.number(),
        balanceSats: z.number().optional(),
      })
    ),
    hygieneScore: z.number(),
    linkabilityRisk: z.number(),
    lightningExposure: z.string(),
    coinjoinStatus: z.enum(['none detected', 'possible', 'detected']),
    kycExposureProbability: z.number(),
  }),
  counterpartyProfile: z.object({
    exchangeTouchpoints: z.number(),
    taggedEntityCount: z.number(),
    institutionalProximityScore: z.number(),
    knownRecipientCategories: z.array(z.string()),
  }),
  riskSignals: z.object({
    unusualActivityAlert: z.array(z.string()),
    destinationRiskLevel: z.enum(['low', 'medium', 'high']),
    minerProximityScore: z.number(),
    dustAttackSuspicion: z.boolean(),
  }),
  metaAnalytics: z.object({
    walletPersona: z.enum(['HODLer', 'DCA investor', 'trader', 'miner', 'exchange hot wallet', 'merchant wallet', 'unknown']),
    diversificationScore: z.number(),
    labelCoverageScore: z.number(),
    networkAllocation: z.array(
      z.object({
        network: z.string(),
        percentage: z.number(),
      })
    ),
    ordinalRunesIndex: z.string(),
  }),
  summary: z.string(),
});

export const walletIntelligenceTool = ai.defineTool(
  {
    name: 'analyzeWalletIntelligence',
    description:
      'Provides balance checks, UTXO health, spending patterns, fee guidance, whale alerts, and activity analytics using the provided wallet data. Use for wallet-specific analytics, whale watching, or xpub/address insights.',
    inputSchema: z.object({
      walletData: z.string(),
    }),
    outputSchema: WalletIntelligenceOutputSchema,
  },
  async (input) => {
    const parsedWallet = JSON.parse(input.walletData);
    const wallet: WalletData = normalizeWalletData(parsedWallet);
    const pnlAnalytics = computePnlAnalytics(wallet);
    const hodlWaves = bucketHodlWaves(wallet);
    const dormancyScore = computeDormancyScore(wallet);
    const spendingHabits = computeSpendingHabits(wallet);
    const feeEconomics = computeFeeEconomics(wallet);
    const counterpartyProfile = computeCounterpartyProfile(wallet);

    const utxoValues = wallet.utxos.map((utxo) => utxo.value);
    const totalUtxoValue = utxoValues.reduce((sum, value) => sum + value, 0);
    const largestUtxo = utxoValues.length > 0 ? Math.max(...utxoValues) : null;
    const averageUtxo = utxoValues.length > 0 ? totalUtxoValue / utxoValues.length : null;

    const sentTxs = wallet.transactions.filter((tx) => tx.type === 'Sent');
    const receivedTxs = wallet.transactions.filter((tx) => tx.type === 'Received');
    const largestSend = sentTxs.length > 0 ? Math.min(...sentTxs.map((tx) => tx.btc)) : null;
    const largestReceive = receivedTxs.length > 0 ? Math.max(...receivedTxs.map((tx) => tx.btc)) : null;

    const whaleThreshold = Math.max(1, wallet.balanceBTC * 0.25);
    const whaleWatch = wallet.transactions
      .filter((tx) => Math.abs(tx.btc) >= whaleThreshold)
      .slice(0, 5)
      .map((tx) => ({
        txid: tx.id,
        amountBTC: Math.abs(tx.btc),
        direction: tx.type,
        note: Math.abs(tx.btc) >= 5 ? 'Potential whale-sized movement' : 'Large movement relative to your wallet balance',
      }));

    const dayBuckets = new Map<string, number>();
    const timeBuckets = new Map<string, number>([
      ['Night (0-6h)', 0],
      ['Morning (6-12h)', 0],
      ['Afternoon (12-18h)', 0],
      ['Evening (18-24h)', 0],
    ]);

    wallet.transactions.forEach((tx) => {
      const date = new Date(tx.date);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayBuckets.set(day, (dayBuckets.get(day) || 0) + 1);

      const hour = date.getUTCHours();
      if (hour < 6) timeBuckets.set('Night (0-6h)', (timeBuckets.get('Night (0-6h)') || 0) + 1);
      else if (hour < 12) timeBuckets.set('Morning (6-12h)', (timeBuckets.get('Morning (6-12h)') || 0) + 1);
      else if (hour < 18) timeBuckets.set('Afternoon (12-18h)', (timeBuckets.get('Afternoon (12-18h)') || 0) + 1);
      else timeBuckets.set('Evening (18-24h)', (timeBuckets.get('Evening (18-24h)') || 0) + 1);
    });

    const mostActiveDay = Array.from(dayBuckets.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const feeRate = wallet.averageFeeRate || 0;
    const guidance =
      feeRate === 0
        ? 'No recent send transactions to derive a fee rate. Use a current mempool estimate before broadcasting.'
        : feeRate < 5
          ? 'Fees look very low—confirm urgency or consider bumping to avoid delays if mempool fills up.'
          : feeRate > 50
            ? 'Fees are high. Consider waiting for lower mempool congestion or using batching/SegWit inputs.'
            : 'Fees are within a typical range. You can fine-tune based on confirmation speed needs.';

    const addressReuseCandidates = wallet.addresses
      .filter((address) => address.n_tx > 1)
      .sort((a, b) => b.n_tx - a.n_tx)
      .slice(0, 5)
      .map((address) => ({ address: address.address, count: address.n_tx, balanceSats: address.balance }));

    const reuseRate = wallet.addresses.length > 0
      ? (addressReuseCandidates.length / wallet.addresses.length) * 100
      : 0;

    const coinAgeDestroyed = wallet.transactions
      .filter((tx) => tx.type === 'Sent')
      .reduce((sum, tx) => {
        const ageDays = (Date.now() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24);
        return sum + Math.abs(tx.btc) * ageDays;
      }, 0);

    const coinjoinStatus = wallet.transactions.some((tx) =>
      tx.labels?.some((label) => label.label?.toLowerCase().includes('coinjoin') || label.type === 'coinjoin')
    )
      ? 'possible'
      : 'none detected';

    const lightningExposure = wallet.transactions.some((tx) =>
      tx.labels?.some((label) => label.label?.toLowerCase().includes('lightning') || label.type === 'lightning')
    )
      ? 'possible'
      : 'unknown';

    const ordinalRunesIndex = wallet.transactions.some((tx) =>
      tx.labels?.some((label) => label.label?.toLowerCase().includes('ordinal') || label.label?.toLowerCase().includes('rune'))
    )
      ? 'Potential ordinal/runes activity detected'
      : 'No ordinal or runes activity detected';

    const networkAllocation = [
      { network: 'Mainnet', percentage: 100 },
    ];

    const kycExposureProbability = Math.min(
      100,
      Math.round((counterpartyProfile.exchangeTouchpoints / Math.max(wallet.transactions.length || 1, 1)) * 120)
    );

    const riskSignals = computeRiskSignals(wallet, pnlAnalytics.currentValueFiat);
    const metaAnalytics = computeMetaAnalytics(wallet);

    const summary = `Wallet balance is ${wallet.balanceBTC.toFixed(8)} BTC (~${pnlAnalytics.symbol}${pnlAnalytics.currentValueFiat.toFixed(2)} ${pnlAnalytics.code}) with ${wallet.utxos.length} UTXOs and ${wallet.transactions.length} transactions analyzed. ROI est: ${pnlAnalytics.roiPercent ? pnlAnalytics.roiPercent.toFixed(2) : 'n/a'}%. Fee guidance is based on an average of ${feeRate.toFixed(2)} sat/vB.`;

    return {
      balanceBTC: wallet.balanceBTC,
      balanceFiat: wallet.balanceBTC * (wallet.btcPrice || 0),
      currency: pnlAnalytics.code,
      valuations: {
        totalFiatValue: pnlAnalytics.currentValueFiat,
        costBasisFiat: pnlAnalytics.costBasisFiat,
        roiPercent: pnlAnalytics.roiPercent,
        realizedPnlFiat: pnlAnalytics.realizedPnlFiat,
        unrealizedPnlFiat: pnlAnalytics.unrealizedPnlFiat,
        timeWeightedReturnPercent: pnlAnalytics.timeWeightedReturnPercent,
        volatilityResilienceScore: pnlAnalytics.volatilityResilienceScore,
        costBasisPerUtxo: pnlAnalytics.costBasisPerUtxo,
      },
      utxoSummary: {
        total: wallet.utxos.length,
        dustCount: wallet.dustUtxoCount,
        largestBTC: typeof largestUtxo === 'number' ? largestUtxo / 1e8 : null,
        averageBTC: typeof averageUtxo === 'number' ? averageUtxo / 1e8 : null,
        consolidationHint:
          wallet.dustUtxoCount > 0
            ? 'Consider consolidating small UTXOs during low-fee periods to reduce future fees and fingerprinting.'
            : 'UTXO set looks healthy with minimal dust exposure.',
      },
      spendingPatterns: {
        sentTxs: sentTxs.length,
        receivedTxs: receivedTxs.length,
        rolling30dInflow: wallet.inflowOutflow.inflowBTC,
        rolling30dOutflow: wallet.inflowOutflow.outflowBTC,
        largestSendBTC: typeof largestSend === 'number' ? Math.abs(largestSend) : null,
        largestReceiveBTC: largestReceive ?? null,
        monthlyActivity: spendingHabits.monthlyActivity,
        accumulationTrend: spendingHabits.accumulationTrend,
        dcaScore: spendingHabits.dcaScore,
        inflowOutflowHeatmap: spendingHabits.inflowOutflowHeatmap,
      },
      whaleWatch,
      activity: {
        mostActiveDay,
        timeBuckets: Array.from(timeBuckets.entries()).map(([bucket, count]) => ({ bucket, count })),
        hodlWaves,
        dormancyScore,
        coinAgeDestroyed,
      },
      feeInsight: {
        averageFeeRate: feeRate,
        guidance,
        totalFeesPaidBTC: feeEconomics.totalFeesPaidBTC,
        averageFeePaidBTC: feeEconomics.averageFeePaidBTC,
        feeOptimalityScore: feeEconomics.feeOptimalityScore,
        hotVsColdSeparation: feeEconomics.hotVsColdSeparation,
      },
      addressReuse: {
        reuseRate,
        mostReused: addressReuseCandidates,
        hygieneScore: Math.max(0, Math.min(100, 100 - wallet.dustUtxoCount * 5)),
        linkabilityRisk: Math.max(0, Math.min(100, reuseRate + (wallet.dustUtxoCount > 0 ? 10 : 0))),
        lightningExposure,
        coinjoinStatus,
        kycExposureProbability,
      },
      counterpartyProfile,
      riskSignals,
      metaAnalytics: {
        ...metaAnalytics,
        networkAllocation,
        ordinalRunesIndex,
      },
      summary,
    };
  }
);

export const bitcoinCAGRCalculatorTool = ai.defineTool(
  {
    name: 'calculateBitcoinCAGR',
    description: 'Calculates Bitcoin investment projections using historical CAGR data. Use when user asks about investment projections, "if I invested X Bitcoin", "what would X Bitcoin be worth in Y years", or similar CAGR calculation questions. If user doesn\'t specify amounts, use 0.1 BTC and 10 years as reasonable defaults.',
    inputSchema: z.object({
      initialAmount: z.number().describe('Initial investment amount in Bitcoin (BTC)'),
      timeHorizon: z.number().describe('Investment time horizon in years'),
      scenario: z.enum(['conservative', 'moderate', 'optimistic']).optional().describe('Growth scenario assumption'),
      currency: z.string().optional().describe('Preferred currency for calculations (e.g., USD, EUR, GBP). Defaults to USD if not specified.'),
    }),
    outputSchema: z.object({
      calculation: z.object({
        initialAmountBTC: z.number(),
        initialAmountFiat: z.number(),
        currency: z.string(),
        timeHorizon: z.number(),
        scenario: z.string(),
        annualCAGR: z.number(),
        finalAmountBTC: z.number(),
        finalAmountFiat: z.number(),
        totalReturn: z.number(),
        totalReturnPercentage: z.number(),
        yearlyProjections: z.array(z.object({
          year: z.number(),
          amountBTC: z.number(),
          amountFiat: z.number(),
          annualReturn: z.number(),
        })),
      }),
      analysis: z.object({
        keyAssumptions: z.array(z.string()),
        risks: z.array(z.string()),
        considerations: z.array(z.string()),
      }),
      disclaimer: z.string(),
      summary: z.string(),
    }),
  },
  async (input) => {
    // Historical Bitcoin CAGR data (approximate)
    const historicalCAGR = {
      conservative: 0.15, // 15% - Based on more recent, mature market performance
      moderate: 0.25,    // 25% - Based on historical average with some moderation
      optimistic: 0.35,   // 35% - Based on early Bitcoin growth rates
    };

    // Currency conversion rates (approximate - in production, use real-time rates)
    const currencyRates = {
      USD: 70000,
      EUR: 65000, // Approximate EUR/USD rate of 0.93
      GBP: 56000, // Approximate GBP/USD rate of 0.80
      CAD: 95000, // Approximate CAD/USD rate of 1.36
      AUD: 105000, // Approximate AUD/USD rate of 1.50
      JPY: 10500000, // Approximate JPY/USD rate of 150
    };

    const scenario = input.scenario || 'moderate';
    const annualCAGR = historicalCAGR[scenario];
    const inputCurrency = input.currency || 'USD';
    const currency = inputCurrency.toUpperCase();
    const currentBTCPrice = currencyRates[currency as keyof typeof currencyRates] || currencyRates.USD;
    const effectiveCurrency = currencyRates[currency as keyof typeof currencyRates] ? currency : 'USD';
    
    // Calculate compound growth
    const finalAmountBTC = input.initialAmount;
    const finalAmountFiat = finalAmountBTC * currentBTCPrice * Math.pow(1 + annualCAGR, input.timeHorizon);
    const initialAmountFiat = input.initialAmount * currentBTCPrice;
    const totalReturn = finalAmountFiat - initialAmountFiat;
    const totalReturnPercentage = (totalReturn / initialAmountFiat) * 100;

    // Generate yearly projections
    const yearlyProjections = [];
    for (let year = 1; year <= input.timeHorizon; year++) {
      const yearAmountFiat = initialAmountFiat * Math.pow(1 + annualCAGR, year);
      const previousYearAmountFiat = year === 1 ? initialAmountFiat : initialAmountFiat * Math.pow(1 + annualCAGR, year - 1);
      const yearAmountBTC = input.initialAmount; // BTC amount stays the same
      const annualReturn = yearAmountFiat - previousYearAmountFiat; // Return for this specific year
      
      yearlyProjections.push({
        year,
        amountBTC: yearAmountBTC,
        amountFiat: Math.round(yearAmountFiat),
        annualReturn: Math.round(annualReturn),
      });
    }

    const currencySymbol = effectiveCurrency === 'USD' ? '$' : effectiveCurrency === 'EUR' ? '€' : effectiveCurrency === 'GBP' ? '£' : effectiveCurrency === 'JPY' ? '¥' : effectiveCurrency === 'CAD' ? 'C$' : effectiveCurrency === 'AUD' ? 'A$' : effectiveCurrency;
    const keyAssumptions = [
      `Historical CAGR of ${(annualCAGR * 100).toFixed(1)}% per year`,
      'Bitcoin price appreciation continues at historical rates',
      'No major technological or regulatory disruptions',
      `Current Bitcoin price of ${currencySymbol}${currentBTCPrice.toLocaleString()} as baseline`,
      'Compound growth without additional contributions'
    ];

    const risks = [
      'Bitcoin is highly volatile and past performance doesn\'t guarantee future results',
      'Regulatory changes could significantly impact Bitcoin\'s value',
      'Technological risks including quantum computing threats',
      'Market adoption may slow or reverse',
      'Economic conditions could affect cryptocurrency markets'
    ];

    const considerations = [
      'Consider dollar-cost averaging instead of lump sum investment',
      'Bitcoin should be part of a diversified portfolio',
      'Only invest what you can afford to lose',
      'Long-term holding may reduce tax implications',
      'Consider Bitcoin\'s role as digital gold and store of value'
    ];

    const disclaimer = 'This calculation is for educational purposes only and is not financial advice. Bitcoin is a highly volatile asset and past performance does not guarantee future results. The CAGR assumptions are based on historical data and may not reflect future performance. Always do your own research and consider consulting with a financial advisor before making investment decisions.';

    const summary = `If you invested ${input.initialAmount} BTC (${currencySymbol}${Math.round(initialAmountFiat).toLocaleString()}) today and Bitcoin grows at a ${(annualCAGR * 100).toFixed(1)}% annual rate over ${input.timeHorizon} years, your investment could be worth approximately ${currencySymbol}${Math.round(finalAmountFiat).toLocaleString()} (${totalReturnPercentage.toFixed(1)}% total return). This represents a ${(annualCAGR * 100).toFixed(1)}% compound annual growth rate. However, this is purely hypothetical and Bitcoin's actual performance could be significantly different.`;

    return {
      calculation: {
        initialAmountBTC: input.initialAmount,
        initialAmountFiat: Math.round(initialAmountFiat),
        currency: effectiveCurrency,
        timeHorizon: input.timeHorizon,
        scenario: scenario.charAt(0).toUpperCase() + scenario.slice(1),
        annualCAGR: annualCAGR,
        finalAmountBTC: finalAmountBTC,
        finalAmountFiat: Math.round(finalAmountFiat),
        totalReturn: Math.round(totalReturn),
        totalReturnPercentage: totalReturnPercentage,
        yearlyProjections,
      },
      analysis: {
        keyAssumptions,
        risks,
        considerations,
      },
      disclaimer,
      summary,
    };
  }
);

export const bitcoinPensionAnalysisTool = ai.defineTool(
  {
    name: 'analyzeBitcoinPension',
    description: 'Analyzes Bitcoin as a pension savings vehicle. Use when user asks about "Bitcoin for retirement", "Bitcoin pension", "Bitcoin as retirement savings", or similar pension-related questions.',
    inputSchema: z.object({
      question: z.string(),
      age: z.number().optional().describe('User\'s current age'),
      retirementAge: z.number().optional().describe('Target retirement age'),
      monthlyContribution: z.number().optional().describe('Monthly contribution amount in user\'s preferred currency'),
      currency: z.string().optional().describe('Preferred currency for calculations (e.g., USD, EUR, GBP). Defaults to USD if not specified.'),
    }),
    outputSchema: z.object({
      pensionAnalysis: z.object({
        timeToRetirement: z.number(),
        totalContributions: z.number(),
        currency: z.string(),
        projectedValue: z.object({
          conservative: z.number(),
          moderate: z.number(),
          optimistic: z.number(),
        }),
        scenarios: z.array(z.object({
          scenario: z.string(),
          monthlyContribution: z.number(),
          totalContributions: z.number(),
          projectedValue: z.number(),
          percentageOfPortfolio: z.string(),
        })),
      }),
      considerations: z.object({
        advantages: z.array(z.string()),
        disadvantages: z.array(z.string()),
        recommendations: z.array(z.string()),
        diversificationAdvice: z.string(),
      }),
      disclaimer: z.string(),
      summary: z.string(),
    }),
  },
  async (input) => {
    const currentAge = input.age || 35;
    const retirementAge = input.retirementAge || 65;
    const monthlyContribution = input.monthlyContribution || 500;
    
    // Currency conversion rates (approximate - in production, use real-time rates)
    const currencyRates = {
      USD: 70000,
      EUR: 65000, // Approximate EUR/USD rate of 0.93
      GBP: 56000, // Approximate GBP/USD rate of 0.80
      CAD: 95000, // Approximate CAD/USD rate of 1.36
      AUD: 105000, // Approximate AUD/USD rate of 1.50
      JPY: 10500000, // Approximate JPY/USD rate of 150
    };

    const inputCurrency = input.currency || 'USD';
    const currency = inputCurrency.toUpperCase();
    const effectiveCurrency = currencyRates[currency as keyof typeof currencyRates] ? currency : 'USD';
    const timeToRetirement = retirementAge - currentAge;
    const totalContributions = monthlyContribution * 12 * timeToRetirement;

    // CAGR scenarios for pension analysis
    const cagrScenarios = {
      conservative: 0.12, // 12% - More conservative for retirement planning
      moderate: 0.18,     // 18% - Moderate growth assumption
      optimistic: 0.25,   // 25% - Optimistic but historically possible
    };

    // Calculate future value with monthly contributions
    const calculateFV = (cagr: number) => {
      const monthlyRate = cagr / 12;
      const months = timeToRetirement * 12;
      
      // Future value of annuity formula: FV = PMT * [((1 + r)^n - 1) / r]
      const fv = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      return Math.round(fv);
    };

    const projectedValue = {
      conservative: calculateFV(cagrScenarios.conservative),
      moderate: calculateFV(cagrScenarios.moderate),
      optimistic: calculateFV(cagrScenarios.optimistic),
    };

    // Different contribution scenarios
    const scenarios = [
      {
        scenario: 'Conservative Saver',
        monthlyContribution: monthlyContribution * 0.5,
        totalContributions: Math.round(monthlyContribution * 0.5 * 12 * timeToRetirement),
        projectedValue: Math.round(calculateFV(cagrScenarios.conservative) * 0.5),
        percentageOfPortfolio: '5-10%',
      },
      {
        scenario: 'Moderate Saver',
        monthlyContribution: monthlyContribution,
        totalContributions: Math.round(totalContributions),
        projectedValue: projectedValue.moderate,
        percentageOfPortfolio: '10-20%',
      },
      {
        scenario: 'Aggressive Saver',
        monthlyContribution: monthlyContribution * 2,
        totalContributions: Math.round(monthlyContribution * 2 * 12 * timeToRetirement),
        projectedValue: Math.round(calculateFV(cagrScenarios.moderate) * 2),
        percentageOfPortfolio: '20-30%',
      },
    ];

    const advantages = [
      'Potential for high returns over long time horizons',
      'Hedge against inflation and currency debasement',
      'Decentralized and censorship-resistant asset',
      'Growing institutional adoption and acceptance',
      'Limited supply creates scarcity value',
      'Can serve as digital gold in retirement portfolio'
    ];

    const disadvantages = [
      'Extreme volatility can cause significant losses',
      'Regulatory uncertainty and potential restrictions',
      'Technological risks and potential obsolescence',
      'No guaranteed returns or principal protection',
      'Limited acceptance as payment method currently',
      'High correlation with crypto market cycles'
    ];

    const recommendations = [
      'Start with small allocations (5-10% of retirement savings)',
      'Use dollar-cost averaging to reduce timing risk',
      'Focus on long-term holding (10+ years)',
      'Consider Bitcoin as part of alternative investments',
      'Maintain diversified traditional retirement accounts',
      'Regularly review and rebalance your portfolio',
      'Consider tax-advantaged accounts when possible',
      'Have a clear exit strategy for retirement needs'
    ];

    const diversificationAdvice = 'Bitcoin should complement, not replace, traditional retirement savings. Consider maintaining 70-80% in traditional assets (stocks, bonds, real estate) and 10-20% in alternative investments including Bitcoin. This provides exposure to potential Bitcoin gains while maintaining stability for retirement needs.';

    const disclaimer = 'This analysis is for educational purposes only and is not financial advice. Bitcoin is a highly volatile asset and past performance does not guarantee future results. Retirement planning should be done with a qualified financial advisor who understands your complete financial situation, risk tolerance, and retirement goals. Never invest more than you can afford to lose.';

    const currencySymbol = effectiveCurrency === 'USD' ? '$' : effectiveCurrency === 'EUR' ? '€' : effectiveCurrency === 'GBP' ? '£' : effectiveCurrency === 'JPY' ? '¥' : effectiveCurrency === 'CAD' ? 'C$' : effectiveCurrency === 'AUD' ? 'A$' : effectiveCurrency;
    const summary = `If you're ${currentAge} years old and contribute ${currencySymbol}${monthlyContribution.toLocaleString()} monthly to Bitcoin until age ${retirementAge}, you would contribute ${currencySymbol}${totalContributions.toLocaleString()} total over ${timeToRetirement} years. Based on moderate growth assumptions (18% CAGR), this could potentially grow to approximately ${currencySymbol}${projectedValue.moderate.toLocaleString()}. However, Bitcoin's extreme volatility makes this highly uncertain, and it should only represent a small portion of your retirement portfolio alongside traditional investments.`;

    return {
      pensionAnalysis: {
        timeToRetirement,
        totalContributions: Math.round(totalContributions),
        currency: effectiveCurrency,
        projectedValue,
        scenarios,
      },
      considerations: {
        advantages,
        disadvantages,
        recommendations,
        diversificationAdvice,
      },
      disclaimer,
      summary,
    };
  }
);


// Helper function to generate contextual follow-up suggestions
function generateFollowUpSuggestions(questionType: string, userQuestion: string, responseContent: string): Array<{question: string, context: string}> {
  const suggestions: Array<{question: string, context: string}> = [];

  switch (questionType.toLowerCase()) {
    case 'cagr calculator':
    case 'investment projections':
      suggestions.push(
        {
          question: "Would you like to see projections for a different time horizon?",
          context: "You can explore how Bitcoin might perform over 20, 30, or even 50 years to see the long-term potential."
        },
        {
          question: "Would you like to see a conservative or optimistic scenario?",
          context: "Different growth assumptions can help you understand the range of possible outcomes."
        },
        {
          question: "Would you like to calculate monthly Bitcoin contributions instead?",
          context: "Regular contributions can help reduce timing risk and build wealth over time."
        }
      );
      break;

    case 'pension analysis':
    case 'retirement':
      suggestions.push(
        {
          question: "Would you like to see different contribution amounts?",
          context: "Exploring various monthly contribution levels can help you find the right balance for your budget."
        },
        {
          question: "Would you like to analyze Bitcoin as part of a diversified retirement portfolio?",
          context: "Understanding how Bitcoin fits with traditional retirement investments can help optimize your strategy."
        },
        {
          question: "Would you like to see the impact of different retirement ages?",
          context: "Earlier or later retirement can significantly affect your Bitcoin accumulation strategy."
        }
      );
      break;

    case 'news analysis':
    case 'bitcoin news':
      suggestions.push(
        {
          question: "Would you like to know how this news might affect Bitcoin's price?",
          context: "Understanding market implications can help you make more informed investment decisions."
        },
        {
          question: "Would you like to see more Bitcoin news from different sources?",
          context: "Getting multiple perspectives on Bitcoin developments can provide a more complete picture."
        },
        {
          question: "Would you like investment insights based on this news?",
          context: "Connecting news events to investment strategies can help you navigate market changes."
        }
      );
      break;

    case 'market analysis':
    case 'market sentiment':
      suggestions.push(
        {
          question: "Would you like investment timing advice based on current market conditions?",
          context: "Understanding when to buy or hold can help optimize your Bitcoin investment strategy."
        },
        {
          question: "Would you like to see how this market sentiment compares to historical patterns?",
          context: "Historical context can help you understand if current conditions are typical or unusual."
        },
        {
          question: "Would you like portfolio allocation recommendations?",
          context: "Market conditions can inform how much of your portfolio should be allocated to Bitcoin."
        }
      );
      break;

    case 'security analysis':
    case 'security recommendations':
      suggestions.push(
        {
          question: "Would you like specific steps to improve your wallet security?",
          context: "Getting actionable security improvements can help protect your Bitcoin holdings."
        },
        {
          question: "Would you like to analyze your transaction privacy?",
          context: "Understanding your privacy risks can help you make more private transactions in the future."
        },
        {
          question: "Would you like to see advanced security features for your wallet?",
          context: "Exploring advanced security options can provide additional protection for your Bitcoin."
        }
      );
      break;

    case 'general bitcoin':
    case 'bitcoin education':
      suggestions.push(
        {
          question: "Would you like to learn about Bitcoin's technical aspects?",
          context: "Understanding how Bitcoin works technically can help you make better investment decisions."
        },
        {
          question: "Would you like to know about Bitcoin's role in a portfolio?",
          context: "Understanding Bitcoin's unique properties can help you decide how much to allocate."
        },
        {
          question: "Would you like to explore Bitcoin's history and adoption?",
          context: "Learning about Bitcoin's journey can help you understand its potential future."
        }
      );
      break;

    default:
      // Generic follow-ups for any question type
      suggestions.push(
        {
          question: "Would you like to explore this topic in more detail?",
          context: "I can provide more specific information or analysis on any aspect of this topic."
        },
        {
          question: "Would you like to see how this relates to Bitcoin investment?",
          context: "Understanding the investment implications can help you make informed decisions."
        },
        {
          question: "Would you like to learn about related Bitcoin concepts?",
          context: "Exploring related topics can give you a more complete understanding of Bitcoin."
        }
      );
  }

  // Return 1-3 suggestions, prioritizing the most relevant ones
  return suggestions.slice(0, Math.min(3, suggestions.length));
}

export async function walletInsightsChat(input: WalletInsightsChatInput): Promise<WalletInsightsChatOutput> {
  return walletInsightsChatFlow(input);
}

const MAX_GENERATION_ATTEMPTS = 2;
const STRUCTURED_OUTPUT_REMINDER =
  'REMINDER: Your final response MUST be a valid JSON object containing an "answer" string in Markdown, an optional "chart" object (or null), and 1-3 "followUpSuggestions". Never respond with just null.';

const extractErrorMessage = (error: unknown): string => {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message || (error.cause instanceof Error ? error.cause.message || '' : '');
  }
  if (typeof error === 'object') {
    const maybeMessage =
      (error as any)?.message ||
      ((error as any)?.cause instanceof Error ? (error as any).cause.message : (error as any)?.cause?.message);
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
};

const isSchemaValidationError = (error: unknown): boolean => {
  const message = extractErrorMessage(error);
  if (!message) {
    return false;
  }
  return message.includes('Schema validation failed') || message.includes('INVALID_ARGUMENT');
};

const isFormattingError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes('json5') ||
    message.includes('unexpected token') ||
    message.includes("expected ',' or '}'") ||
    message.includes("expected ',' or ']'") ||
    message.includes('expected , or ]') ||
    message.includes('expected , or }') ||
    message.includes('unterminated string') ||
    message.includes('invalid character') ||
    message.includes('invalid json') ||
    message.includes('could not parse') ||
    message.includes('parse error')
  );
};

const systemPrompt = `You are BitSleuth, a helpful AI assistant and expert Bitcoin analyst. Your role is to answer questions about Bitcoin, blockchain technology, market conditions, wallet analysis, and security.

**IMPORTANT CURRENCY GUIDELINES:**
- Always respect the user's preferred currency (provided in preferredCurrency field) unless they explicitly specify a different currency in their question
- If user asks "show me in dollars" or "convert to EUR" or mentions a specific currency, use that instead of their default
- When displaying monetary amounts, always include the appropriate currency symbol ($, £, €, ¥, etc.)
- For calculations and projections, use the user's preferred currency as the base unless they specify otherwise
- When calling CAGR or pension analysis tools, pass the user's preferred currency unless they explicitly request a different one
- Common currency indicators: "dollars" or "$" = USD, "euros" or "€" = EUR, "pounds" or "£" = GBP, "yen" or "¥" = JPY

**IMPORTANT:** Analyze the user's question type first and respond appropriately:

### Question Types & Responses:

1. **News Questions** (latest Bitcoin news, headlines, what's happening):
   - Fetch and analyze the latest Bitcoin news
   - Provide sentiment analysis and key themes
   - Discuss market implications of news
   - Use Bitcoin news analysis tool

2. **Investment Questions** (is this a good time to buy, investment advice):
   - Provide investment insights and analysis
   - Discuss risk assessment and recommendations
   - Include appropriate disclaimers
   - Use investment insights tool

2a. **CAGR Calculator Questions** (investment projections, "if I invested X Bitcoin"):
   - Calculate Bitcoin investment projections using historical CAGR
   - Provide yearly projections and compound growth analysis
   - Include multiple scenarios (conservative, moderate, optimistic)
   - **CRITICAL**: Extract parameters from user question or use reasonable defaults:
     * If no amount specified, use 0.1 BTC as example
     * If no time horizon specified, use 10 years as example
     * If no scenario specified, use 'moderate' as default
   - Use Bitcoin CAGR calculator tool

2b. **Pension/Retirement Questions** (Bitcoin for retirement, pension savings):
   - Analyze Bitcoin as a retirement savings vehicle
   - Calculate future value with monthly contributions
   - Provide diversification advice and risk assessment
   - Use Bitcoin pension analysis tool

3. **Market Questions** (Bitcoin price, market sentiment, bull/bear market, Fear & Greed Index):
   - Provide market analysis based on current data
   - Explain market conditions and sentiment
   - Discuss trends and outlook
   - Use market analysis tool

4. **Wallet-Specific Questions** (balance, transactions, performance, XPUB health):
   - Analyze the provided wallet data
   - Use wallet intelligence to answer balance checks, UTXO health, address reuse, and spending patterns
   - Provide insights about their holdings and activity

**Wallet Analytics Coverage for Wallet Questions:**
- Always surface total fiat value (USD/EUR/GBP), wallet ROI vs cost basis, realized and unrealized P&L, and cost basis estimates per UTXO when possible
- Include time-weighted return and a volatility resilience/drawdown note so users understand durability of their holdings
- Mention behavioral/temporal signals such as HODL waves, dormancy/inactivity, spending habits, accumulation vs distribution trend, inflow/outflow heatmaps, and coin-age destroyed
- Note sentiment/strategy signals (wallet persona, DCA regularity, top-up patterns) and relate them to market moves when relevant
- Call out privacy and OPSEC analytics including address reuse score, UTXO hygiene, linkability risk, KYC exposure probability, Lightning/CoinJoin clues, and reuse-driven linkage concerns
- Summarize transaction economics (total fees paid, average fee, fee optimality, hot vs cold UTXO separation)
- Highlight counterparty clustering/known recipient categories, risk anomalies (destination risk, miner proximity, dust attack flags), and meta analytics like label coverage/diversification, network allocation, and ordinal/runes exposure

**Integrated Wallet + Market/News Responses:**
- If a user ties their wallet balance or ROI to market conditions or specific Bitcoin news (e.g., "how did the bear market and ETF delay headlines affect my holdings?"), combine wallet intelligence with market analysis and the Bitcoin news tool in one answer.
- Always explain the causal link: summarize wallet value/ROI changes, relate them to current market phase or sentiment, and note whether recent headlines could be contributing factors.
- Return a visualization when they ask about impact or timing—prefer a line or area chart comparing wallet performance vs market moves, or a bar chart showing ROI before/after a news window. Keep chart data in the \`chart\` field.

5. **Technical Decode Questions** (raw transactions, PSBTs, decoding requests):
   - Decode the provided data using Bitcoin decoding tooling
   - Explain inputs/outputs, signing status, and any missing information
   - Offer safe handling tips (e.g., avoid broadcasting unsigned PSBTs)

5. **Security Questions** (privacy, security analysis, recommendations):
   - Use security analysis tools when appropriate
   - Provide security recommendations
   - Focus on privacy and security aspects

6. **General Bitcoin Questions** (technology, concepts, education):
   - Provide educational information about Bitcoin
   - Explain concepts clearly and accurately
   - Use current knowledge and best practices

7. **Technical Questions** (blockchain, transactions, addresses):
   - Provide technical explanations
   - Use wallet data when relevant
   - Explain technical concepts clearly

**CRITICAL RULE:** Your \`answer\` field MUST ONLY contain human-readable Markdown text. NEVER include JSON code blocks, chart data, or placeholders like "[Chart would be displayed here]" within the 'answer' field. All chart data MUST go into the separate 'chart' field of the JSON output.

### Follow-Up Suggestions Guidelines

After providing your main response, include 1-3 helpful follow-up suggestions in the \`followUpSuggestions\` field. These should be natural next steps that users might want to explore based on your response.

**Follow-Up Categories:**

1. **CAGR Calculator Follow-ups:**
   - Suggest different time horizons (e.g., "Would you like to see projections for 30 years?")
   - Suggest different scenarios (e.g., "Would you like to see a conservative scenario?")
   - Suggest related calculations (e.g., "Would you like to calculate monthly contributions instead?")

2. **Pension Analysis Follow-ups:**
   - Suggest different contribution amounts
   - Suggest different retirement ages
   - Suggest portfolio diversification analysis

3. **News Analysis Follow-ups:**
   - Suggest market impact analysis
   - Suggest investment implications
   - Suggest related news topics

4. **Market Analysis Follow-ups:**
   - Suggest investment timing questions
   - Suggest risk assessment
   - Suggest portfolio allocation advice

5. **Security Analysis Follow-ups:**
   - Suggest specific security improvements
   - Suggest privacy enhancement strategies
   - Suggest wallet optimization tips

6. **General Bitcoin Follow-ups:**
   - Suggest related educational topics
   - Suggest practical applications
   - Suggest advanced concepts

**Follow-Up Format:**
- Make suggestions conversational and helpful
- Provide brief context for why the follow-up is relevant
- Keep suggestions specific and actionable
- Avoid overwhelming users with too many options

**Example Follow-Up Suggestions:**

For CAGR Calculator: "Would you like to see projections for 30 years?" with context "Longer time horizons can show even more dramatic compound growth effects."

For Pension Analysis: "Would you like to see different contribution amounts?" with context "Exploring various monthly contribution levels can help you find the right balance for your budget."

For News Analysis: "Would you like to know how this news might affect Bitcoin's price?" with context "Understanding market implications can help you make more informed investment decisions."

For Market Analysis: "Would you like investment timing advice based on current market conditions?" with context "Understanding when to buy or hold can help optimize your Bitcoin investment strategy."

For Security Analysis: "Would you like specific steps to improve your wallet security?" with context "Getting actionable security improvements can help protect your Bitcoin holdings."

### Enhanced Bitcoin Analysis Tools

You have access to advanced Bitcoin analysis tools powered by GPT-4o Mini:

1. **Enhanced Transaction Analysis** (\`analyzeBitcoinTransaction\`):
   - Provides detailed privacy scoring (0-100)
   - Analyzes fee efficiency (excellent/good/fair/poor)
   - Identifies risk factors and provides recommendations
   - Detects transaction types (send/receive/exchange/self-transfer)
   - Identifies associated entities (exchanges, services)

2. **Enhanced Address Analysis** (\`analyzeBitcoinAddress\`):
   - Classifies address types (p2pkh, p2sh, p2wpkh, p2wsh, p2tr)
   - Assesses privacy risk levels (low/medium/high/critical)
   - Analyzes address reuse patterns
   - Provides clustering scores
   - Identifies associated entities

3. **Wallet Intelligence Analysis** (\`analyzeWalletIntelligence\`):
   - Performs balance checks and UTXO health reviews
   - Surfaces spending patterns, activity windows, and address reuse
   - Highlights fee guidance, mempool-readiness, and whale-sized movements

4. **Bitcoin Decode Tool** (\`decodeBitcoinData\`):
   - Decodes raw transaction hex or PSBTs
   - Summarizes inputs/outputs, signing status, and RBF flags
   - Provides safety notes before broadcasting

### When to Use Analysis Tools:

**Enhanced Transaction Analysis Tool** - Use ONLY when users specifically ask for:
- "Detailed transaction analysis"
- "Privacy analysis of this transaction"
- "Transaction insights"
- "Analyze this specific transaction"

**Enhanced Address Analysis Tool** - Use ONLY when users specifically ask for:
- "Address analysis"
- "Privacy assessment of this address"
- "Address insights"
- "Analyze this specific address"

**Wallet Intelligence Tool** - Use for wallet/XPUB questions including:
- "Check my balance"
- "Analyze my UTXOs"
- "Find address reuse or spending patterns"
- "Spot large or whale transactions"
- "Give me fee or mempool guidance for my wallet"

**Bitcoin Decode Tool** - Use when users ask for:
- "Decode this PSBT"
- "Read this raw transaction"
- "Tell me what this unsigned transaction does"

**Security Recommendations Tool** - Use ONLY when users specifically ask for:
- "Security report"
- "Security analysis"
- "Security recommendations"
- "Privacy recommendations"

**Bitcoin News Analysis Tool** - Use when users ask about:
- "Latest Bitcoin news"
- "Bitcoin headlines"
- "What's happening with Bitcoin"
- "Bitcoin news today"
- "Recent Bitcoin developments"

**Investment Insights Tool** - Use when users ask about:
- "Is this a good time to buy Bitcoin"
- "Should I invest in Bitcoin"
- "Investment advice"
- "Buying Bitcoin now"
- "Bitcoin investment strategy"

**Bitcoin CAGR Calculator Tool** - Use when users ask about:
- "If I invested X Bitcoin"
- "What would X Bitcoin be worth in Y years"
- "Bitcoin investment projections"
- "Compound growth calculation"
- "Bitcoin CAGR analysis"
- "How much would Bitcoin be worth in X years"
- "Bitcoin growth projections"
- "Investment calculator"

**IMPORTANT**: Even if users don't specify exact amounts, still use the CAGR calculator with reasonable defaults (0.1 BTC, 10 years) to provide helpful examples and projections.

**Bitcoin Pension Analysis Tool** - Use when users ask about:
- "Bitcoin for retirement"
- "Bitcoin pension savings"
- "Bitcoin as retirement investment"
- "Bitcoin retirement planning"
- "Monthly Bitcoin contributions for retirement"

**Market Analysis Tool** - Use when users ask about:
- "Market sentiment"
- "Bull/bear market"
- "Fear & Greed Index"
- "Market conditions"
- "Bitcoin market outlook"

**IMPORTANT:** Use the appropriate tool for the question type. Do NOT use security tools for news, investment, or market questions.

### Market Analysis Guidelines

When users ask about market conditions, sentiment, or Bitcoin price:

1. **Market Sentiment Questions** (bull/bear market, Fear & Greed Index):
   - Provide current market analysis
   - Explain what bull/bear markets mean
   - Discuss Fear & Greed Index interpretation
   - Use general Bitcoin knowledge, not wallet-specific data

2. **Price Questions** (Bitcoin price, trends, predictions):
   - Provide current price context
   - Explain market trends and factors
   - Discuss historical context when relevant
   - Avoid making specific price predictions

3. **Market Education** (how markets work, trading concepts):
   - Explain market concepts clearly
   - Provide educational information
   - Use examples and analogies
   - Focus on Bitcoin-specific market dynamics

**DO NOT** default to security analysis for market questions. Answer the market question directly.

### Comprehensive Security Review Instructions

When a user asks for a "security report," "full recommendations," "security analysis," or similar phrases, you MUST perform a comprehensive security review.

#### Formatting Rules:
1.  **Bold Headings:** All section and subsection titles MUST be bold, using Markdown headings (e.g., \`## Main Section\`, \`### Subsection\`).
2.  **Section Spacing:** You MUST place a Markdown horizontal rule (\`--- \`) between each major section of the report to create clear visual separation.

Your review process:

1.  **Use the \`getSecurityRecommendations\` Tool:** First, you MUST call the \`getSecurityRecommendations\` tool. The tool expects an input object with a \`walletData\` key containing the full JSON string from the prompt.

2.  **Format the Tool's Output into Markdown:** Take the array of recommendation objects returned by the tool and format them into a clear, user-friendly Markdown list. For each recommendation, use its 'title' and 'description' to create a section in your report.
    *   **EXAMPLE of correct formatting:**
        \`\`\`markdown
        ### Privacy Threat Level
        Your privacy threat level is High. This is determined by the percentage of reused addresses...

        ---

        ### Tip: Avoid Reusing Addresses
        To maximize your privacy, you should use a new Bitcoin address...
        \`\`\`
    *   **DO NOT** include the raw JSON from the tool in your answer.

3.  **Deeper Analysis:** After presenting the baseline recommendations, go deeper by analyzing the full \`walletData\` for additional insights. Create new sections in your report for these topics using clear Markdown headings (e.g., \`## UTXO Health\`). Separate each of these analysis sections with a horizontal rule (\`--- \`).
    *   **UTXO Health:** Analyze the distribution of Unspent Transaction Outputs (UTXOs). If there's a significant number of "dust" UTXOs (very small value), explain the privacy and potential fee implications in your text answer.
    *   **Address Reuse:** Deep-dive into the \`addresses\` array. Identify the most reused addresses (highest \`n_tx\`). Explain why address reuse is a major privacy leak in your text answer.
    *   **Transaction Fee Patterns:** Briefly analyze transaction fees. You could mention if fees are consistently high or low, suggesting potential for optimization.

4.  **Generate a SINGLE Relevant Chart:** Based on your analysis, decide on the **single most important issue** to visualize. Generate ONLY ONE chart.
    *   If **address reuse** is the most critical issue, generate a **bar chart** of the top reused addresses.
    *   If **UTXO health** (like a high dust count) is the most critical issue, generate a **treemap chart** of the UTXO distribution.
    *   Place the data for this single, chosen chart in the \`chart\` field of your JSON output.
    *   In your text \`answer\`, explain your findings clearly, but DO NOT mention that you are creating a chart or include any chart JSON.

5.  **Final Output Structure:** Your final response must have two parts:
    *   The \`answer\` field: A single, coherent Markdown string containing your full, formatted report. It must not contain any JSON.
    *   The \`chart\` field: If you created a visualization, this field should contain the corresponding JSON data object for your single chosen chart. Otherwise, it must be \`null\`.

### General Charting Instructions

- Pie Chart: Use for parts of a whole. Data: \`[{ name: 'address1', value: 0.5 }]\`. Config: \`pie: { dataKey: 'value', nameKey: 'name' }\`.
- Bar/Line/Area Chart: Use for trends or categories. Data: \`[{ name: 'Jan', value: 100 }]\`. Config: \`{bar/line/area}: { dataKey: 'value' }\`, \`xAxis: { dataKey: 'name' }\`. Use Area charts for cumulative values like balance over time.
- Scatter Plot: Use to show the relationship between two numerical variables (e.g., fee vs. size). Data MUST have \`x\` and \`y\` keys: \`[{ name: 'txid1', x: 250, y: 5000 }]\`. Config needs \`scatter: { xAxisLabel: 'Size (bytes)', yAxisLabel: 'Fee (sats)' }\`. The \`x\` and \`y\` data keys are fixed.
- Treemap: A great way to visualize UTXO distribution. Each rectangle represents a UTXO, and its size corresponds to the UTXO's value. Data MUST have a size key: \`[{ name: 'txid1_vout0', size: 50000 }]\`. Config: \`treemap: { dataKey: 'size', nameKey: 'name' }\`.
- Radial Bar Chart: Use for displaying a small set of individual scores or progress indicators, like security metrics. Data: \`[{ name: 'Reuse Score', value: 75 }]\`. Config: \`radial: { dataKey: 'value', nameKey: 'name' }\`.
- Radar Chart: Use to compare multiple metrics on a single figure. Good for showing wallet health scores. Data: \`[{ subject: 'Security', value: 85, fullMark: 100 }, { subject: 'Privacy', value: 60, fullMark: 100 }]\`. Config: \`radar: { angleKey: 'subject', dataKey: 'value' }\`.
`;

const walletInsightsChatFlow = ai.defineFlow(
  {
    name: 'walletInsightsChatFlow',
    inputSchema: WalletInsightsChatInputSchema,
    outputSchema: WalletInsightsChatOutputSchema,
  },
  async (input) => {
    try {
      const history = buildModelHistory(input.history);
      const walletData = compactWalletDataForPrompt(input.walletData);

      const userPrompt = `
Analyze my request based on our conversation history and respond appropriately to the question type.

**My Wallet Data:**
\`\`\`json
${walletData}
\`\`\`

**My Preferred Currency:**
${input.preferredCurrency || 'USD'}

**My Question:**
${input.question}

**Instructions:**
1. First, identify what type of question this is (news, investment, CAGR calculator, pension analysis, market, wallet-specific, security, general Bitcoin, or technical)
2. Check if the user explicitly mentioned a currency in their question - if so, use that currency instead of their preferred currency
3. Respond appropriately to that question type
4. Use the appropriate tool for each question type:
   - News questions → Bitcoin News Analysis Tool
   - Investment questions → Investment Insights Tool
   - CAGR calculator questions → Bitcoin CAGR Calculator Tool
   - Pension/retirement questions → Bitcoin Pension Analysis Tool
   - Market questions → Market Analysis Tool
   - Security questions → Security Recommendations Tool
   - Wallet/XPUB analytics → Wallet Intelligence Tool
   - Transaction/Address analysis → Enhanced Analysis Tools
   - Raw transaction or PSBT decode → Bitcoin Decode Tool
5. For news questions, fetch and analyze the latest Bitcoin news
6. For investment questions, provide investment insights with appropriate disclaimers
7. For CAGR calculator questions, extract investment amount and time horizon from the question, or use reasonable defaults (0.1 BTC, 10 years) if not specified, then calculate projections. Pass the appropriate currency (user's preferred unless they specified otherwise)
8. For pension questions, analyze Bitcoin as retirement savings with diversification advice. Pass the appropriate currency (user's preferred unless they specified otherwise)
9. For market questions, provide market analysis without defaulting to security reports
10. For technical decode requests, use the Bitcoin decoding tool to summarize PSBTs or raw transactions
11. For wallet-specific questions, use the wallet intelligence tool for balances, UTXO health, fee guidance, mempool readiness, whale alerts, and activity patterns. If the question also references market moves or specific news items, combine wallet intelligence with the market analysis and Bitcoin news tools so the answer connects their holdings to broader conditions.
12. For general Bitcoin questions, provide educational information
13. **ALWAYS include 1-3 helpful follow-up suggestions** in the \`followUpSuggestions\` field that would be natural next steps for the user based on your response
      `;


      let generatedOutput: WalletInsightsChatOutput | null = null;
      let lastGenerationError: unknown = null;
      const runSimpleFallback = async (): Promise<WalletInsightsChatOutput | null> => {
        try {
          const { output } = await ai.generate({
            system:
              'You are BitSleuth. Provide a concise Markdown answer using the wallet data if helpful. Avoid charts and keep responses brief.',
            prompt: `Wallet JSON (trimmed):
\`\`\`json
${walletData}
\`\`\`

Question: ${input.question}
Preferred currency: ${input.preferredCurrency || 'USD'}

Return only a JSON object with an "answer" string and optional "followUpSuggestions" array.`,
            messages: history,
            output: {
              schema: SimplifiedChatOutputSchema,
            },
            tools: [],
          });

          if (output) {
            return {
              answer: output.answer,
              chart: null,
              followUpSuggestions: output.followUpSuggestions || [],
            };
          }
        } catch (fallbackError) {
          console.warn('walletInsightsChatFlow: Simplified fallback generation failed.', extractErrorMessage(fallbackError));
        }

        return null;
      };

      for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
        const promptWithReminder =
          attempt === 1 ? userPrompt : `${userPrompt}\n\n${STRUCTURED_OUTPUT_REMINDER}`;

        try {
          const { output } = await ai.generate({
            system: systemPrompt,
            prompt: promptWithReminder,
            messages: history,
            output: {
              schema: WalletInsightsChatOutputSchema,
            },
            tools: [
              securityRecommendationsTool,
              enhancedTransactionAnalysisTool,
              enhancedAddressAnalysisTool,
              marketAnalysisTool,
              bitcoinNewsAnalysisTool,
              investmentInsightsTool,
              bitcoinCAGRCalculatorTool,
              bitcoinPensionAnalysisTool,
              walletIntelligenceTool,
              bitcoinDecodeTool,
            ],
          });

          if (output) {
            generatedOutput = output;
            break;
          }

          lastGenerationError = new Error('The AI returned an empty response.');
          if (attempt < MAX_GENERATION_ATTEMPTS) {
            console.warn('walletInsightsChatFlow: Empty output from AI. Retrying...');
          }
        } catch (error) {
          lastGenerationError = error;
          const schemaOrFormattingError = isSchemaValidationError(error) || isFormattingError(error);

          if (schemaOrFormattingError) {
            const messageSuffix =
              attempt < MAX_GENERATION_ATTEMPTS
                ? 'Retrying with reminder.'
                : 'Final attempt failed; falling back to simplified generation.';

            console.warn(
              `walletInsightsChatFlow: Structured output validation failed. ${messageSuffix}`,
              extractErrorMessage(error)
            );

            if (attempt < MAX_GENERATION_ATTEMPTS) {
              continue;
            }

            break;
          }

          throw error;
        }
      }

      if (generatedOutput) {
        return generatedOutput;
      }

      const simplified = await runSimpleFallback();
      if (simplified) {
        return simplified;
      }

      console.warn('walletInsightsChatFlow: Unable to generate structured output after retries.', lastGenerationError);
      return {
        answer:
          "I ran into trouble formatting my answer just now, but nothing is wrong with your question. Please try asking again in a moment.",
        chart: null,
        followUpSuggestions: [],
      };
    } catch (e: any) {
      console.error("Error in walletInsightsChatFlow:", e);
      const errorMessage = extractErrorMessage(e) || 'Unknown error';
      const isApiKeyError = errorMessage.includes('API key') || errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('OPENAI_CHATGPT_API_KEY') || errorMessage.includes('401') || errorMessage.includes('403');
      const schemaError = isSchemaValidationError(e);
      const formattingError = isFormattingError(e);

      const formattingFollowUps = schemaError || formattingError
        ? [
            {
              question: 'Can you try that analysis again without the extra formatting?',
              context: 'A simpler text-only reply can avoid formatting issues.',
            },
            {
              question: 'Give me a brief wallet health summary.',
              context: 'A concise recap may bypass the formatting problem you encountered.',
            },
          ]
        : [];

      return {
          answer: isApiKeyError
            ? "⚠️ **AI Service Configuration Issue**\n\nThe AI chat feature requires a valid OpenAI API key to be configured. Please contact the administrator to set up the OPENAI_API_KEY environment variable (or OPENAI_CHATGPT_API_KEY for backward compatibility).\n\nYou can still use other features of BitSleuth, such as transaction viewing, analysis charts, and security recommendations."
            : schemaError || formattingError
              ? "I had trouble formatting that last response, but nothing is wrong with your question. Please try again and I'll keep the answer concise."
              : `I'm sorry, I encountered an error while processing your request: ${errorMessage}\n\nPlease try again or rephrase your question.`,
          chart: null,
          followUpSuggestions: formattingFollowUps,
      };
    }
  }
);
