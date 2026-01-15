
'use server';
/**
 * @fileOverview An AI agent that provides a summary for a specific Bitcoin address.
 *
 * - summarizeAddress - A function that handles the address summarization.
 * - SummarizeAddressInput - The input type for the function.
 * - SummarizeAddressOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import { z } from '@genkit-ai/core';
import type { WalletData } from '@/lib/types';

const SummarizeAddressInputSchema = z.object({
  address: z.string().describe('The Bitcoin address to summarize.'),
  walletData: z.string().describe('JSON string containing the full wallet data for context.'),
});
export type SummarizeAddressInput = z.infer<typeof SummarizeAddressInputSchema>;

const SummarizeAddressOutputSchema = z.object({
  summary: z.string().describe("A concise, human-readable summary of the address's activity and status."),
});
export type SummarizeAddressOutput = z.infer<typeof SummarizeAddressOutputSchema>;

export async function summarizeAddress(input: SummarizeAddressInput): Promise<SummarizeAddressOutput> {
  return summarizeAddressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAddressPrompt',
  input: {
    schema: z.object({
        address: z.string(),
        addressInfo: z.string(), // JSON string of the specific AddressInfo object
        relatedTransactions: z.string(), // JSON string of transactions involving this address
    })
  },
  output: {schema: SummarizeAddressOutputSchema},
  prompt: `You are BitSleuth, an expert Bitcoin wallet analyst. Your task is to provide a concise summary for a single Bitcoin address based on the data provided.

Address to analyze: {{{address}}}

Address Information (balance, transaction count):
\`\`\`json
{{{addressInfo}}}
\`\`\`

Related Transactions (a sample of recent transactions involving this address):
\`\`\`json
{{{relatedTransactions}}}
\`\`\`

Based on this data, generate a human-readable summary. The summary should be informative and easy to understand for a non-technical user.

Include the following points if the data is available:
- The current balance of the address in both BTC and its approximate USD value.
- The total number of transactions associated with this address.
- A brief mention of its activity, for example, whether it's mostly used for receiving or sending funds.
- Mention if the address has been reused (n_tx > 1) and briefly explain the privacy implication.

Keep the summary to a few sentences.
`,
});

const summarizeAddressFlow = ai.defineFlow(
  {
    name: 'summarizeAddressFlow',
    inputSchema: SummarizeAddressInputSchema,
    outputSchema: SummarizeAddressOutputSchema,
  },
  async (input) => {
    try {
      const walletData: WalletData = JSON.parse(input.walletData);
      
      const addressInfo = walletData.addresses.find(a => a.address === input.address);

      if (!addressInfo) {
        return { summary: `The address \`${input.address}\` was not found in this wallet or has no transaction history.` };
      }
      
      const relatedTransactions = walletData.transactions.filter(tx => 
          tx.fromAddress.includes(input.address) || tx.toAddress.includes(input.address)
      ).slice(0, 10); // Limit to 10 recent for context

      const btcPrice = walletData.btcPrice || 0;
      const addressInfoWithUSD = {
          ...addressInfo,
          balanceUSD: (addressInfo.balance / 1e8) * btcPrice
      };

      const { output } = await prompt({
          address: input.address,
          addressInfo: JSON.stringify(addressInfoWithUSD),
          relatedTransactions: JSON.stringify(relatedTransactions),
      });

      if (!output) {
          return { summary: 'The AI model could not generate a summary for this address.' };
      }
      return output;
    } catch (e) {
      console.error("Error in summarizeAddressFlow:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { summary: `An error occurred while summarizing the address: ${errorMessage}` };
    }
  }
);
