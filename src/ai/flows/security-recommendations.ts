'use server';

/**
 * @fileOverview An AI agent that generates security recommendations based on wallet data.
 *
 * - getSecurityRecommendations - A function that handles recommendation generation.
 * - securityRecommendationsTool - A Genkit tool for use in other flows.
 * - SecurityRecommendationsInput - The input type for the function.
 * - SecurityRecommendationsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import { z } from '@genkit-ai/core';
import type { WalletData } from '@/lib/types';
import { logger } from '@/lib/logger';
import {
  SecurityRecommendationsOutputSchema,
  parseSecurityRecommendationsOutput,
  type SecurityRecommendationsOutput,
} from './ai-output-parsers';
import { assertGenkitSchema, logAiResponsePayload } from './ai-runtime';

export type { SecurityRecommendationsOutput } from './ai-output-parsers';

const SecurityRecommendationsInputSchema = z.object({
  walletSummary: z
    .string()
    .describe('JSON string containing only the minimal fields required for recommendations.'),
});
export type SecurityRecommendationsInput = z.infer<typeof SecurityRecommendationsInputSchema>;

// This internal schema is used only by the prompt.
const PromptInputSchema = z.object({
  walletSummary: z
    .string()
    .describe('JSON string containing a minimal summary of wallet security signals like opsec threat and dust UTXO count.'),
});

const parseJsonFromText = (text: string | undefined): unknown => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

let hasLoggedSchemaShape = false;

const logSchemaShapeOnce = () => {
  if (hasLoggedSchemaShape) {
    return;
  }

  hasLoggedSchemaShape = true;
  assertGenkitSchema(SecurityRecommendationsOutputSchema, 'securityRecommendationsFlow output');
  logger.debug('securityRecommendationsFlow: output schema snapshot', {
    schemaDef: (SecurityRecommendationsOutputSchema as { _def?: unknown })?._def,
  });
};

export async function getSecurityRecommendations(
  input: SecurityRecommendationsInput,
): Promise<SecurityRecommendationsOutput> {
  return securityRecommendationsFlow(input);
}

// The prompt itself remains unchanged, still expecting a summary.
const prompt = ai.definePrompt({
  name: 'securityRecommendationsPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: SecurityRecommendationsOutputSchema},
  prompt: `You are BitSleuth, an expert Bitcoin wallet security analyst. Your goal is to provide a list of exactly 3 actionable security and privacy recommendations based on the user's wallet data.

Your response MUST follow this structure to generate exactly 3 recommendations:

1.  **Privacy Threat Level (Mandatory):**
    *   **Title:** "Privacy Threat Level".
    *   **Description:** State the user's current threat level (Low, Medium, or High) based on the \`opsecThreat\` value. Explain that this is determined by the percentage of reused addresses. When the level is 'High', use strong wording to convey the seriousness of the privacy risk.
    *   **Level:** Set to 'Critical' if the threat is 'High'. Set to 'Warning' if 'Medium'. Set to 'Good' if 'Low'.

2.  **Address Reuse Advice (Mandatory):**
    *   **Title:** "Tip: Avoid Reusing Addresses".
    *   **Description:** If the threat level is not 'Low', recommend using a new Bitcoin address for every incoming transaction to maximize privacy. Explain *why* (it prevents linking transactions and enhances anonymity). If the threat level is 'Low', congratulate the user on good address management.
    *   **Level:** This should always be 'Info', as it's a general best-practice tip, even if their current threat level is low.

3.  **Dust Analysis (Mandatory):**
    *   **Title:** "Dust Analysis".
    *   **Description:** Analyze the \`dustUtxoCount\`. Explain what dust is. If the count is zero, congratulate them for having a clean wallet. If it's high (e.g., > 10), explain the potential privacy/fee issues and suggest consolidation might be useful.
    *   **Level:** 'Good' if dust count is zero. 'Warning' if the dust count is high. 'Info' otherwise.

### Rules
-   **Total Recommendations:** Generate EXACTLY 3 recommendations following the structure above.
-   **Concise and Clear:** Keep descriptions to 2-3 sentences.
-   **JSON Output:** The final output MUST be a single, valid JSON object that conforms to the schema.

Here is the user's wallet data summary:
\`\`\`json
{{{walletSummary}}}
\`\`\`

Generate the list of recommendations.`,
});

// The flow now handles the data transformation.
const securityRecommendationsFlow = ai.defineFlow(
  {
    name: 'securityRecommendationsFlow',
    inputSchema: SecurityRecommendationsInputSchema,
    outputSchema: SecurityRecommendationsOutputSchema,
  },
  async (input) => {
    let parsedSummary: Partial<WalletData> = {};

    try {
      parsedSummary = JSON.parse(input.walletSummary) as Partial<WalletData>;
    } catch (error) {
      logger.warn('securityRecommendationsFlow: Invalid wallet summary JSON. Using defaults.', error);
    }

    const minimalSummary = {
      opsecThreat: parsedSummary.opsecThreat ?? 'Low',
      dustUtxoCount: Math.max(0, Number(parsedSummary.dustUtxoCount) || 0),
    } satisfies Partial<WalletData>;

    const promptInput = { walletSummary: JSON.stringify(minimalSummary) };

    try {
      logSchemaShapeOnce();

      const response = await prompt(promptInput);
      const rawOutput = response.output ?? parseJsonFromText(response.text);
      const parsedOutput = parseSecurityRecommendationsOutput(rawOutput);

      logAiResponsePayload('securityRecommendationsFlow', response, {
        rawOutput,
        parsedOutput,
      });

      if (!parsedOutput) {
        logger.warn('securityRecommendationsFlow: Invalid model output. Returning empty recommendations.');
        logger.debug('securityRecommendationsFlow: model output payload', {
          output: response.output,
          text: response.text,
        });
        return { recommendations: [] };
      }

      return parsedOutput;
    } catch (error) {
      logger.error('Error in securityRecommendationsFlow:', error);
      return { recommendations: [] };
    }
  },
);


// The tool is updated with the simpler, more robust input schema.
export const securityRecommendationsTool = ai.defineTool(
  {
    name: 'getSecurityRecommendations',
    description: 'Generates a detailed security analysis and a list of actionable recommendations for the user\'s Bitcoin wallet. Use this tool when the user asks for a "security report", "full recommendations", "security analysis", or similar phrases.',
    inputSchema: SecurityRecommendationsInputSchema, // Updated input schema
    outputSchema: SecurityRecommendationsOutputSchema,
  },
  getSecurityRecommendations
);
