// src/ai/genkit.ts
import {genkit} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Initialize Firebase telemetry
enableFirebaseTelemetry();

// Google AI configuration - uses GOOGLE_GENAI_API_KEY from environment
export const ai = genkit({
  plugins: [googleAI({
    apiVersion: 'v1beta', // Google AI API version, not an API key
  })],
  model: 'googleai/gemini-1.5-flash', // Model identifier, not an API key
});
