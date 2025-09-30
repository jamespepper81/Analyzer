
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

const HistoryMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
}).passthrough();

const WalletInsightsChatInputSchema = z.object({
  question: z.string().describe('The user question about their Bitcoin wallet.'),
  walletData: z.string().describe('JSON string containing wallet data including balance, transaction history, security analysis, UTXOs, etc.'),
  history: z.array(HistoryMessageSchema).optional().describe("The history of the conversation so far."),
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


const WalletInsightsChatOutputSchema = z.object({
  answer: z.string().describe('The AI answer to the user question. This should summarize the findings and mention that a chart was created if applicable.'),
  chart: ChartDataSchema.optional().nullable().describe('If the user asks for a visualization or a chart, generate the data for it here.'),
});
export type WalletInsightsChatOutput = z.infer<typeof WalletInsightsChatOutputSchema>;

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


export async function walletInsightsChat(input: WalletInsightsChatInput): Promise<WalletInsightsChatOutput> {
  return walletInsightsChatFlow(input);
}

const systemPrompt = `You are BitSleuth, a helpful AI assistant and expert Bitcoin security analyst. Your primary role is to answer questions based on the wallet data provided.

Analyze the user's request and the provided wallet data to give a helpful and accurate response. If the user asks for a chart or visualization, you must generate the chart data in the \`chart\` field.

**CRITICAL RULE:** Your \`answer\` field MUST ONLY contain human-readable Markdown text. NEVER include JSON code blocks, chart data, or placeholders like "[Chart would be displayed here]" within the 'answer' field. All chart data MUST go into the separate 'chart' field of the JSON output.

### Enhanced Bitcoin Analysis Tools

You have access to advanced Bitcoin analysis tools powered by Gemini 2.0 Flash Lite:

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

Use these tools when users ask for:
- "Detailed transaction analysis"
- "Privacy analysis" 
- "Transaction insights"
- "Address analysis"
- "Privacy assessment"
- "Address insights"

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
      const history = (input.history || []).map(item => ({
          role: item.role === 'assistant' ? 'model' : 'user',
          content: [{text: item.content}]
      })).filter(item => item.role !== 'system') as ({role: 'user' | 'model', content: {text: string}[]}[]);

      const userPrompt = `
Analyze my request based on our conversation history and the wallet data below.

**My Wallet Data:**
\`\`\`json
${input.walletData}
\`\`\`

**My Question:**
${input.question}
      `;


      const { output } = await ai.generate({
          system: systemPrompt,
          prompt: userPrompt,
          history: history,
          output: {
              schema: WalletInsightsChatOutputSchema,
          },
          tools: [securityRecommendationsTool, enhancedTransactionAnalysisTool, enhancedAddressAnalysisTool],
      });

      if (!output) {
        return {
          answer:
            "I'm sorry, I encountered an issue and couldn't generate a response. Please try rephrasing your question.",
          chart: null,
        };
      }
      return output;
    } catch (e) {
      console.error("Error in walletInsightsChatFlow:", e);
      return {
          answer: "I'm sorry, I encountered an error while processing your request. The AI model may have returned an invalid response. Please try again.",
          chart: null,
      };
    }
  }
);
