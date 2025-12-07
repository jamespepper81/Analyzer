// src/ai/genkit.ts
import { genkit } from 'genkit';
import openAI from '@genkit-ai/compat-oai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Initialize Firebase telemetry only in production
if (process.env.NODE_ENV === 'production') {
  try {
    enableFirebaseTelemetry();
  } catch (error) {
    console.warn('Firebase telemetry initialization failed:', error);
  }
}

// Check for API key and fail fast if missing to avoid placeholder configuration
// Check for API key and warn if missing (don't throw to avoid build/import failures)
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_CHATGPT_API_KEY;
if (!apiKey) {
  console.warn(
    'OPENAI_API_KEY (or OPENAI_CHATGPT_API_KEY) is missing. AI features will not work.'
  );
}

// OpenAI configuration - uses OPENAI_API_KEY (with OPENAI_CHATGPT_API_KEY as a fallback) from environment
export const ai = genkit({
  plugins: [
    openAI({
      name: 'openai',
      apiKey,
    }),
  ],
  model: 'openai/gpt-4.1-mini', // Use GPT-4.1 Mini for wallet analysis
});
