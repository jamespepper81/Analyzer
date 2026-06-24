// src/ai/genkit.ts
import { genkit } from 'genkit';
import openAI from '@genkit-ai/compat-oai';

// Check for API key and warn if missing (don't throw to avoid build/import failures)
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn(
    'OPENAI_API_KEY is missing. AI features will not work.'
  );
}

// OpenAI configuration - uses OPENAI_API_KEY from environment
export const ai = genkit({
  plugins: [
    openAI({
      name: 'openai',
      apiKey,
    }),
  ],
  model: 'openai/gpt-4.1-mini', // Use GPT-4.1 Mini for wallet analysis
});
