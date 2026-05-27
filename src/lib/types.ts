
export type UTXO = {
  txid: string;
  vout: number;
  address: string;
  value: number; // in satoshis
};

export type TransactionInput = {
  address: string | null; // Coinbase transactions have no address
  value: number;
};

export type TransactionOutput = {
  address: string;
  value: number;
  spent: boolean;
};

export type TransactionLabel = {
  address: string;
  label: string;
  type: 'entity' | 'exchange';
};

export type Transaction = {
  id: string;
  date: string;
  btc: number;
  status: 'Confirmed' | 'Pending' | 'Failed';
  type: 'Sent' | 'Received';
  fromAddress: (string | null)[];
  toAddress: string[];
  confirmations: number;
  // New fields
  fee: number;
  size: number;
  weight: number;
  version: number;
  locktime: number;
  rbf: boolean;
  blockHeight: number | null;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  totalValue: number; // Sum of all output values in BTC
  historicalPrice?: number; // Optional field for cost basis calculation
  labels?: TransactionLabel[]; // Added for exchange/entity labels
};

export type AddressInfo = {
  address: string;
  n_tx: number;
  balance: number;
};

export type BtcPriceInfo = {
  last: number;
  symbol: string;
};

export type Wallet = {
  balanceBTC: number;
  securityScore: number;
  opsecThreat: 'Low' | 'Medium' | 'High';
  usedAddressCount: number;
  dustAmountBTC: number;
  dustUtxoCount: number;
  btcPrices: Record<string, BtcPriceInfo>; // { USD: { last: 70000, symbol: '$' }, ... }
  performance: {
    change24h: number;
    change7d: number;
    change30d: number;
  };
  inflowOutflow: {
    inflowBTC: number;
    outflowBTC: number;
  };
  utxos: UTXO[];
  averageFeeRate: number; // sat/vB
};

export type WalletData = Wallet & {
  transactions: Transaction[];
  addresses: AddressInfo[];
  btcPrice: number;
};

export type SecurityRecommendation = {
  title: string;
  description: string;
  level: 'Good' | 'Warning' | 'Info' | 'Critical';
};

// Define an interface for chart data; adjust as needed for supported chart libraries
export interface ChartData {
  type: string; // e.g., 'bar', 'line', etc.
  data: any;    // You can further type this if structure is known
  options?: any;
}

export type FollowUpSuggestion = {
  question: string;
  context: string;
};

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  chart?: ChartData;
  followUpSuggestions?: FollowUpSuggestion[];
};

export type NewsArticle = {
  title: string;
  summary: string;
  date: string;
};

export type NostrProfile = {
  name?: string;
  display_name?: string;
  website?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
  picture?: string;
  banner?: string;
};

export type RecommendedFees = {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
};

export type MempoolBlock = {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeRange: number[];
};

export type MempoolInfo = {
  count: number;
  vsize: number;
  total_fee: number;
  fee_histogram: number[][];
};

export type LatestBlock = {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  mediantime: number;
  nonce: number;
  bits: number;
  difficulty: number;
};

export type MempoolData = {
  recommendedFees: RecommendedFees;
  mempoolBlocks: MempoolBlock[];
  mempoolInfo: MempoolInfo;
  latestBlocks: LatestBlock[];
  networkFeeRate: number;
  networkFeeLevel: 'Low' | 'Medium' | 'High';
};

export type MarketData = {
  price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  circulating_supply: number;
  total_supply: number | null;
  ath: number;
  atl: number;
  last_updated: string;
};

export type MarketChartPoint = {
  timestamp: number;
  price: number;
};

export type CandlestickDataPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type FearAndGreedIndex = {
  value: number;
  value_classification: string;
  timestamp: string;
};

export type MarketPageData = {
  marketData: MarketData;
  chartData: MarketChartPoint[];
  candlestickData: CandlestickDataPoint[];
  fearAndGreed: FearAndGreedIndex;
};

export type BlockTransaction = {
  txid: string;
  fee: number;
  size: number;
  weight: number;
  value: number; // in satoshis
};

export type BlockDetails = LatestBlock & {
  transactions: BlockTransaction[];
};

export const VALID_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof VALID_CURRENCIES)[number];

// Enhanced Bitcoin-specific types for GPT-4.1 Mini analysis
export type BitcoinTransactionType = 'send' | 'receive' | 'self-transfer' | 'exchange' | 'unknown';
export type BitcoinAddressType = 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
export type PrivacyRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FeeEfficiencyLevel = 'excellent' | 'good' | 'fair' | 'poor';

export type BitcoinTransactionAnalysis = {
  transactionType: BitcoinTransactionType;
  privacyScore: number; // 0-100
  feeEfficiency: FeeEfficiencyLevel;
  riskFactors: string[];
  recommendations: string[];
  associatedEntities?: string[]; // Exchange names, known addresses
};

export type BitcoinAddressAnalysis = {
  addressType: BitcoinAddressType;
  reuseCount: number;
  privacyRisk: PrivacyRiskLevel;
  associatedEntities: string[];
  clusteringScore?: number; // 0-100, higher = more clustered
};

export type Holding = {
  address: string;
  balance: number;
  cost: number;
  marketValue: number;
  roi: number;
  potentialGain: number;
};

// Types for the new Tax Report Page
export type TaxReportOutput = {
  summary: {
    startDate: string;
    endDate: string;
    startValue: number;
    endValue: number;
    totalValueChange: number;
    totalValueChangePercentage: number;
    costBasis: number;
    unrealizedGains: number;
    inflow: number;
    outflow: number;
    tradingFees: number;
    realizedGains: number;
  };
  portfolioHistory: Array<{
    date: string;
    totalValue: number;
    costBasis: number;
  }>;
  holdings: Array<Holding>;
};

export type TaxCategory = 'SHORT_TERM' | 'LONG_TERM' | 'INCOME' | 'NON_TAXABLE';
export type AccountingMethod = 'FIFO' | 'LIFO' | 'HIFO' | 'SPEC_ID' | 'AVG_COST' | 'SHARED_POOL';
export type Jurisdiction = 'US' | 'UK' | 'CANADA' | 'AUSTRALIA' | 'GERMANY' | 'OTHER';

export type EnhancedHolding = Holding & {
  taxCategory?: TaxCategory;
  holdingPeriodDays?: number;
};

export type TaxLotDetail = {
  id: string;
  txid: string;
  date: string;
  amount: number;
  costBasis: number;
  costPerUnit: number;
  remaining: number;
  currentValue: number;
  unrealizedGain: number;
  taxCategory: TaxCategory;
  holdingPeriodDays: number;
  address?: string;
};

export type DisposalDetail = {
  txid: string;
  date: string;
  amount: number;
  proceeds: number;
  costBasis: number;
  realizedGain: number;
  type: 'SALE' | 'TRADE' | 'SPEND' | 'GIFT';
  lots: Array<{
    lotId: string;
    amount: number;
    costBasis: number;
    acquisitionDate: string;
    holdingPeriodDays: number;
    taxCategory: TaxCategory;
  }>;
};

export type IncomeDetail = {
  txid: string;
  date: string;
  amount: number;
  fairMarketValue: number;
  type: 'MINING' | 'STAKING' | 'AIRDROP' | 'GIFT' | 'FORK' | 'INTEREST' | 'OTHER';
};

export type EnhancedTaxReportOutput = {
  summary: {
    startDate: string;
    endDate: string;
    startValue: number;
    endValue: number;
    totalValueChange: number;
    totalValueChangePercentage: number;
    costBasis: number;
    unrealizedGains: number;
    inflow: number;
    outflow: number;
    tradingFees: number;
    realizedGains: number;
    shortTermGains: number;
    longTermGains: number;
    totalCapitalGains: number;
    ordinaryIncome: number;
    deductibleFees: number;
    harvestableShortTermLosses: number;
    harvestableLongTermLosses: number;
  };
  portfolioHistory: Array<{
    date: string;
    totalValue: number;
    costBasis: number;
  }>;
  holdings: Array<EnhancedHolding>;
  disposals: Array<DisposalDetail>;
  income: Array<IncomeDetail>;
  lots: Array<TaxLotDetail>;
  accountingMethod: string;
  jurisdiction: string;
  jurisdictionRules: {
    longTermHoldingPeriodDays: number;
    washSalePeriodDays?: number;
    sameDayMatching?: boolean;
    bedAndBreakfastDays?: number;
    superficialLossDays?: number;
    capitalGainsDiscount?: number;
    taxFreeThreshold?: number;
  };
};
