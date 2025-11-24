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

// Check for API key
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_CHATGPT_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY is not set. AI features will not work.');
}

// OpenAI configuration - uses OPENAI_API_KEY (with OPENAI_CHATGPT_API_KEY as a fallback) from environment
export const ai = genkit({
  plugins: [
    openAI({
      name: 'openai',
      apiKey: apiKey || 'missing-api-key', // Explicitly set API key with fallback
    }),
  ],
  model: 'openai/gpt-4o-mini', // Use GPT-4o Mini for wallet analysis
});
