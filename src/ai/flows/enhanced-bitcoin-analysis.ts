'use server';

/**
 * @fileOverview Enhanced Bitcoin analysis using GPT-4.1 Mini capabilities
 *
 * This flow provides advanced Bitcoin transaction and address analysis with structured outputs
 * that leverage GPT-4.1 Mini's enhanced capabilities for Bitcoin-specific insights.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { WalletData, BitcoinTransactionAnalysis, BitcoinAddressAnalysis } from '@/lib/types';

const PROMPT_CACHE_TTL_SECONDS = 60 * 60; // 1 hour TTL for reusable prompt scaffolding

type CacheEntry<T> = { value: T; expiresAt: number };

const transactionAnalysisCache = new Map<string, CacheEntry<EnhancedTransactionAnalysisOutput>>();
const addressAnalysisCache = new Map<string, CacheEntry<EnhancedAddressAnalysisOutput>>();

const getCachedValue = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedValue = <T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + PROMPT_CACHE_TTL_SECONDS * 1000,
  });
};

// Input schema for enhanced transaction analysis
const EnhancedTransactionAnalysisInputSchema = z.object({
  transactionId: z.string().describe('The ID of the transaction to analyze.'),
  walletData: z.string().describe('JSON string containing the full wallet data for context.'),
});
export type EnhancedTransactionAnalysisInput = z.infer<typeof EnhancedTransactionAnalysisInputSchema>;

// Output schema for enhanced transaction analysis
const EnhancedTransactionAnalysisOutputSchema = z.object({
  analysis: z.object({
    transactionType: z.enum(['send', 'receive', 'self-transfer', 'exchange', 'unknown']),
    privacyScore: z.number().min(0).max(100),
    feeEfficiency: z.enum(['excellent', 'good', 'fair', 'poor']),
    riskFactors: z.array(z.string()),
    recommendations: z.array(z.string()),
    associatedEntities: z.array(z.string()).optional(),
  }),
  summary: z.string().describe('A human-readable summary of the analysis.'),
});
export type EnhancedTransactionAnalysisOutput = z.infer<typeof EnhancedTransactionAnalysisOutputSchema>;

// Input schema for enhanced address analysis
const EnhancedAddressAnalysisInputSchema = z.object({
  address: z.string().describe('The Bitcoin address to analyze.'),
  walletData: z.string().describe('JSON string containing the full wallet data for context.'),
});
export type EnhancedAddressAnalysisInput = z.infer<typeof EnhancedAddressAnalysisInputSchema>;

// Output schema for enhanced address analysis
const EnhancedAddressAnalysisOutputSchema = z.object({
  analysis: z.object({
    addressType: z.enum(['p2pkh', 'p2sh', 'p2wpkh', 'p2wsh', 'p2tr']),
    reuseCount: z.number(),
    privacyRisk: z.enum(['low', 'medium', 'high', 'critical']),
    associatedEntities: z.array(z.string()),
    clusteringScore: z.number().min(0).max(100).optional(),
  }),
  summary: z.string().describe('A human-readable summary of the address analysis.'),
});
export type EnhancedAddressAnalysisOutput = z.infer<typeof EnhancedAddressAnalysisOutputSchema>;

// Enhanced transaction analysis flow
export async function analyzeBitcoinTransaction(input: EnhancedTransactionAnalysisInput): Promise<EnhancedTransactionAnalysisOutput> {
  return enhancedTransactionAnalysisFlow(input);
}

const transactionAnalysisPrompt = ai.definePrompt({
  name: 'enhancedTransactionAnalysisPrompt',
  input: {
    schema: z.object({
      transactionData: z.string(), // JSON string of the transaction
      walletContext: z.string(), // Additional wallet context
    })
  },
  output: {schema: EnhancedTransactionAnalysisOutputSchema},
  prompt: `You are BitSleuth, an expert Bitcoin transaction analyst with advanced knowledge of blockchain privacy, security, and transaction patterns.

Analyze the following Bitcoin transaction and provide a comprehensive analysis:

Transaction Data:
\`\`\`json
{{{transactionData}}}
\`\`\`

Wallet Context:
\`\`\`json
{{{walletContext}}}
\`\`\`

Provide a detailed analysis including:

1. **Transaction Type Classification:**
   - 'send': Outgoing transaction from this wallet
   - 'receive': Incoming transaction to this wallet  
   - 'self-transfer': Transaction between addresses in the same wallet
   - 'exchange': Transaction with known exchange addresses
   - 'unknown': Cannot determine transaction type

2. **Privacy Score (0-100):**
   - Higher scores indicate better privacy practices
   - Consider: address reuse, transaction patterns, mixing indicators, timing analysis
   - Factor in: number of inputs/outputs, change detection, dust amounts

3. **Fee Efficiency Assessment:**
   - 'excellent': Fee is optimal for current network conditions
   - 'good': Fee is reasonable but could be optimized
   - 'fair': Fee is acceptable but not optimal
   - 'poor': Fee is significantly overpaid or underpaid

4. **Risk Factors:** List specific privacy or security concerns

5. **Recommendations:** Provide actionable advice for improving privacy/security

6. **Associated Entities:** Identify any known exchanges, services, or entities

Generate both the structured analysis and a clear, human-readable summary.`,
});

const enhancedTransactionAnalysisFlow = ai.defineFlow(
  {
    name: 'enhancedTransactionAnalysisFlow',
    inputSchema: EnhancedTransactionAnalysisInputSchema,
    outputSchema: EnhancedTransactionAnalysisOutputSchema,
  },
  async (input) => {
    try {
      const walletData: WalletData = JSON.parse(input.walletData);
      
      const transaction = walletData.transactions.find(tx => tx.id === input.transactionId);

      if (!transaction) {
        return {
          analysis: {
            transactionType: 'unknown' as const,
            privacyScore: 0,
            feeEfficiency: 'fair' as const,
            riskFactors: ['Transaction not found in wallet'],
            recommendations: ['Verify transaction ID'],
          },
          summary: `The transaction with ID \`${input.transactionId}\` was not found in this wallet's history.`
        };
      }

      // Create wallet context for analysis
      const walletContext = {
        totalTransactions: walletData.transactions.length,
        averageFee: walletData.averageFeeRate,
        securityScore: walletData.securityScore,
        opsecThreat: walletData.opsecThreat,
        dustUtxoCount: walletData.dustUtxoCount,
      };

      const transactionCacheKey = JSON.stringify({
        transactionId: input.transactionId,
        transaction,
        walletContext,
      });

      const cachedTransactionAnalysis = getCachedValue(
        transactionAnalysisCache,
        transactionCacheKey
      );

      if (cachedTransactionAnalysis) {
        return cachedTransactionAnalysis;
      }

      const { output } = await transactionAnalysisPrompt({
        transactionData: JSON.stringify(transaction),
        walletContext: JSON.stringify(walletContext),
      });

      if (!output) {
        return {
          analysis: {
            transactionType: 'unknown' as const,
            privacyScore: 0,
            feeEfficiency: 'fair' as const,
            riskFactors: ['Analysis failed'],
            recommendations: ['Try again later'],
          },
          summary: 'Unable to analyze this transaction at this time.'
        };
      }

      setCachedValue(transactionAnalysisCache, transactionCacheKey, output);

      return output;
    } catch (e) {
      console.error('Error in enhancedTransactionAnalysisFlow:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        analysis: {
          transactionType: 'unknown' as const,
          privacyScore: 0,
          feeEfficiency: 'fair' as const,
          riskFactors: ['Analysis error'],
          recommendations: ['Contact support if issue persists'],
        },
        summary: `An error occurred while analyzing the transaction: ${errorMessage}`
      };
    }
  }
);

// Enhanced address analysis flow
export async function analyzeBitcoinAddress(input: EnhancedAddressAnalysisInput): Promise<EnhancedAddressAnalysisOutput> {
  return enhancedAddressAnalysisFlow(input);
}

const addressAnalysisPrompt = ai.definePrompt({
  name: 'enhancedAddressAnalysisPrompt',
  input: {
    schema: z.object({
      address: z.string(),
      addressInfo: z.string(), // JSON string of address information
      relatedTransactions: z.string(), // JSON string of related transactions
    })
  },
  output: {schema: EnhancedAddressAnalysisOutputSchema},
  prompt: `You are BitSleuth, an expert Bitcoin address analyst specializing in privacy, security, and blockchain forensics.

Analyze the following Bitcoin address:

Address: {{{address}}}

Address Information:
\`\`\`json
{{{addressInfo}}}
\`\`\`

Related Transactions (sample):
\`\`\`json
{{{relatedTransactions}}}
\`\`\`

Provide a comprehensive analysis including:

1. **Address Type Classification:**
   - 'p2pkh': Legacy Pay-to-Public-Key-Hash (1...)
   - 'p2sh': Pay-to-Script-Hash (3...)
   - 'p2wpkh': Native SegWit (bc1...)
   - 'p2wsh': SegWit Script Hash (bc1...)
   - 'p2tr': Taproot (bc1p...)

2. **Reuse Analysis:**
   - Count of transactions involving this address
   - Privacy implications of reuse

3. **Privacy Risk Assessment:**
   - 'low': Minimal privacy concerns
   - 'medium': Some privacy risks present
   - 'high': Significant privacy risks
   - 'critical': Severe privacy violations

4. **Associated Entities:** Known exchanges, services, or entities

5. **Clustering Score (0-100):** How clustered this address is with others

Generate both the structured analysis and a clear, human-readable summary.`,
});

const enhancedAddressAnalysisFlow = ai.defineFlow(
  {
    name: 'enhancedAddressAnalysisFlow',
    inputSchema: EnhancedAddressAnalysisInputSchema,
    outputSchema: EnhancedAddressAnalysisOutputSchema,
  },
  async (input) => {
    try {
      const walletData: WalletData = JSON.parse(input.walletData);
      
      const addressInfo = walletData.addresses.find(a => a.address === input.address);

      if (!addressInfo) {
        return {
          analysis: {
            addressType: 'p2pkh' as const, // Default assumption
            reuseCount: 0,
            privacyRisk: 'low' as const,
            associatedEntities: [],
          },
          summary: `The address \`${input.address}\` was not found in this wallet or has no transaction history.`
        };
      }
      
      const relatedTransactions = walletData.transactions.filter(tx =>
          tx.fromAddress.includes(input.address) || tx.toAddress.includes(input.address)
      ).slice(0, 5); // Limit to 5 for context

      const addressCacheKey = JSON.stringify({
        address: input.address,
        addressInfo,
        relatedTransactions,
      });

      const cachedAddressAnalysis = getCachedValue(addressAnalysisCache, addressCacheKey);

      if (cachedAddressAnalysis) {
        return cachedAddressAnalysis;
      }

      const { output } = await addressAnalysisPrompt({
        address: input.address,
        addressInfo: JSON.stringify(addressInfo),
        relatedTransactions: JSON.stringify(relatedTransactions),
      });

      if (!output) {
        return {
          analysis: {
            addressType: 'p2pkh' as const,
            reuseCount: addressInfo.n_tx,
            privacyRisk: 'medium' as const,
            associatedEntities: [],
          },
          summary: 'Unable to analyze this address at this time.'
        };
      }

      setCachedValue(addressAnalysisCache, addressCacheKey, output);

      return output;
    } catch (e) {
      console.error('Error in enhancedAddressAnalysisFlow:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        analysis: {
          addressType: 'p2pkh' as const,
          reuseCount: 0,
          privacyRisk: 'low' as const,
          associatedEntities: [],
        },
        summary: `An error occurred while analyzing the address: ${errorMessage}`
      };
    }
  }
);
