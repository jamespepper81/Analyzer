# BitSleuth — AI Bitcoin Wallet Analyzer

BitSleuth is an AI-powered Bitcoin wallet insights app. Enter a Bitcoin XPUB to analyze transactions, security posture, address reuse, dust, and trends. Explore mempool data, market stats, and get proactive security recommendations and chat-based insights.

![BitSleuth](public/1200x630.png)

## Features

- Dashboard overview of balance, security score, and recent activity
- Transaction explorer with labeling and historical price context
- Analysis charts: balance history, volume, inflow/outflow, performance
- Security insights: address reuse, dust detection, opsec risk level, tips
- AI chat for wallet summaries, explanations, and proactive insights
- Discover: lookup any address/tx and view details
- Mempool: live fees, pending blocks, and network stats
- Market: price, charts, candlesticks, and Fear & Greed Index
- Coin Control (UTXO view) and beta reports (P&L / tax summary)
- Nostr integration: optional login and encrypted XPUB sync across devices
- Feedback flow with optional Google Sheets export

## Tech stack

- Next.js 15 (App Router), React 18, TypeScript
- Tailwind CSS, shadcn/ui components, Lucide icons
- Genkit with Google AI (Gemini) for AI flows
- Firebase (client-side analytics only)
- Bitcoin data sources: Blockstream, mempool.space, blockchain.info, CoinGecko, Alternative.me
- Optional integrations: CryptoCompare News API, Google Sheets API

## Quick start

Prerequisites:
- Node.js 18+ (or 20+ recommended)
- npm (or pnpm/yarn)

Install and run:

```bash
npm install
# Start the web app
npm run dev

# In a separate terminal, start AI flows (optional during development)
npm run genkit:dev
```

App runs on `http://localhost:3000` by default.

## Environment variables

Create a `.env` file in the project root. Only the public Firebase keys are required for analytics; other keys enable additional features.

```env
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Firebase (analytics; all are public client config)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Google AI / Genkit (required for AI features)
GOOGLE_GENAI_API_KEY=

# Market / price data (optional; used when present)
COINGECKO_API_KEY=

# News (optional; enables real news fetch)
CRYPTOCOMPARE_API_KEY=

# Feedback export to Google Sheets (optional)
GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_CLIENT_EMAIL=
# Wrap the private key in double quotes in .env; newlines may be escaped ("\n")
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notes:
- Without `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, analytics will be disabled and a non-blocking warning will appear in-app.
- `COINGECKO_API_KEY` is optional and, when present, is added to CoinGecko requests.
- `CRYPTOCOMPARE_API_KEY` enables the News panel with live data; otherwise a helpful message is shown.
- Google Sheets export is optional; if unset, feedback stays local and the app continues to work.

## Scripts

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
  "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts"
}
```

## Key routes

- `/` connect XPUB or login with Nostr
- `/dashboard` overview and summaries
- `/transactions` list, `/transactions/[id]` details
- `/analysis` charts and trends
- `/security` recommendations and privacy analysis
- `/report` beta reports
- `/coin-control` UTXO view
- `/discover` address/tx lookup
- `/mempool` network fee/mempool status
- `/market` price, charts, F&G index
- `/chat` AI assistant
- `/feedback` send feedback

## Data and privacy

- XPUBs are stored locally in the browser. Nostr (optional) can encrypt and sync your XPUB list; your nsec never leaves your device.
- Only public blockchain data is analyzed. No private keys are used or requested.

## Deployment

- Standard Next.js deployment (Vercel, Cloud Run, etc.).
- Ensure required environment variables are set in your hosting platform.

## Troubleshooting

- Missing analytics warning: set `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` and restart dev server.
- News panel shows configuration message: set `CRYPTOCOMPARE_API_KEY`.
- Google Sheets export fails: verify sheet ID, service account email access, and private key formatting (preserve newlines).

---

## License

**PROPRIETARY SOFTWARE** - Copyright (c) 2025 BitSleuth. All rights reserved.

This software is the proprietary and confidential information of BitSleuth. 
It is provided solely for use by BitSleuth and its authorized personnel. 
This software is not intended for public distribution or open source use.

For licensing inquiries, contact: legal@bitsleuth.ai

---

Built with ❤️ by BitSleuth.
