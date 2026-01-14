
import { config } from 'dotenv';
config({ quiet: true });

import '@/ai/flows/wallet-insights-chat.ts';
import '@/ai/flows/proactive-insights.ts';
import '@/ai/flows/proactive-suggestions.ts';
import '@/ai/flows/security-recommendations.ts';
import '@/ai/flows/summarize-address.ts';
import '@/ai/flows/summarize-transaction.ts';
import '@/ai/flows/news-flow.ts';
import '@/ai/flows/tax-report-flow.ts';
