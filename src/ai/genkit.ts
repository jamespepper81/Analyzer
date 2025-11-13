// src/ai/genkit.ts
import {genkit} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
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
const apiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_GENAI_API_KEY is not set. AI features will not work.');
}

// Google AI configuration - uses GOOGLE_GENAI_API_KEY from environment
export const ai = genkit({
  plugins: [googleAI({
    apiKey: apiKey || 'missing-api-key', // Explicitly set API key with fallback
  })],
  model: 'googleai/gemini-2.0-flash-lite', // Use stable model name
});
