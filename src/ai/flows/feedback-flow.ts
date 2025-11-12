'use server';
/**
 * @fileOverview An AI flow for processing and saving user feedback.
 *
 * - submitFeedback - A function that handles the feedback submission process.
 * - FeedbackInput - The input type for the function.
 * - FeedbackOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { appendToSheet } from '@/services/googleSheets';
import { z } from 'zod';
import { headers } from 'next/headers';

// Define the input schema for the feedback flow
const FeedbackInputSchema = z.object({
  feedback: z.string().describe('The raw feedback text from the user.'),
  userContext: z.string().optional().describe('Optional JSON string with user context like current page or wallet summary.'),
});
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

// This schema is what the AI will generate
const ProcessedFeedbackSchema = z.object({
    category: z.enum(['Bug Report', 'Feature Request', 'UI/UX Feedback', 'General Praise', 'Other']).describe('The category of the feedback.'),
    summary: z.string().describe('A concise one-sentence summary of the feedback.'),
    sentiment: z.enum(['Positive', 'Negative', 'Neutral']).describe('The sentiment of the feedback.'),
});

// This is the final output schema, which includes the original text and IP address
const FeedbackOutputSchema = ProcessedFeedbackSchema.extend({
    originalFeedback: z.string().describe('The original, unmodified feedback from the user.'),
    ipAddress: z.string().optional().describe("The user's IP address."),
});
export type FeedbackOutput = z.infer<typeof FeedbackOutputSchema>;


/**
 * Processes user feedback using an AI model and sends it to Google Sheets.
 * @param input The user's feedback.
 * @returns A structured version of the feedback including the user's IP address.
 */
export async function submitFeedback(input: FeedbackInput): Promise<FeedbackOutput> {
  const processedFeedback = await feedbackProcessingFlow(input);
  
  // Get IP address from headers
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') ?? 'IP Not Found';
  
  const feedbackWithIp: FeedbackOutput = {
      ...processedFeedback,
      ipAddress,
  };

  // The Google Sheets integration is optional. We'll try to save the data,
  // but we won't block the user's experience if it fails.
  appendToSheet(feedbackWithIp).catch(error => {
    // Log the error for debugging purposes on the server, but don't re-throw it.
    console.error("Optional: Failed to write to Google Sheet. This does not affect the user.", error);
  });
  
  return feedbackWithIp;
}

const feedbackProcessorPrompt = ai.definePrompt({
    name: 'feedbackProcessorPrompt',
    input: { schema: FeedbackInputSchema },
    output: { schema: ProcessedFeedbackSchema }, // The AI only generates the processed part
    prompt: `You are an AI assistant responsible for processing user feedback for a Bitcoin wallet analysis app called BitSleuth.
    
    Your task is to analyze the user's feedback, categorize it, summarize it, and determine its sentiment.
    
    User's feedback:
    "{{{feedback}}}"
    
    User context (current page, etc.):
    "{{{userContext}}}"

    Please process this feedback and return a structured JSON object with three fields: 'category', 'summary', and 'sentiment'.
    - Classify the feedback into one of the following categories: 'Bug Report', 'Feature Request', 'UI/UX Feedback', 'General Praise', 'Other'.
    - Write a one-sentence summary of the core issue or suggestion.
    - Determine if the sentiment is 'Positive', 'Negative', 'Neutral'.
    `,
});


const feedbackProcessingFlow = ai.defineFlow(
  {
    name: 'feedbackProcessingFlow',
    inputSchema: FeedbackInputSchema,
    // The flow itself doesn't know about the IP, so we return a partial object
    // that will be combined with the IP later.
    outputSchema: ProcessedFeedbackSchema.extend({
        originalFeedback: z.string(),
    }),
  },
  async (input) => {
    const { output } = await feedbackProcessorPrompt(input);
    
    // Combine the AI's processed output with the original feedback
    return {
        ...output!,
        originalFeedback: input.feedback,
    };
  }
);
