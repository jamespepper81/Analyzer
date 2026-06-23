# CLAUDE.md

> Essential context for AI assistants working with the BitSleuth codebase.

## Project Overview

**BitSleuth** is an AI-powered Bitcoin wallet analyzer that provides comprehensive insights, security analysis, and investment intelligence. It analyzes Bitcoin wallets using extended public keys (XPUBs) without requiring private keys.

**Live App:** https://app.bitsleuth.ai

**Key Features:**
- XPUB-based wallet analysis (no private keys needed)
- AI-driven chat, security recommendations, and proactive insights
- Transaction history with historical price context
- UTXO management and coin control
- Market data, mempool monitoring, and network stats
- Optional Nostr integration for encrypted cross-device sync
- Tax reporting and P&L calculations (beta)

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run genkit:dev       # Start AI flows backend (http://localhost:3400) - required for chat/insights
npm run genkit:watch     # Start AI flows with auto-reload

# Quality checks
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint
npm run test             # Run unit tests (vitest)
npm run test:e2e         # Run E2E tests (Playwright)

# Build
npm run build            # Production build
npm run build:clean      # Clean .next cache and rebuild
npm run dev:clean        # Clean .next cache and start dev
```

### Development Workflow

1. Start the web app: `npm run dev`
2. In a separate terminal, start AI flows: `npm run genkit:dev`
3. Access the app at http://localhost:3000
4. Genkit UI is available at http://localhost:3400

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript 5.9 |
| **Styling** | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide Icons |
| **AI** | Genkit 1.24+, OpenAI GPT-4.1 Mini |
| **Bitcoin** | bitcoinjs-lib, bip32, secp256k1 |
| **Data APIs** | Blockstream, mempool.space, CoinGecko, Google Analytics (GA4) |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Build** | Turbopack |

---

## Project Structure

```
src/
├── ai/                          # AI/ML flows (Genkit)
│   ├── flows/                   # 12 AI flow definitions
│   │   ├── wallet-insights-chat.ts     # Main chat interface
│   │   ├── enhanced-bitcoin-analysis.ts # Comprehensive wallet analysis
│   │   ├── security-recommendations.ts  # Security advice
│   │   ├── proactive-insights.ts        # Automated insights
│   │   ├── proactive-suggestions.ts     # Context-aware suggestions
│   │   ├── summarize-transaction.ts     # Transaction explanations
│   │   ├── summarize-address.ts         # Address analysis
│   │   ├── tax-report-flow.ts           # Tax reporting
│   │   ├── enhanced-tax-report-flow.ts  # Enhanced tax reports
│   │   ├── feedback-flow.ts             # Feedback processing
│   │   └── news-flow.ts                 # News fetching
│   ├── dev.ts                   # AI development entry point
│   └── genkit.ts                # Genkit configuration
│
├── app/                         # Next.js App Router
│   ├── (app)/                   # Protected app routes
│   │   ├── dashboard/           # Main wallet overview
│   │   ├── transactions/        # Transaction list/details
│   │   ├── analysis/            # Charts and analytics
│   │   ├── security/            # Security insights
│   │   ├── chat/                # AI chat interface
│   │   ├── coin-control/        # UTXO management
│   │   ├── discover/            # Address/tx lookup
│   │   ├── mempool/             # Network statistics
│   │   ├── market/              # Price and market data
│   │   ├── report/              # Tax/P&L reports
│   │   ├── feedback/            # User feedback
│   │   ├── address/             # Address details
│   │   └── block/               # Block explorer
│   ├── api/                     # API routes
│   │   ├── chat/route.ts        # Chat endpoint
│   │   ├── tax-report/route.ts  # Tax report generation
│   │   └── feedback/route.ts    # Feedback export
│   ├── landing/                 # Landing page
│   ├── about/                   # About page
│   └── layout.tsx               # Root layout
│
├── components/
│   └── ui/                      # shadcn/ui components (30+)
│
├── contexts/
│   └── wallet-context.tsx       # Global wallet state
│
├── hooks/
│   ├── use-analytics.ts         # Google Analytics (GA4) event tracking
│   ├── use-chunk-retry.ts       # Chunked data fetching
│   ├── use-mobile.tsx           # Mobile detection
│   └── use-toast.ts             # Toast notifications
│
├── lib/                         # Core utilities and services
│   ├── blockchain.ts            # Main blockchain data service (~1200 lines)
│   ├── blockchain-api.ts        # API client for blockchain data
│   ├── market.ts                # Market data service (CoinGecko)
│   ├── mempool.ts               # Mempool data service
│   ├── newsService.ts           # News API (CryptoCompare)
│   ├── bitcoin-init.ts          # Bitcoin library setup
│   ├── cache-utils.ts           # Client-side caching
│   ├── chunk-retry-service.ts   # Chunked retry logic
│   ├── exchange-labels.ts       # Known exchange addresses
│   ├── chainabuse.ts            # ChainAbuse API
│   ├── logger.ts                # Logging utility
│   ├── utils.ts                 # General utilities (cn, getAddressType)
│   ├── types.ts                 # TypeScript type definitions
│   └── wallet-snapshot-cache.ts # Wallet caching
│
└── services/
    └── googleSheets.ts          # Google Sheets integration

tests/                           # Test files
├── e2e/                         # Playwright E2E tests
├── *.test.ts                    # Vitest unit tests

docs/                            # All documentation (40+ files)
├── PRD.md                       # Product Requirements
├── TESTING_GUIDE.md             # Testing guidelines
├── PERFORMANCE_OPTIMIZATION.md  # Performance docs
└── ...
```

---

## Code Conventions

### File Naming
- **Files**: kebab-case (e.g., `wallet-context.tsx`, `blockchain-api.ts`)
- **Components**: PascalCase (e.g., `DashboardPage`, `WalletCard`)
- **Constants**: UPPERCASE_SNAKE_CASE

### TypeScript
- Strict mode enabled throughout
- Centralized types in `src/lib/types.ts`
- Named exports preferred; default exports for pages/API routes
- `any` is allowed but discouraged

### React Patterns
- Functional components with hooks only
- `"use client"` directive for client components
- `"use server"` directive for server actions
- Use `cn()` from `src/lib/utils.ts` for className merging

### Styling
- Tailwind CSS with utility-first approach
- CSS variables for theming (defined in `src/app/globals.css`)
- Dark mode via `next-themes` with class strategy
- Follow shadcn/ui patterns for new components

### State Management
- React Context for global state (`src/contexts/wallet-context.tsx`)
- Custom hooks in `src/hooks/` for reusable logic
- Local state with `useState`/`useReducer` when appropriate

### API Routes
- Located in `src/app/api/[feature]/route.ts`
- Use Zod schemas for request validation
- Genkit integration via `appRoute()` from `@genkit-ai/next`

---

## Adding New Features

### Adding a New AI Flow

1. Create file in `src/ai/flows/your-flow.ts`
2. Define flow with Genkit:
   ```typescript
   import { defineFlow } from 'genkit';
   import { z } from 'zod';

   export const yourFlow = defineFlow(
     { name: 'yourFlow', inputSchema: z.object({...}), outputSchema: z.object({...}) },
     async (input) => { /* implementation */ }
   );
   ```
3. Register in `src/ai/dev.ts`
4. Test with `npm run genkit:dev` (UI at http://localhost:3400)

### Adding a New Page

1. Create route: `src/app/(app)/your-page/page.tsx`
2. Mark client components with `"use client"` if needed
3. Add navigation link in layout if appropriate
4. Use existing UI components from `src/components/ui/`

### Adding a New Component

1. Create in `src/components/ui/your-component.tsx`
2. Follow shadcn/ui patterns
3. Use `cn()` for class merging
4. Add proper TypeScript types
5. Export for reuse

---

## Testing

### Unit Tests (Vitest)
```bash
npm run test                    # Run all unit tests
```
- Test files: `tests/*.test.ts`
- Key test files:
  - `address-discovery-unit.test.ts` - Address derivation
  - `ai-output-parsing.test.ts` - AI response parsing
  - `tax-calculations.test.ts` - Tax calculations
  - `wallet-snapshot-cache.test.ts` - Caching behavior

### E2E Tests (Playwright)
```bash
npm run test:e2e                # Run E2E tests
npm run test:e2e:headed         # Run with browser UI
npm run test:e2e:debug          # Debug mode
```
- Test files: `tests/e2e/`
- Auto-starts dev server
- Screenshots on failure

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

---

## Security Guidelines

### Privacy-First Design
- **No private keys**: Only XPUBs are used; never request or store private keys
- **Local storage**: XPUBs stored in browser localStorage
- **Public data only**: All analysis uses publicly available blockchain data
- **No backend storage**: No central database of user wallets

### Secrets Management
- Never hardcode secrets in source files
- Use environment variables for all credentials
- Refer to `.rules` file for security policies
- Only use obvious placeholders: `<YOUR_API_KEY>`, `<YOUR_TOKEN>`

### Input Validation
- Validate all user input with Zod schemas
- Sanitize data before display
- Use react-markdown with safe defaults

---

## Environment Variables

Required variables in `.env`:

```env
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google Analytics (GA4 measurement ID, required for analytics)
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# OpenAI (required for AI features)
OPENAI_API_KEY=...

# Optional APIs
COINGECKO_API_KEY=...
CRYPTOCOMPARE_API_KEY=...
GOOGLE_SHEETS_ID=...
GOOGLE_SHEETS_CLIENT_EMAIL=...
GOOGLE_SHEETS_PRIVATE_KEY=...
```

**Notes:**
- The GA4 measurement ID is public client config (safe for browser)
- Missing optional keys show non-blocking warnings
- Copy `.env.example` as starting point

---

## Documentation Rules

### File Placement
- **All markdown docs go in `docs/` folder**
- Exceptions at root: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`
- GitHub-specific files go in `.github/`

### Naming
- UPPERCASE for important docs: `README.md`, `CONTRIBUTING.md`
- kebab-case for general docs: `api-guide.md`, `deployment.md`

---

## Common Tasks

### Debugging AI Flows
1. Start Genkit: `npm run genkit:dev`
2. Open http://localhost:3400
3. Use the Genkit UI to test flows with sample inputs

### Checking Blockchain Data Sources
- Primary: Blockstream API (`src/lib/blockchain-api.ts`)
- Fallback: mempool.space, blockchain.info
- Rate limiting handled in service layer

### Working with Wallet Context
```typescript
import { useWallet } from '@/contexts/wallet-context';

const {
  wallets,           // Connected wallets
  activeWallet,      // Currently selected wallet
  connectWallet,     // Add new wallet
  disconnectWallet,  // Remove wallet
  refreshWalletData  // Reload data
} = useWallet();
```

### Adding UI Components (shadcn/ui style)
```typescript
// src/components/ui/your-component.tsx
import { cn } from "@/lib/utils";

interface YourComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
}

export function YourComponent({ className, variant = "default", ...props }: YourComponentProps) {
  return (
    <div
      className={cn(
        "base-styles",
        variant === "outline" && "outline-styles",
        className
      )}
      {...props}
    />
  );
}
```

---

## Performance Patterns

The codebase implements several performance optimizations:

- **XPUB prefix inference**: 80-95% fewer API calls for address discovery
- **Wallet snapshot cache**: 5-minute cache for instant wallet switching
- **In-flight deduplication**: Prevents duplicate concurrent requests
- **Chunk retry service**: Resilient data fetching with retry logic
- **Progressive loading**: Assets load in chunks

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/contexts/wallet-context.tsx` | Central wallet state management |
| `src/lib/blockchain.ts` | Main blockchain data service |
| `src/lib/types.ts` | TypeScript type definitions |
| `src/ai/flows/wallet-insights-chat.ts` | Main AI chat flow |
| `src/app/globals.css` | Global styles and CSS variables |
| `next.config.ts` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `.rules` | Security guardrails and policies |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI features not working | Ensure `npm run genkit:dev` is running and `OPENAI_API_KEY` is set |
| Analytics warning | Set `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` |
| Build errors | Run `npm run dev:clean` or delete `node_modules` and reinstall |
| Type errors | Run `npm run typecheck` for details |
| News not loading | Set `CRYPTOCOMPARE_API_KEY` |

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Genkit Docs](https://firebase.google.com/docs/genkit)
- [shadcn/ui](https://ui.shadcn.com)
- [Blockstream API](https://github.com/Blockstream/esplora/blob/master/API.md)
- [mempool.space API](https://mempool.space/docs/api)

---

*Last updated: January 2026*
