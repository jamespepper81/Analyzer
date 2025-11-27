# AGENTS.md

## Project overview

**BitSleuth** is an AI-powered Bitcoin wallet analyzer that provides comprehensive insights, security analysis, and investment intelligence for Bitcoin holders. The application analyzes Bitcoin wallets using extended public keys (XPUBs) without requiring private keys, ensuring user privacy and security.

**Live App:** https://app.bitsleuth.ai

**Key Capabilities:**
- Analyze Bitcoin wallet transactions, balances, and activity patterns
- Provide AI-driven security recommendations and privacy assessments
- Generate transaction insights with historical price context
- Real-time mempool and market data integration
- Interactive AI chat for wallet queries and insights
- UTXO management and coin control features
- Optional Nostr integration for encrypted cross-device XPUB sync

## Tech stack

### Core Framework
- **Next.js 15** (App Router) - React-based web framework
- **React 18** - UI library with TypeScript
- **TypeScript** - Strict type checking throughout

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable component library (Radix UI primitives)
- **Lucide Icons** - Icon system
- **next-themes** - Theme management (dark/light mode)

### AI & Intelligence
- **Genkit** - Google's AI framework for flow orchestration
- **OpenAI (GPT-4.1 Mini)** - Large language model for insights and chat
- AI flows located in `src/ai/flows/`

### Bitcoin & Blockchain
- **bitcoinjs-lib** - Bitcoin protocol operations
- **bip32** - HD wallet derivation
- **secp256k1** - Elliptic curve cryptography
- **Blockstream API** - Primary blockchain data source
- **mempool.space API** - Mempool and transaction data
- **blockchain.info API** - Additional blockchain data

### Data & APIs
- **Firebase** - Client-side analytics only (no auth or database)
- **CoinGecko API** - Bitcoin price and market data
- **Alternative.me** - Fear & Greed Index
- **CryptoCompare API** - News and market data
- **Google Sheets API** - Optional feedback export
- **Nostr Protocol** - Decentralized identity and encrypted sync

### Additional Libraries
- **recharts** - Data visualization and charts
- **react-force-graph-2d** - Blockchain transaction graphs
- **react-markdown** - Markdown rendering for AI responses
- **date-fns** - Date manipulation and formatting
- **zod** - Schema validation

## Project structure

```
Analyzer/
├── src/
│   ├── ai/                      # AI flows and Genkit configuration
│   │   ├── flows/               # Individual AI flow definitions
│   │   │   ├── enhanced-bitcoin-analysis.ts
│   │   │   ├── wallet-insights-chat.ts
│   │   │   ├── security-recommendations.ts
│   │   │   ├── proactive-insights.ts
│   │   │   ├── proactive-suggestions.ts
│   │   │   ├── summarize-transaction.ts
│   │   │   ├── summarize-address.ts
│   │   │   ├── tax-report-flow.ts
│   │   │   ├── feedback-flow.ts
│   │   │   └── news-flow.ts
│   │   ├── dev.ts               # AI flow development entry point
│   │   └── genkit.ts            # Genkit configuration
│   ├── app/                     # Next.js App Router pages
│   │   ├── (app)/               # Authenticated app routes
│   │   │   ├── dashboard/       # Main dashboard view
│   │   │   ├── transactions/    # Transaction list and details
│   │   │   ├── analysis/        # Charts and analytics
│   │   │   ├── security/        # Security insights
│   │   │   ├── chat/            # AI chat interface
│   │   │   ├── coin-control/    # UTXO management
│   │   │   ├── discover/        # Address/tx lookup
│   │   │   ├── mempool/         # Network stats
│   │   │   ├── market/          # Price and market data
│   │   │   ├── report/          # Tax/P&L reports (beta)
│   │   │   └── feedback/        # User feedback
│   │   ├── landing/             # Landing page
│   │   ├── about/               # About page
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   └── ui/                  # Reusable UI components (shadcn/ui)
│   ├── contexts/
│   │   └── wallet-context.tsx   # Global wallet state management
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-analytics.ts     # Firebase analytics wrapper
│   │   ├── use-toast.ts         # Toast notifications
│   │   ├── use-mobile.tsx       # Mobile detection
│   │   └── use-chunk-retry.ts   # Data fetching with retry
│   ├── lib/                     # Core utilities and services
│   │   ├── blockchain.ts        # Main blockchain data service
│   │   ├── blockchain-api.ts    # API client for blockchain data
│   │   ├── market.ts            # Market data service
│   │   ├── mempool.ts           # Mempool data service
│   │   ├── newsService.ts       # News API integration
│   │   ├── firebase.ts          # Firebase initialization
│   │   ├── bitcoin-init.ts      # Bitcoin library initialization
│   │   ├── cache-utils.ts       # Client-side caching
│   │   ├── chunk-retry-service.ts # Chunked data fetching with retry
│   │   ├── exchange-labels.ts   # Known exchange addresses
│   │   ├── chainabuse.ts        # ChainAbuse API integration
│   │   ├── logger.ts            # Logging utility
│   │   ├── utils.ts             # General utility functions
│   │   ├── data.ts              # Data constants
│   │   └── types.ts             # Shared TypeScript types
│   └── services/
│       └── googleSheets.ts      # Google Sheets API integration
├── docs/
│   ├── PRD.md                   # Product Requirements Document
│   ├── todo.md                  # Development roadmap
│   ├── SEO_STRATEGY.md          # SEO guidelines
│   └── ai-training-content.md   # AI training content and keywords
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot instructions
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── next.config.ts               # Next.js configuration
├── AGENTS.md                    # This file
├── CONTRIBUTING.md              # Contribution guidelines
└── README.md                    # User-facing documentation
```

## Development setup

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm, pnpm, or yarn package manager
- Git for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/BitSleuthAI/Analyzer.git
cd Analyzer

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
# Edit .env with your API keys (see Environment Variables section)
```

### Environment variables

Create a `.env` file in the project root with the following variables:

```env
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Firebase (required for analytics)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# OpenAI / Genkit (required for AI features)
OPENAI_API_KEY=your_openai_api_key

# Optional APIs (enhance functionality when provided)
COINGECKO_API_KEY=your_coingecko_api_key
CRYPTOCOMPARE_API_KEY=your_cryptocompare_api_key

# Google Sheets (optional - for feedback export)
GOOGLE_SHEETS_ID=your_google_sheet_id
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- Firebase keys are public client configuration and safe to expose in the browser
- Without Firebase keys, analytics will be disabled with a non-blocking warning
- `OPENAI_API_KEY` is required for AI chat and insights features
- Optional API keys enable enhanced features but are not required for core functionality
- Google Sheets private key should be wrapped in quotes with preserved newlines

### Running the application

```bash
# Start the Next.js development server
npm run dev
# App runs at http://localhost:3000

# In a separate terminal, start the AI backend (required for chat/insights)
npm run genkit:dev
# AI flows run at http://localhost:3400

# Or use watch mode for auto-reload
npm run genkit:watch
```

### Available scripts

```bash
npm run dev          # Start Next.js dev server with Turbopack
npm run dev:clean    # Clean .next and start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run genkit:dev   # Start Genkit AI flows
npm run genkit:watch # Start Genkit with auto-reload
```

## Core features

### 1. Wallet Analysis
- **XPUB Connection**: Securely analyze wallets using extended public keys
- **Balance Tracking**: Real-time balance and transaction history
- **Address Derivation**: Automatic derivation of receive/change addresses
- **Multi-Account Support**: Manage multiple XPUBs locally

### 2. AI-Powered Insights
- **Chat Interface**: Natural language queries about wallet data
- **Proactive Suggestions**: Automated security and optimization recommendations
- **Transaction Summaries**: AI-generated explanations of transactions
- **Security Analysis**: AI-evaluated risk assessments and privacy scores

### 3. Security & Privacy
- **Address Reuse Detection**: Identify privacy-compromising patterns
- **Dust Analysis**: Detect and analyze dust attacks
- **OPSEC Scoring**: Overall privacy and security risk assessment
- **Security Recommendations**: Actionable tips for improving wallet security

### 4. Transaction Management
- **Transaction Explorer**: Detailed view of all wallet transactions
- **Labeling System**: Add custom labels to transactions and addresses
- **Historical Pricing**: View transaction values at historical BTC prices
- **Search & Filter**: Find specific transactions quickly

### 5. Analytics & Charts
- **Balance History**: Track wallet balance over time
- **Volume Analysis**: Inflow/outflow patterns and trends
- **Performance Metrics**: Investment returns and gain/loss tracking
- **Interactive Charts**: Zoom, filter, and explore data visually

### 6. Coin Control (UTXO Management)
- **UTXO Listing**: View all unspent transaction outputs
- **Coin Selection**: Optimize transaction fees and privacy
- **UTXO History**: Track UTXO creation and consolidation

### 7. Discovery Tools
- **Address Lookup**: Explore any Bitcoin address on the blockchain
- **Transaction Details**: Deep dive into individual transactions
- **Blockchain Graph**: Visual representation of transaction flows

### 8. Market Intelligence
- **Real-time Pricing**: Current Bitcoin price in multiple currencies
- **Price Charts**: Historical price data with candlesticks
- **Fear & Greed Index**: Market sentiment indicator
- **News Feed**: Latest Bitcoin and crypto news (with API key)

### 9. Mempool Monitoring
- **Live Fee Estimates**: Current network fee recommendations
- **Pending Blocks**: Visualization of mempool transactions
- **Network Stats**: Hash rate, difficulty, and block times

### 10. Reporting (Beta)
- **P&L Reports**: Profit and loss calculations
- **Tax Summaries**: Transaction data for tax reporting
- **Export Options**: Download reports in various formats

### 11. Nostr Integration
- **Decentralized Login**: Optional Nostr identity
- **Encrypted Sync**: Securely sync XPUBs across devices
- **Privacy-Focused**: Your nsec never leaves your device

## AI flows

All AI capabilities are implemented as Genkit flows in `src/ai/flows/`:

### `wallet-insights-chat.ts`
Main AI chat interface with multiple tools:
- Get wallet overview and statistics
- Analyze transaction patterns
- Provide security recommendations
- Calculate investment performance
- Estimate network fees
- Answer Bitcoin-related questions

### `enhanced-bitcoin-analysis.ts`
Comprehensive wallet analysis including:
- Balance and transaction history
- Security posture evaluation
- Address reuse detection
- Investment performance metrics

### `security-recommendations.ts`
Generate personalized security advice based on:
- Wallet usage patterns
- Privacy practices
- UTXO management
- Address handling

### `proactive-insights.ts`
Automated insights that run periodically:
- Unusual activity detection
- Fee optimization opportunities
- Privacy improvement suggestions

### `proactive-suggestions.ts`
Context-aware recommendations based on wallet state:
- Actionable suggestions for users
- Optimization tips for transactions
- Security best practices

### `summarize-transaction.ts`
AI-generated transaction summaries:
- Human-readable explanations
- Context about parties involved
- Risk assessment

### `summarize-address.ts`
Address analysis and labeling:
- Known exchange/service detection
- Activity pattern analysis
- Risk scoring

### `tax-report-flow.ts`
Generate tax reports (beta):
- Calculate capital gains/losses
- Generate transaction summaries
- Export tax data

### `feedback-flow.ts`
Process user feedback:
- Categorize feedback
- Export to Google Sheets
- Generate responses

### `news-flow.ts`
Fetch and summarize crypto news:
- Latest Bitcoin news
- Market sentiment analysis
- Relevant article extraction

## Data services

### Blockchain Data (`src/lib/blockchain.ts`, `src/lib/blockchain-api.ts`)
- Fetches transaction and address data from multiple sources
- Implements caching and retry logic
- Handles rate limiting and failover
- Primary sources: Blockstream, mempool.space, blockchain.info

### Market Data (`src/lib/market.ts`)
- Real-time Bitcoin pricing from CoinGecko
- Historical price data for transaction context
- Multi-currency support (USD, EUR, GBP)
- Fear & Greed Index from Alternative.me

### Mempool Service (`src/lib/mempool.ts`)
- Live network fee estimates
- Mempool statistics and trends
- Block height and confirmation times

### News Service (`src/lib/newsService.ts`)
- Fetches latest crypto news from CryptoCompare
- Filters Bitcoin-relevant articles
- Caches results for performance

### Chunk Retry Service (`src/lib/chunk-retry-service.ts`)
- Implements chunked data fetching with retry logic
- Handles large address derivation batches
- Manages concurrent request limits

## State management

### Wallet Context (`src/contexts/wallet-context.tsx`)
Central state management for wallet data:
- Connected XPUBs and wallet metadata
- Derived addresses (receive and change)
- Transaction history and balances
- Security scores and insights
- User preferences and settings
- Nostr integration state

**Key Functions:**
- `connectWallet(xpub)` - Add a new wallet
- `disconnectWallet(id)` - Remove a wallet
- `refreshWalletData()` - Reload blockchain data
- `updateSecurityScore()` - Recalculate security metrics
- `labelTransaction()` - Add custom labels

## Testing

### Type Checking
```bash
npm run typecheck
```
Validates TypeScript types across the entire codebase.

### Linting
```bash
npm run lint
```
Runs ESLint to check code style and catch common errors.

### Manual Testing
Due to the nature of blockchain interactions and AI features, manual testing is essential:

1. **Wallet Connection**: Test with various XPUB formats
2. **Transaction Loading**: Verify data accuracy against blockchain explorers
3. **AI Features**: Test chat responses and proactive insights
4. **Security Analysis**: Validate detection of address reuse and dust
5. **Market Data**: Confirm real-time pricing updates
6. **Cross-Browser**: Test on Chrome, Firefox, Safari

## Security considerations

### Privacy-First Design
- **No Private Keys**: Only XPUBs are used; never request or store private keys
- **Local Storage**: XPUBs stored in browser localStorage (encrypted with Nostr if enabled)
- **No Backend Storage**: No central database of user wallets
- **Public Data Only**: All analysis uses publicly available blockchain data

### Nostr Integration
- **Optional**: Nostr login is completely optional
- **Encrypted Sync**: XPUBs encrypted before syncing via Nostr
- **Local Keys**: Nostr private keys (nsec) never leave the device
- **Decentralized**: No central authentication server

### API Key Security
- **Environment Variables**: All API keys stored in `.env` (never committed)
- **Server-Side Only**: Sensitive keys only used in server components/API routes
- **Public Keys**: Firebase config is public (client-side) by design

### Content Security
- **No User-Generated Scripts**: All user input sanitized
- **Markdown Rendering**: Uses react-markdown with safe defaults
- **XSS Prevention**: Input validation on all user data

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard under Project Settings > Environment Variables.

### Docker
```bash
# Build image
docker build -t bitsleuth-analyzer .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your_key \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your_key \
  bitsleuth-analyzer
```

### Google Cloud Run
See `apphosting.dev.yaml` and `apphosting.prd.yaml` for Firebase App Hosting configuration.

### Build Optimization
- Next.js automatic code splitting
- Image optimization with next/image
- Font optimization with next/font
- Static page generation where possible
- Dynamic imports for heavy components

## Contributing

For detailed contribution guidelines, including documentation standards and file organization, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Quick Reference

#### Code Style
- **TypeScript**: Strict mode enabled, all files must be typed
- **Formatting**: Follow existing code style (Prettier-compatible)
- **Components**: Use functional components with hooks
- **File Naming**: kebab-case for files, PascalCase for components

#### Documentation
- **All markdown documentation files must be stored in the `docs/` folder**
- Exceptions: README.md, LICENSE, CONTRIBUTING.md, AGENTS.md, and files in `.github/`

#### Adding New Features

**Adding a New AI Flow:**
1. Create file in `src/ai/flows/your-flow.ts`
2. Define flow with Genkit using `defineFlow()`
3. Register in `src/ai/dev.ts`
4. Test with `npm run genkit:dev`

**Adding a New Page:**
1. Create route in `src/app/(app)/your-page/page.tsx`
2. Add navigation link in layout
3. Update route types if needed
4. Test navigation and data loading

**Adding a New Component:**
1. Create in `src/components/ui/your-component.tsx`
2. Follow shadcn/ui patterns for consistency
3. Export from index file if reusable
4. Add proper TypeScript types

#### Pull Request Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with clear commits
4. Run `npm run typecheck` and `npm run lint`
5. Test thoroughly in development
6. Push to your fork
7. Open a Pull Request with description of changes

## Troubleshooting

### Common Issues

**Analytics Warning in Browser**
- Ensure `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` are set
- Restart dev server after adding environment variables

**AI Features Not Working**
- Verify `OPENAI_API_KEY` is set
- Ensure `npm run genkit:dev` is running
- Check Genkit console for errors at http://localhost:3400

**News Panel Shows "Configure API Key"**
- Set `CRYPTOCOMPARE_API_KEY` in `.env`
- Restart dev server

**Google Sheets Export Fails**
- Verify `GOOGLE_SHEETS_ID` is correct
- Ensure service account has edit access to the sheet
- Check `GOOGLE_SHEETS_PRIVATE_KEY` preserves newlines (use quotes)

**Transaction Data Not Loading**
- Check browser console for API errors
- Verify XPUB format is correct
- Try different blockchain data source in settings

**Build Errors**
- Clear `.next` folder: `npm run dev:clean`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js version is 18 or higher

## Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Bitcoin Developer Guide](https://developer.bitcoin.org/devguide/)

### APIs
- [Blockstream API](https://github.com/Blockstream/esplora/blob/master/API.md)
- [mempool.space API](https://mempool.space/docs/api)
- [CoinGecko API](https://docs.coingecko.com/reference/introduction)
- [Nostr Protocol](https://nostr.com/)

### Internal Documentation
- [Product Requirements Document](docs/PRD.md) - Detailed feature specifications
- [SEO Strategy](docs/SEO_STRATEGY.md) - SEO guidelines and optimization
- [TODO List](docs/todo.md) - Development roadmap and tasks

## License

**PROPRIETARY SOFTWARE** - Copyright (c) 2025 BitSleuth. All rights reserved.

This software is proprietary and confidential information of BitSleuth. It is provided solely for use by BitSleuth and its authorized personnel. This software is not intended for public distribution or open source use.

For licensing inquiries, contact: legal@bitsleuth.ai

---

**Built with ❤️ by BitSleuth**

For questions, issues, or feature requests, please contact the development team.
