
'use server';
/**
 * @fileOverview An AI agent that provides a summary for a specific transaction.
 *
 * - summarizeTransaction - A function that handles the transaction summarization.
 * - SummarizeTransactionInput - The input type for the function.
 * - SummarizeTransactionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import { z } from '@genkit-ai/core';
import type { WalletData } from '@/lib/types';


const SummarizeTransactionInputSchema = z.object({
  transactionId: z.string().describe('The ID of the transaction to summarize.'),
  walletData: z.string().describe('JSON string containing the full wallet data for context.'),
});
export type SummarizeTransactionInput = z.infer<typeof SummarizeTransactionInputSchema>;

const SummarizeTransactionOutputSchema = z.object({
  summary: z.string().describe("A concise, human-readable summary of the transaction."),
});
export type SummarizeTransactionOutput = z.infer<typeof SummarizeTransactionOutputSchema>;

export async function summarizeTransaction(input: SummarizeTransactionInput): Promise<SummarizeTransactionOutput> {
  return summarizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTransactionPrompt',
  input: {
    schema: z.object({
        transactionData: z.string(), // JSON string of the specific Transaction object
    })
  },
  output: {schema: SummarizeTransactionOutputSchema},
  prompt: `You are BitSleuth, an expert Bitcoin transaction analyst. Your task is to provide a concise, human-readable summary for the single Bitcoin transaction provided below.

Transaction Data:
\`\`\`json
{{{transactionData}}}
\`\`\`

Based on this data, generate a clear summary. The summary should be easy to understand for someone who isn't a Bitcoin expert.

Highlight these key details:
- **Type:** Was this a 'Sent' or 'Received' transaction from the wallet's perspective?
- **Net Amount:** What was the net change in the wallet's balance from this transaction, in both BTC and its historical USD value (if available)?
- **Date:** When did the transaction occur?
- **Status:** Is the transaction 'Confirmed' or 'Pending'? How many confirmations does it have?
- **Fee:** How much was the miner fee in both satoshis and its historical USD value (if available)?
- **Involved Parties:** Briefly mention the number of input and output addresses.

Keep the summary to a clear and concise paragraph.
`,
});

const summarizeTransactionFlow = ai.defineFlow(
  {
    name: 'summarizeTransactionFlow',
    inputSchema: SummarizeTransactionInputSchema,
    outputSchema: SummarizeTransactionOutputSchema,
  },
  async (input) => {
    try {
      const walletData: WalletData = JSON.parse(input.walletData);
      
      const transaction = walletData.transactions.find(tx => tx.id === input.transactionId);

      if (!transaction) {
        return { summary: `The transaction with ID \`${input.transactionId}\` was not found in this wallet's history.` };
      }

      const { output } = await prompt({
        transactionData: JSON.stringify(transaction),
      });

      if (!output) {
          return { summary: 'The AI model could not generate a summary for this transaction.' };
      }
      return output;
    } catch (e) {
      console.error("Error in summarizeTransactionFlow:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { summary: `An error occurred while summarizing the transaction: ${errorMessage}` };
    }
  }
);
