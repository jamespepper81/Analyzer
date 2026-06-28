
import { config } from 'dotenv';
config({ quiet: true });

import '@/ai/flows/wallet-insights-chat';
import '@/ai/flows/proactive-insights';
import '@/ai/flows/proactive-suggestions';
import '@/ai/flows/security-recommendations';
import '@/ai/flows/summarize-address';
import '@/ai/flows/summarize-transaction';
import '@/ai/flows/news-flow';
import '@/ai/flows/tax-report-flow';
