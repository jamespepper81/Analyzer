# Copilot Instructions for BitSleuth Analyzer

## Project Overview
BitSleuth is an AI-powered Bitcoin wallet insights app built with Next.js 16 (App Router), React 19, and TypeScript. It analyzes Bitcoin XPUBs for transaction history, security posture, address reuse, and trends, and provides AI-driven insights via chat and proactive recommendations.

## Architecture & Key Components
- **App Structure**: Uses Next.js App Router. Main routes are under `src/app/(app)/` (dashboard, transactions, analysis, security, report, coin-control, discover, mempool, market, chat, feedback).
- **AI Flows**: Located in `src/ai/flows/`. Genkit (Google AI/Gemini) powers AI features. Entry point: `src/ai/dev.ts`.
- **UI Components**: Shared UI in `src/components/ui/` (shadcn/ui pattern). Theming via `theme-provider.tsx` and `theme-toggle.tsx`.
- **Context & Hooks**: App-wide state in `src/contexts/`, custom hooks in `src/hooks/`.
- **Data Services**: Bitcoin/blockchain data in `src/lib/` and `src/services/`. Integrates Blockstream, mempool.space, blockchain.info, CoinGecko, Alternative.me, CryptoCompare News, Google Sheets.

## Developer Workflows
- **Start App**: `npm run dev` (Next.js web app at `localhost:3000`)
- **Start AI Flows**: `npm run genkit:dev` (AI backend, required for chat/insights)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Environment**: Set up `.env` with required Firebase and optional API keys. See `README.md` for details.

## Project-Specific Patterns
- **XPUB Handling**: XPUBs are stored locally in-browser. Nostr integration allows encrypted sync; nsec never leaves device.
- **Security & Privacy**: Only public blockchain data is analyzed. No private keys are used or requested.
- **Feedback**: Feedback flow can export to Google Sheets if configured.
- **Error Handling**: Missing API keys show non-blocking warnings in-app; see troubleshooting in `README.md`.

## Integration Points
- **Genkit AI**: All AI flows use Genkit with Google AI (Gemini). See `src/ai/flows/` for flow definitions.
- **External APIs**: Market/news data via CoinGecko, CryptoCompare, Google Sheets.
- **Firebase**: Used for client-side analytics only.

## Conventions
- **TypeScript throughout**; strict typechecking enforced.
- **Tailwind CSS for styling**; custom themes via context.
- **Component-first UI**; prefer shadcn/ui patterns for new components.
- **Environment variables**: All sensitive keys in `.env.local` or `.env`.
- **Documentation**: All markdown documentation files must be stored in the `docs/` folder (exceptions: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `AGENTS.md`, and files in `.github/`).

## Examples
- To add a new AI flow: create a file in `src/ai/flows/`, register in `src/ai/dev.ts`.
- To add a new dashboard widget: create a component in `src/components/ui/`, import in `src/app/(app)/dashboard/`.
