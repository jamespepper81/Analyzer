import {genkit} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Initialize Firebase telemetry
enableFirebaseTelemetry();

export const ai = genkit({
  plugins: [googleAI({
    apiVersion: 'v1beta',
  })],
  model: 'googleai/gemini-1.5-flash-latest',
});
