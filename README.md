# BitSleuth — AI Bitcoin Wallet Analyzer

BitSleuth is an AI-powered Bitcoin wallet insights app. Enter a Bitcoin XPUB to analyze transactions, security posture, address reuse, dust, and trends. Explore mempool data, market stats, and get proactive security recommendations and chat-based insights.

![BitSleuth](public/1200x630.png)

- **🌐 Production:** [https://app.bitsleuth.ai](https://app.bitsleuth.ai)

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

## Performance Optimizations

BitSleuth uses advanced caching and optimization techniques for lightning-fast wallet operations:

- **Smart Address Discovery**: XPUB prefix inference (zpub→native, ypub→nested, xpub→legacy) with fast path that checks only the inferred type first, reducing API calls by 80-95%
- **Wallet Snapshot Caching**: Blockchain data cached for 5 minutes, enabling instant wallet switches
- **In-Flight Deduplication**: Prevents duplicate API calls when multiple requests occur simultaneously
- **Lightweight Address Discovery**: Uses stats endpoints (~500 bytes) instead of full transaction lists (~50KB+), reducing data transfer by 95%
- **Separated Data Assembly**: Currency-independent blockchain data cached separately from real-time pricing

**Performance Impact**:
- Initial wallet load: ~30-60 seconds (optimized from ~10 minutes with multi-address-type support)
- Currency switch: <1 second (cached snapshot + fresh pricing)
- Wallet switch (cached): <1 second
- 600x+ faster switching compared to full reload
- 80-95% fewer blockchain API calls during login (from ~250 to ~40-50 calls for typical wallets)

See [Wallet Snapshot Caching Documentation](docs/wallet-snapshot-caching.md) for technical details.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui components, Lucide icons
- Genkit with OpenAI (GPT-4.1 Mini) for AI flows
- Firebase (client-side analytics only)
- Bitcoin data sources: Blockstream, mempool.space, blockchain.info, CoinGecko, Alternative.me
- Optional integrations: CryptoCompare News API, Google Sheets API

## Quick start

Prerequisites:
- Node.js 20+ (required)
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

For VS Code users, install the recommended "Tailwind CSS IntelliSense" extension for autocomplete and class previews. The Tailwind CSS language server is included in `devDependencies` and installed automatically. See [Tailwind Setup Guide](docs/TAILWIND_SETUP.md) for details.

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

# OpenAI / Genkit (required for AI features)
OPENAI_API_KEY=

# Market / price data (optional; used when present)
COINGECKO_API_KEY=

# News (optional; enables real news fetch)
CRYPTOCOMPARE_API_KEY=

# Feedback export to Google Sheets (optional)
GOOGLE_SHEETS_ID_FEEDBACK=
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

## AI Development Tools

BitSleuth includes Model Context Protocol (MCP) support for enhanced AI-assisted development:

- **next-devtools-mcp**: Real-time Next.js diagnostics, errors, and automated upgrades
- **chrome-devtools-mcp**: Browser automation and testing with Playwright

MCP enables AI coding assistants (GitHub Copilot, Claude, Cursor) to interact directly with your running Next.js app for context-aware suggestions and debugging.

See [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for configuration details and usage guide.

## Community & Support

- **Discussions**: [GitHub Discussions](https://github.com/BitSleuthAI/Analyzer/discussions) — ask questions, share ideas, and connect with other users
- **Bug Reports**: [Open an issue](https://github.com/BitSleuthAI/Analyzer/issues/new?template=bug_report.md)
- **Feature Requests**: [Request a feature](https://github.com/BitSleuthAI/Analyzer/issues/new?template=feature_request.md)
- **Security**: Report vulnerabilities privately to `security@bitsleuth.ai` (see [SECURITY.md](SECURITY.md))

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to BitSleuth, including documentation standards and file organization.

### Documentation Guidelines

**All markdown documentation files must be stored in the `docs/` folder.**

Exceptions: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `AGENTS.md`, and files in `.github/`.

---

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).

Copyright (c) 2025 BitSleuth.

---

Built with ❤️ by BitSleuth.
