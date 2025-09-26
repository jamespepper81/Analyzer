// src/ai/genkit.ts
import {genkit} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Initialize Firebase telemetry only in production
if (process.env.NODE_ENV === 'production') {
  enableFirebaseTelemetry();
}

// Google AI configuration - uses GOOGLE_GENAI_API_KEY from environment
export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY, // Explicitly set API key
//    config: {
//      thinkingConfig: {
//        thinkingBudget: 0, // Disables thinking
//      },
//    },
  })],
  model: 'googleai/gemini-2.0-flash-lite', // Use stable model name
});
