# Changelog

All notable changes to BitSleuth - AI Bitcoin Wallet Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-06-12

### Added

#### AI Chat Experience
- Real-time streaming display for AI chat responses with smart JSON extraction
- Clickable follow-up suggestions appended to AI chat responses
- Fixed chatbot displaying raw JSON and duplicate bubbles during streaming

#### Wallet Connection & Login Flow
- Dual-login fast dashboard flow with premium loading UX
- Enhanced wallet connection loading screen with step-by-step progress display
- Friendly UI for empty wallets with graceful handling of price fetch failures
- Playwright E2E tests for the login flow with timing assertions

#### Open-Source Release
- Repository prepared for open-source release under the GNU AGPL v3 license
- Rewritten `SECURITY.md` with project-specific security policy
- Community & Support section in README, expanded docs index, and status/tech-stack badges
- Automated GitHub Release workflow that publishes releases from changelog entries on tag push
- Comprehensive `CLAUDE.md` and React best practices guide for AI assistants

### Performance

- Public pages, static assets and app shells are now edge-cacheable
- Reduced self-inflicted Cloud Run request volume
- Faster XPUB connect: per-address fetch concurrency is now bounded, with hardened progress reporting

### Fixed

- Market page error caused by a trailing slash in the Fear & Greed API path
- Update-checker state update guarded against running after component unmount
- Server/client boundary error: removed `'use server'` directive from `blockchain.ts`
- Logger initialization now uses runtime environment checks instead of module-level setup
- Null safety bugs across multiple services and BTC price typing in wallet data
- Warning alert text readability in light mode
- Mobile sidebar height, landscape layout, and navigation improvements
- Build error from `next/font/google` resolved by switching to a CSS font stack
- Migrated lucide-react icon usages to canonical 1.x names

### Security

- Hardened SSRF protections: all external fetches routed through `fetchJson` with trusted-origin allowlists and sanitized address/txid/currency inputs (resolves CodeQL alerts)
- Fixed externally-controlled format string findings
- Added explicit permissions to GitHub Actions workflows
- Patched uuid bounds-check and PostCSS XSS advisories via npm overrides

### Changed

#### Dependency Updates
- **lucide-react**: 0.563.0 → 1.17.0
- **eslint**: 9 → 10 with Next.js 16 compatibility
- **Next.js**: bumped within the 16.1.x line alongside the nextjs dependency group
- **Genkit**: dependency group updated (8 packages)
- **recharts**: 3.7.0 → 3.8.1, **firebase**: 12.9.0 → 12.13.0, **jspdf**: 4.0.0 → 4.2.1
- Tailwind, Bitcoin, forms, and development dependency groups updated
- Dependabot switched to a monthly cadence for npm updates

## [0.2.0] - 2026-01-16

### Major Framework Upgrades

#### Next.js 16 Migration
- **Upgraded from Next.js 15.5.9 to 16.1.1** with Turbopack as the default bundler
- Migrated from webpack to Turbopack configuration with native WASM support
- Removed 145+ lines of custom webpack configuration
- Added `turbopackUseSystemTlsCerts: true` to fix Google Fonts TLS errors during build
- Updated experimental flags for Next.js 16 compatibility
- Minimum Node.js version now 20.9.0 (enforced via `engines` field in package.json)

#### React 19 Update
- **Upgraded from React 18 to React 19.2.0**
- Enhanced concurrent rendering capabilities
- Improved server components implementation
- Updated all React-related type definitions

#### Tailwind CSS 4 Migration
- **Upgraded from Tailwind CSS 3.4.19 to 4.1.18**
- Migrated to CSS-first configuration with `@theme` directive
- Replaced PostCSS autoprefixer with `@tailwindcss/postcss@^4.1.18`
- Converted all 44 custom colors, 3 border radius tokens, and 2 animation tokens to new `@theme` syntax
- Migrated accordion animations to CSS `@keyframes`
- Removed `tailwindcss-animate` plugin (functionality now in CSS)
- Preserved all HSL color variables for runtime theme switching

### Dependency Updates

#### Core Dependencies
- **firebase**: 11.9.1 → 12.7.0
- **recharts**: 2.15.1 → 3.6.0 (complete rewrite with new state management)
- **react-markdown**: 9.0.1 → 10.1.0
- **date-fns**: 3.6.0 → 4.1.0 (added time zone support)
- **react-is**: Added ^19.0.0 (new peer dependency for recharts v3)
- **zod**: Added explicit dependency for schema validation

#### Bitcoin Libraries
- **bip32**: 4.0.0 → 5.0.0
- **bitcoinjs-lib**: 6.1.7 → 7.0.1
- **bs58check**: 3.0.1 → 4.0.0
- **ecpair**: 2.1.0 → 3.0.0
- Migrated from Node.js `Buffer` to standard `Uint8Array` for public key handling
- Removed `@types/bs58check` (v4 includes native TypeScript types)
- Updated Bitcoin address generation functions for Uint8Array compatibility

### AI & Backend Improvements

#### AI Flow Enhancements
- Centralized AI output schemas and parsing logic in new `ai-output-parsers.ts`
- Added robust Zod schemas for security recommendations and proactive insights
- Enhanced error handling with detailed logging of model responses
- Improved resilience to malformed AI outputs (returns empty results instead of errors)
- Added schema validation utilities (`assertGenkitSchema`, safe serialization)
- Standardized error handling across all AI flows

#### Zod v4 Compatibility
- Added npm override to force Zod v4.3.5 across all dependencies
- Updated error message syntax from `{ error: ... }` to `{ message: ... }`
- Added explicit type annotations for enum literals to satisfy Zod v4 validation
- Fixed BigInt to Number conversions for Bitcoin transaction values

### User Interface Enhancements

#### Sidebar Improvements
- Refactored sidebar layout with CSS grid for better alignment
- Standardized icon sizing (consistent 24px across expanded/collapsed states)
- Introduced CSS variables for sidebar dimensions (`--sidebar-width-expanded`, `--sidebar-width-collapsed`, `--sidebar-offset`)
- Fixed z-index layering (header now z-30, sidebar z-20) for proper toggle button accessibility
- Added smooth transitions for padding and opacity during collapse/expand
- Improved sidebar spacer logic for better visual consistency

#### Alert & Notification Updates
- Improved AI Chat alert readability in light mode
- Updated color scheme: `orange-50` → `amber-100` background, `amber-600/50` border
- Changed icon color from `red-600` → `amber-700` for cohesive design
- Enhanced text contrast with `amber-950` title and `amber-900` description

#### Chart Components
- Updated chart components for recharts v3 compatibility
- Added new props to `ChartTooltipContent`: `labelFormatter`, `formatter`, `color`, `labelClassName`, `itemStyle`
- Fixed tooltip payload type changes (`activeLabel` now `string | number`)
- Updated `ChartLegendContent` with additional flexibility props

### Bug Fixes & Code Quality

#### TypeScript & Linting
- Resolved all ESLint warnings and TypeScript compilation errors
- Fixed optional property access with nullish coalescing operators
- Corrected Tailwind `darkMode` config from array to string syntax
- Updated ESLint config to use named export instead of anonymous default
- Added missing `totalValue` property to test transaction fixtures
- Fixed type assertions for Genkit AI response types

#### Performance & Reliability
- Fixed race conditions in `MarkdownHooks`
- Added `fallback` prop to `MarkdownHooks` for better error handling
- Improved `onMouseMove` handler to check event existence before accessing properties
- Fixed Treemap rendering to return empty fragment instead of null

### Documentation Updates

#### Version References
- Updated all documentation for Next.js 16, React 19, Tailwind CSS 4, and Node.js 20+
- Documented Turbopack improvements and new configuration approach
- Added comprehensive migration guides:
  - `docs/BITCOIN_DEPENDENCY_UPDATES.md`: Buffer → Uint8Array migration
  - `docs/TAILWIND_SETUP.md`: Updated for Tailwind CSS 4
- Updated skill guides and agent instructions with new framework versions
- Clarified Node.js 20+ requirement across all setup documentation

### Configuration Changes

#### Build System
- Updated lint script from `next lint` to `eslint .` for direct control
- Added explicit `engines` field requiring Node.js >=20.0.0
- Simplified PostCSS configuration for Tailwind CSS 4
- Removed legacy experimental flags (`webpackBuildWorker`, `optimizeCss`)

#### Security & Headers
- Preserved all security headers (CSP, X-Frame-Options, etc.)
- Maintained image optimization settings (webp, avif)
- Kept cache control headers for static assets

### Breaking Changes

- **Node.js 20+ Required**: Projects using Node.js 18 or earlier must upgrade
- **Webpack Removed**: Custom webpack configurations no longer supported; use Turbopack or `--webpack` flag
- **Buffer → Uint8Array**: Bitcoin library functions now use Uint8Array instead of Node.js Buffer
- **Zod v4**: Error message syntax changed from `error` to `message` property
- **recharts v3**: Tooltip payload types and internal APIs changed

### Migration Notes

#### For Developers
1. Ensure Node.js 20+ is installed
2. Run `npm install` to update all dependencies
3. If using Bitcoin libraries directly, update Buffer usage to Uint8Array
4. Update any Zod schema error messages to use `message` instead of `error`
5. For WASM support, Turbopack handles it natively (no custom config needed)

#### Rollback Options
- Use `next dev --webpack` or `next build --webpack` to fallback to webpack if Turbopack issues arise
- All previous functionality preserved; changes are primarily framework upgrades

---

## [0.1.0] - 2025-11-06

### Initial Release - Complete Bitcoin Wallet Analysis Platform

BitSleuth is an AI-powered Bitcoin wallet insights application built with Next.js 16, React 19, and TypeScript. It provides comprehensive security analysis, transaction insights, and AI-driven recommendations for Bitcoin wallets using only public blockchain data (XPUB keys).

---

## Core Features

### 🔐 Wallet Connection & Management
- **XPUB-Based Analysis**: Secure wallet analysis using extended public keys only
- **No Private Keys Required**: All analysis performed on public blockchain data
- **Local Storage**: XPUBs stored locally in browser for privacy
- **Multi-Wallet Support**: Analyze multiple wallets simultaneously
- **Nostr Integration**: Optional encrypted XPUB sync across devices using Nostr protocol
  - Secure nsec key management (never leaves device)
  - Encrypted storage and synchronization
  - Cross-device wallet access

### 📊 Dashboard & Overview
- **Comprehensive Dashboard** (`src/app/(app)/dashboard/`)
  - Real-time balance display with multi-currency support (USD, EUR, GBP)
  - Security score and risk assessment
  - Recent activity timeline
  - Quick stats: transaction count, address count, UTXO count
  - Performance metrics and trends
  - Proactive AI-powered insights and recommendations

### 💳 Transaction Analysis
- **Transaction Explorer** (`src/app/(app)/transactions/`)
  - Complete transaction history with pagination
  - Transaction labeling and categorization
  - Historical price context for each transaction
  - Inflow/outflow visualization
  - Fee analysis and efficiency metrics
  - Date and amount filtering
  
- **Transaction Details** (`src/app/(app)/transactions/[id]/`)
  - Detailed transaction breakdown
  - Input/output analysis
  - Fee rate and confirmation time
  - Block height and timestamp
  - AI-powered transaction summaries
  - Related addresses and patterns

### 📈 Analysis & Charts
- **Analysis Dashboard** (`src/app/(app)/analysis/`)
  - Balance history over time
  - Transaction volume charts
  - Inflow vs outflow analysis
  - Performance tracking with ROI calculations
  - Investment timeline visualization
  - Cost basis and gains/losses
  - Interactive recharts visualizations
  - Export capabilities for data

### 🔒 Security & Privacy
- **Security Analysis** (`src/app/(app)/security/`)
  - **Address Reuse Detection**: Identifies privacy-compromising address reuse
  - **Dust Attack Analysis**: Detects potential dust attacks and tracking attempts
  - **OPSEC Risk Assessment**: Overall operational security evaluation
  - **Privacy Score**: Comprehensive privacy rating (0-100)
  - **Security Recommendations**: AI-generated actionable security tips
  - **Best Practices**: Educational content on Bitcoin privacy
  - **Risk Level Indicators**: Visual risk assessment (low/medium/high/critical)
  - **Pattern Analysis**: Identifies suspicious transaction patterns

### 🤖 AI-Powered Features
- **AI Chat Interface** (`src/app/(app)/chat/`)
  - Natural language wallet queries
  - Contextual conversation about wallet data
  - Proactive insights and recommendations
  - Transaction and address explanations
  - Security advice and best practices
  - Powered by OpenAI (GPT-4.1 Mini) via Genkit framework
  
- **AI Flows** (`src/ai/flows/`)
  - `wallet-insights-chat.ts`: Main chat interface with comprehensive tools
  - `enhanced-bitcoin-analysis.ts`: Advanced transaction and address analysis
  - `security-recommendations.ts`: Automated security assessment
  - `proactive-insights.ts`: Proactive wallet monitoring and alerts
  - `proactive-suggestions.ts`: Smart recommendations based on wallet state
  - `summarize-address.ts`: AI-generated address summaries
  - `summarize-transaction.ts`: AI-generated transaction summaries
  - `tax-report-flow.ts`: Tax reporting and P&L calculations
  - `feedback-flow.ts`: User feedback collection and processing
  - `news-flow.ts`: Bitcoin news integration

### 🔍 Discovery & Exploration
- **Address Explorer** (`src/app/(app)/address/[address]/`)
  - Look up any Bitcoin address
  - Transaction history for external addresses
  - Balance and statistics
  - QR code generation
  - Address labeling and notes
  
- **Discover Interface** (`src/app/(app)/discover/`)
  - Multi-purpose blockchain explorer
  - Address lookup with transaction history
  - Transaction lookup with details
  - Block explorer
  - Interactive blockchain visualization
  - Graph-based address relationship mapping
  - Force-directed graph with react-force-graph-2d

- **Block Explorer** (`src/app/(app)/block/[id]/`)
  - Block details and statistics
  - Transaction list within blocks
  - Mining information
  - Block header data

### 📡 Network & Market Data
- **Mempool Monitor** (`src/app/(app)/mempool/`)
  - Real-time mempool statistics
  - Current fee recommendations (high/medium/low priority)
  - Pending blocks visualization
  - Network congestion indicators
  - Transaction count and size metrics
  - Block prediction and timing
  
- **Market Dashboard** (`src/app/(app)/market/`)
  - Real-time Bitcoin price (USD, EUR, GBP)
  - Interactive price charts with multiple timeframes
  - Candlestick charts for technical analysis
  - 24h volume and market cap
  - Fear & Greed Index from Alternative.me
  - Historical price data
  - Market sentiment indicators

### 💰 Coin Control & UTXO Management
- **Coin Control Interface** (`src/app/(app)/coin-control/`)
  - Comprehensive UTXO listing
  - UTXO selection and filtering
  - Fee optimization suggestions
  - Privacy-preserving coin selection strategies
  - UTXO consolidation recommendations
  - Amount and age-based filtering
  - Transaction history for each UTXO

### 📋 Reports & Analytics
- **Report Generation** (`src/app/(app)/report/`)
  - Profit & Loss (P&L) reports
  - Tax summary generation (beta)
  - Cost basis calculations (FIFO, LIFO, specific ID)
  - Capital gains/losses tracking
  - Historical performance reports
  - Export to various formats
  - Customizable date ranges

### 💬 Feedback System
- **Feedback Collection** (`src/app/(app)/feedback/`)
  - In-app feedback form
  - Feature requests and bug reports
  - User satisfaction ratings
  - Google Sheets integration for feedback export
  - Privacy-respecting feedback collection

---

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 16 with App Router
- **React**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with custom theming
- **Components**: shadcn/ui component library
- **Icons**: Lucide React icons
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API (`src/contexts/wallet-context.tsx`)
- **Theme**: Dark/light mode with next-themes
- **Carousel**: Embla Carousel React

### AI & Backend
- **AI Framework**: Google Genkit (v1.24.x)
- **AI Model**: OpenAI GPT-4.1 Mini via @genkit-ai/compat-oai
- **AI Tools**: Custom Bitcoin analysis tools and function calling
- **Context Caching**: 1-hour TTL for improved performance
- **Structured Output**: Zod schemas for type-safe AI responses

### Bitcoin & Blockchain
- **Bitcoin Libraries**:
  - `bitcoinjs-lib`: Core Bitcoin functionality
  - `bip32`: HD wallet derivation
  - `@bitcoinerlab/secp256k1`: Cryptographic operations
  - `bs58check`: Base58 encoding/decoding
  - `ecpair`: Bitcoin key pair handling
  
- **Data Sources** (`src/lib/blockchain-api.ts`, `src/lib/blockchain.ts`):
  - **Blockstream API**: Primary blockchain data source
  - **mempool.space**: Mempool and fee data
  - **blockchain.info**: Alternative blockchain data
  - **ChainAbuse API**: Address reputation checking
  
- **Caching** (`src/lib/cache-utils.ts`):
  - Smart caching for blockchain data
  - Chunk retry service for reliability

### External Integrations
- **Market Data** (`src/lib/market.ts`):
  - CoinGecko API: Price and market data
  - Alternative.me: Fear & Greed Index
  
- **News** (`src/lib/newsService.ts`):
  - CryptoCompare News API: Bitcoin news aggregation
  
- **Analytics** (`src/lib/firebase.ts`):
  - Firebase Analytics (client-side only)
  - Privacy-focused usage tracking
  
- **Data Export** (`src/services/googleSheets.ts`):
  - Google Sheets API: Feedback export
  - Google Auth Library for service account authentication

### Authentication & Privacy
- **Nostr Protocol** (`nostr-tools`):
  - Decentralized identity
  - Encrypted XPUB synchronization
  - NIP-04 encryption
  - Relay network integration

### UI Components (`src/components/ui/`)
Comprehensive component library including:
- **Layout**: Card, Sheet, Sidebar, Tabs, Collapsible
- **Navigation**: Menubar, Dropdown Menu
- **Forms**: Input, Textarea, Select, Checkbox, Radio Group, Slider, Switch, Calendar
- **Feedback**: Alert, Alert Dialog, Toast, Progress, Skeleton
- **Data Display**: Badge, Avatar, Table, Separator, Scroll Area
- **Charts**: AI Chart, Chart (with Recharts integration)
- **Interactive**: Button, Dialog, Popover, Tooltip, Carousel
- **Custom**: Explorer Node (blockchain visualization), Loader

### Context & State Management
- **Wallet Context** (`src/contexts/wallet-context.tsx`):
  - Centralized wallet state management
  - XPUB storage and retrieval
  - Transaction and address data
  - Balance and statistics
  - Nostr integration state

### Hooks (`src/hooks/`)
- `use-analytics.ts`: Analytics tracking
- `use-mobile.tsx`: Mobile device detection
- `use-toast.ts`: Toast notification system
- `use-chunk-retry.ts`: Retry logic for chunked operations

### Utilities (`src/lib/`)
- `bitcoin-init.ts`: Bitcoin library initialization
- `logger.ts`: Application logging
- `utils.ts`: General utility functions
- `types.ts`: TypeScript type definitions
- `data.ts`: Static data and constants
- `exchange-labels.ts`: Known exchange address labels

---

## Development Features

### Developer Experience
- **TypeScript**: Strict type checking throughout
- **ESLint**: Code quality enforcement
- **Type Safety**: Comprehensive TypeScript coverage
- **Hot Reload**: Fast development with Next.js dev server
- **AI Development Server**: Separate Genkit dev server for AI flows

### Scripts
```json
{
  "dev": "next dev",
  "dev:clean": "rm -rf .next && next dev",
  "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
  "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts",
  "build": "next build",
  "build:clean": "rm -rf .next && next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit"
}
```

### Environment Configuration
- **Required Variables**:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase analytics
  - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`: Firebase tracking
  - `OPENAI_API_KEY`: OpenAI (GPT-4.1 Mini) for AI features
  
- **Optional Variables**:
  - `COINGECKO_API_KEY`: Enhanced market data
  - `CRYPTOCOMPARE_API_KEY`: Live news feed
  - `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`: Feedback export

### Configuration Files
- `next.config.ts`: Next.js configuration with custom webpack settings
- `tailwind.config.ts`: Tailwind CSS theme and plugin configuration
- `tsconfig.json`: TypeScript compiler options
- `components.json`: shadcn/ui configuration
- `postcss.config.mjs`: PostCSS configuration
- `.gitignore`: Git ignore patterns
- `.idx/dev.nix`: IDX environment configuration

---

## Documentation

### Project Documentation (`docs/`)
- `PRD.md`: Product Requirements Document with features, goals, and roadmap
- `README.md`: Documentation overview
- `SEO_STRATEGY.md`: SEO and marketing strategy
- `ai-training-content.md`: AI training and optimization content
- `todo.md`: Development roadmap and enhancement plans (GPT-4.1 Mini)

### Root Documentation
- `README.md`: Main project documentation and quick start guide
- `CONTRIBUTING.md`: Contribution guidelines and documentation standards
- `AGENTS.md`: Agent overview and project structure
- `LICENSE`: GNU AGPL v3.0 license
- `CHANGELOG.md`: This file - comprehensive project history

---

## Deployment & Hosting

### Deployment Configurations
- `apphosting.dev.yaml`: Development environment configuration
- `apphosting.prd.yaml`: Production environment configuration

### Hosting Platforms
- Optimized for Vercel deployment
- Google Cloud Run compatible
- Firebase App Hosting support
- Standard Next.js deployment options

---

## Security & Privacy

### Security Measures
- **No Private Key Access**: Only XPUB (public keys) are used
- **Client-Side Storage**: All data stored locally in browser
- **Encrypted Sync**: Optional Nostr-based encrypted synchronization
- **No Server Storage**: No user data stored on backend servers
- **Public Data Only**: Analysis limited to public blockchain data

### Privacy Features
- **Local-First**: Data stays in user's browser
- **Optional Analytics**: Firebase analytics can be disabled
- **No Account Required**: Can be used without any registration
- **Nostr Privacy**: Optional decentralized identity
- **No Tracking**: Minimal tracking, privacy-focused design

---

## Known Limitations & Future Enhancements

### Current Limitations
- Tax reporting features are in beta
- Some API integrations require API keys
- Performance may vary with very large wallets (1000+ transactions)

### Planned Enhancements (from `docs/todo.md`)

#### Phase 2: Multimodal Capabilities
- Multimodal input processing for blockchain visualizations
- Batch processing for high-volume analysis
- Advanced function calling for blockchain APIs

#### Phase 3: Advanced Features
- Real-time blockchain data integration
- Advanced privacy analysis with clustering
- Performance optimizations

#### Phase 4: AI/ML Integration
- Machine learning for pattern recognition
- Predictive transaction analysis
- Advanced interactive visualizations

---

## Dependencies

### Core Dependencies
- **Next.js**: 16.1.1
- **React**: 19.2.0
- **TypeScript**: 5.9.3
- **Tailwind CSS**: 4.1.18
- **Node.js**: >=20.0.0 (required)

### AI & Backend
- **Genkit**: 1.24.0
- **@genkit-ai/compat-oai**: ^1.24.0
- **@genkit-ai/firebase**: ^1.24.0
- **@genkit-ai/next**: ^1.24.0

### Bitcoin Libraries
- **bitcoinjs-lib**: ^6.1.6
- **bip32**: ^4.0.0
- **@bitcoinerlab/secp256k1**: ^1.1.1
- **bs58check**: ^3.0.1
- **ecpair**: ^2.1.0

### UI & Visualization
- **@radix-ui**: Multiple components (v1-2 range)
- **recharts**: ^2.15.1
- **react-force-graph-2d**: ^1.25.4
- **lucide-react**: ^0.475.0
- **next-themes**: ^0.4.3

### Utilities
- **zod**: ^3.24.2
- **date-fns**: ^3.6.0
- **react-hook-form**: ^7.54.2
- **react-markdown**: ^9.0.1

### Development
- **genkit-cli**: 1.15.5
- **@types/node**: ^20
- **@types/react**: ^18

---

## Browser Support
- Modern browsers with JavaScript enabled
- Progressive Web App (PWA) capabilities via manifest.json
- Responsive design for mobile and desktop
- Dark/light theme support

---

## Performance Metrics
- **Analysis Speed**: Complete wallet analysis typically under 30 seconds
- **Caching**: 1-hour TTL context caching for AI operations
- **Chunked Loading**: Retry service for reliable data fetching
- **Optimized Bundles**: Next.js optimization and code splitting

---

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code contribution process
- Documentation standards (all docs in `docs/` folder)
- TypeScript and code style requirements
- Development workflow and testing

---

## Support & Contact
- **Issues**: Report via GitHub Issues
- **Feedback**: Use in-app feedback form
- **Documentation**: Comprehensive docs in `docs/` folder
- **License**: AGPL-3.0-or-later - see [LICENSE](LICENSE)

---

## Acknowledgments
Built with ❤️ by BitSleuth using:
- Next.js and React ecosystem
- OpenAI GPT-4.1 Mini via Genkit
- Bitcoin community libraries
- shadcn/ui components
- Open source dependencies

---

*This changelog provides a comprehensive overview of BitSleuth v0.1.0 for new developers joining the project. For detailed technical documentation, see the `docs/` folder.*
