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
import {z} from 'zod';
import type { WalletData } from '@/lib/types';

// The public-facing input schema now accepts the full wallet data.
const SecurityRecommendationsInputSchema = z.object({
  walletData: z.string().describe('JSON string containing the full wallet data for context.'),
});
export type SecurityRecommendationsInput = z.infer<typeof SecurityRecommendationsInputSchema>;

// This internal schema is used only by the prompt.
const PromptInputSchema = z.object({
  walletSummary: z.string().describe('JSON string containing a summary of wallet data, including security score, opsec threat, dust analysis, and address usage.'),
});

const RecommendationSchema = z.object({
    title: z.string().describe("A short, clear title for the recommendation."),
    description: z.string().describe("A concise (2-3 sentences) explanation of the recommendation, its importance, and what the user should do."),
    level: z.enum(['Good', 'Warning', 'Info', 'Critical']).describe("The severity or type of recommendation. 'Critical' for severe risks. 'Warning' for medium risks. 'Good' for positive findings. 'Info' for general advice."),
});

const SecurityRecommendationsOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe("An array of security recommendations."),
});
export type SecurityRecommendationsOutput = z.infer<typeof SecurityRecommendationsOutputSchema>;

export async function getSecurityRecommendations(input: SecurityRecommendationsInput): Promise<SecurityRecommendationsOutput> {
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
    inputSchema: SecurityRecommendationsInputSchema, // Updated input
    outputSchema: SecurityRecommendationsOutputSchema,
  },
  async (input) => {
    try {
        const walletData: WalletData = JSON.parse(input.walletData);

        // Create the summary object programmatically.
        const summary = {
          opsecThreat: walletData.opsecThreat,
          dustUtxoCount: walletData.dustUtxoCount,
        };
        const promptInput = { walletSummary: JSON.stringify(summary) };

        const {output} = await prompt(promptInput);

        if (!output) {
            return { recommendations: [{
                title: 'Error',
                description: 'The AI model did not return a response for security recommendations. It might be temporarily unavailable.',
                level: 'Warning' as const
            }]};
        }
        return output;
    } catch(e) {
        console.error("Error in securityRecommendationsFlow:", e);
        return { recommendations: [{
            title: 'Analysis Error',
            description: `An error occurred while generating security recommendations: ${e instanceof Error ? e.message : String(e)}`,
            level: 'Warning' as const
        }] };
    }
  }
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
