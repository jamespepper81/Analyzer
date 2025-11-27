import appRoute from '@genkit-ai/next';

import { walletInsightsChatFlow } from '@/ai/flows/wallet-insights-chat';

export const POST = appRoute(walletInsightsChatFlow);
