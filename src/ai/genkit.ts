// src/ai/genkit.ts
import {genkit} from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Initialize Firebase telemetry
enableFirebaseTelemetry();

// Google AI configuration - uses GOOGLE_GENAI_API_KEY from environment
export const ai = genkit({
  plugins: [vertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: 'us-central1',
  })],
  model: 'gemini-2.5-flash',
});
