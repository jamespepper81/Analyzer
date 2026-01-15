
'use server';

/**
 * @fileOverview An AI agent that generates a list of proactive chat suggestions based on wallet data.
 *
 * - getProactiveSuggestions - A function that handles suggestion generation.
 * - ProactiveSuggestionsInput - The input type for the function.
 * - ProactiveSuggestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import { z } from '@genkit-ai/core';
import { logger } from '@/lib/logger';

const ProactiveSuggestionsInputSchema = z.object({
  walletSummary: z.string().describe('JSON string containing a summary of wallet data, such as balance, number of transactions, security score, UTXO count, etc.'),
});
export type ProactiveSuggestionsInput = z.infer<typeof ProactiveSuggestionsInputSchema>;

const ProactiveSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe("An array of 10 to 12 interesting and varied questions a user could ask about their wallet. The questions should be phrased from the user's perspective."),
});
export type ProactiveSuggestionsOutput = z.infer<typeof ProactiveSuggestionsOutputSchema>;

export async function getProactiveSuggestions(input: ProactiveSuggestionsInput): Promise<ProactiveSuggestionsOutput> {
  return proactiveSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'proactiveSuggestionsPrompt',
  input: {schema: ProactiveSuggestionsInputSchema},
  output: {schema: ProactiveSuggestionsOutputSchema},
  prompt: `You are an expert Bitcoin wallet analyst AI. Your goal is to generate a list of 10 to 12 interesting and varied questions that a user could ask about their wallet.

Base your questions on the provided wallet data summary. The questions should be insightful and touch upon different aspects of the wallet like transactions, security, performance, and investment patterns.

RULES:
- Frame the questions from the user's perspective (e.g., "What is my..." not "What is the user's...").
- **Keep questions concise and punchy. They should be short enough to fit comfortably on a small button.**
- Do NOT repeat questions. Make them varied.
- The output MUST be a valid JSON object conforming to the schema.

Here is a summary of the user's wallet data:
\`\`\`json
{{{walletSummary}}}
\`\`\`

Based on this data, generate a list of 10-12 engaging questions a user could ask.

Example questions if the data showed high address reuse:
- "Why is my security score so low?"
- "Show my reused addresses."
- "Give me privacy tips."

Example questions if the data showed many small UTXOs:
- "Do I have 'dust' UTXOs?"
- "Create a bar chart of my UTXO sizes."
- "Is it expensive to spend my bitcoin?"

Example questions if the data showed regular "Received" transactions:
- "Am I DCA-ing?"
- "What's my average BTC cost basis?"
- "Chart my balance over time."

Now, generate the suggestions based on the provided wallet summary.`,
});

const proactiveSuggestionsFlow = ai.defineFlow(
  {
    name: 'proactiveSuggestionsFlow',
    inputSchema: ProactiveSuggestionsInputSchema,
    outputSchema: ProactiveSuggestionsOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        return { suggestions: [] };
      }
      return output;
    } catch (e) {
      logger.error("Error in proactiveSuggestionsFlow:", e);
      return { suggestions: [] };
    }
  }
);
