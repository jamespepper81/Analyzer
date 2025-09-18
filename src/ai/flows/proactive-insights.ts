
'use server';

/**
 * @fileOverview An AI agent that generates a single, proactive insight about a user's wallet.
 *
 * - getProactiveInsight - A function that handles the insight generation.
 * - ProactiveInsightInput - The input type for the function.
 * - ProactiveInsightOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { logger } from '@/lib/logger';

const ProactiveInsightInputSchema = z.object({
  walletData: z.string().describe('JSON string containing wallet data including balance, transaction history, security analysis, UTXOs, etc.'),
});
export type ProactiveInsightInput = z.infer<typeof ProactiveInsightInputSchema>;

const ProactiveInsightOutputSchema = z.object({
  insight: z.string().describe("A single, concise, and interesting insight about the user's wallet. It must not start with a greeting like 'Hello' or 'Welcome back'."),
});
export type ProactiveInsightOutput = z.infer<typeof ProactiveInsightOutputSchema>;

export async function getProactiveInsight(input: ProactiveInsightInput): Promise<ProactiveInsightOutput> {
  return proactiveInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'proactiveInsightPrompt',
  input: {schema: ProactiveInsightInputSchema},
  output: {schema: ProactiveInsightOutputSchema},
  prompt: `You are an expert Bitcoin wallet analyst. Your goal is to find one single, interesting, and helpful insight from the user's wallet data.

Do NOT start with any greeting or friendly opening like "Hello!", "Welcome back!", or "Here's a quick thought on your wallet:". Go directly into the insight.

Look for noteworthy patterns, such as:
- A high concentration of funds in a single address.
- A large number of very small UTXOs (dust).
- A recent transaction with an unusually high fee.
- A significant portion of the balance being received recently.
- High address reuse, impacting privacy.
- A large, old UTXO that hasn't moved in a long time.

Based on the single most interesting thing you find, formulate a concise, one or two-sentence insight.

Example Insight: "I noticed that over 90% of your balance is held in a single address. For better privacy, you might consider using new addresses for future transactions."
Another Example: "I see you have a lot of small 'dust' UTXOs. Consolidating them could help tidy up your wallet."

Here is the user's wallet data in JSON format. Use this as your single source of truth:
\`\`\`json
{{{walletData}}}
\`\`\`

Generate one proactive insight. Your response MUST be a single, valid JSON object that conforms to the output schema. Do not add any extra text, conversation, or markdown formatting like \`\`\`json before or after the JSON object.`,
});

const proactiveInsightFlow = ai.defineFlow(
  {
    name: 'proactiveInsightFlow',
    inputSchema: ProactiveInsightInputSchema,
    outputSchema: ProactiveInsightOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        return { insight: 'Could not generate an insight at this time.' };
      }
      return output;
    } catch (e) {
      logger.error("Error in proactiveInsightFlow:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { insight: `An error occurred while generating an insight: ${errorMessage}` };
    }
  }
);
