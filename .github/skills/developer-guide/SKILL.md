---
name: developer-guide
description: Comprehensive guide to technical skills, knowledge areas, and competencies required for BitSleuth Analyzer development. Covers Next.js 16 App Router, React 19, TypeScript, AI/Genkit integration, Bitcoin protocol expertise, blockchain APIs, and web security best practices for building a professional-grade Bitcoin wallet analysis platform.
---

# Required Skills for BitSleuth Analyzer Development

This document outlines the technical skills, knowledge areas, and competencies required to effectively contribute to the **BitSleuth Analyzer** project—an AI-powered Bitcoin wallet insights platform built with Next.js 16 (App Router), React 19, and TypeScript for web.

**Live App:** https://app.bitsleuth.ai

---

## Table of Contents

1. [Core Web Development Skills](#core-web-development-skills)
2. [Bitcoin & Cryptocurrency Expertise](#bitcoin--cryptocurrency-expertise)
3. [Programming Languages & Frameworks](#programming-languages--frameworks)
4. [AI & Machine Learning Integration](#ai--machine-learning-integration)
5. [Security & Privacy](#security--privacy)
6. [State Management & Architecture](#state-management--architecture)
7. [API Integration & Networking](#api-integration--networking)
8. [UI/UX Development](#uiux-development)
9. [Data Visualization](#data-visualization)
10. [Testing & Quality Assurance](#testing--quality-assurance)
11. [Build Systems & Deployment](#build-systems--deployment)
12. [Development Tools & Workflows](#development-tools--workflows)
13. [Soft Skills & Best Practices](#soft-skills--best-practices)

---

## Core Web Development Skills

### Next.js 16 (Advanced)
- **App Router**: Deep understanding of file-based routing, layouts, and route groups
- **Server Components**: Understanding React Server Components vs Client Components
- **Route Handlers**: Building API routes in `app/api/` directory
- **Metadata API**: SEO optimization with dynamic metadata
- **Loading & Error States**: Implementing `loading.tsx` and `error.tsx` patterns
- **Parallel & Intercepting Routes**: Advanced routing patterns
- **Server Actions**: Form handling and mutations (if applicable)
- **Turbopack**: Development server optimization (Next.js 16 improvements)
- **Configuration**: `next.config.ts` settings and environment variables
- **Static vs Dynamic Rendering**: Understanding when pages are pre-rendered

### React 19 (Advanced)
- **Functional Components**: Using function components exclusively
- **Hooks**: `useState`, `useEffect`, `useContext`, `useMemo`, `useCallback`, `useRef`
- **Custom Hooks**: Creating reusable stateful logic (see `src/hooks/`)
- **Context API**: Global state management (see `src/contexts/wallet-context.tsx`)
- **Render Optimization**: `React.memo`, `useMemo`, `useCallback`
- **Error Boundaries**: Catching and handling component errors
- **Suspense**: Lazy loading and streaming support
- **Concurrent Features**: Understanding React 19's concurrent rendering

### Web Application Architecture
- **File-based Routing**: Next.js App Router patterns (`app/`, `(app)/`, route groups)
- **Service Layer Pattern**: Separation of business logic from UI (see `src/lib/`, `src/services/`)
- **Component Composition**: Reusable, focused components with single responsibility
- **API Design**: RESTful patterns for route handlers
- **Performance Patterns**: Code splitting, lazy loading, caching strategies

---

## Bitcoin & Cryptocurrency Expertise

### Bitcoin Protocol (Intermediate to Advanced)
- **Blockchain Fundamentals**: Blocks, transactions, UTXOs, confirmations, mempool
- **HD Wallets**: Hierarchical Deterministic wallets (BIP32, BIP39, BIP44)
- **Extended Public Keys (XPUB)**: Watch-only wallet analysis without private keys
- **Address Types**: 
  - Legacy (P2PKH) - `1...`
  - SegWit (P2SH-P2WPKH) - `3...`
  - Native SegWit (P2WPKH) - `bc1q...`
  - Taproot (P2TR) - `bc1p...`
- **Transaction Structure**: Inputs, outputs, scripts, confirmations
- **Fee Mechanics**: Fee rate calculation, mempool dynamics
- **Address Derivation**: Deriving addresses from XPUBs for wallet analysis

### BIP Standards (Essential)
- **BIP32**: Hierarchical Deterministic Wallets (key derivation paths)
- **BIP39**: Mnemonic code for generating deterministic keys
- **BIP44**: Multi-account hierarchy for deterministic wallets
- **BIP49**: Derivation scheme for P2WPKH-nested-in-P2SH
- **BIP84**: Derivation scheme for P2WPKH (Native SegWit)
- **BIP141**: Segregated Witness (SegWit) specification
- **BIP173**: Bech32 address format

### Bitcoin Libraries
- **bitcoinjs-lib** (v6.1+): Address derivation and validation
- **bip32**: HD key derivation and extended key management
- **@bitcoinerlab/secp256k1**: Elliptic curve cryptography
- **bs58check**: Base58Check encoding for legacy addresses
- **ecpair**: Elliptic curve pair operations

### UTXO Analysis
- **UTXO Set Understanding**: Unspent transaction output analysis
- **Coin Control Concepts**: Manual UTXO selection for privacy
- **Address Reuse Detection**: Privacy analysis and warnings
- **Dust Analysis**: Detecting uneconomical outputs and dust attacks
- **Transaction Patterns**: Identifying spending patterns and behaviors

### Wallet Security Analysis
- **Privacy Scoring**: Evaluating wallet privacy practices
- **Address Clustering**: Understanding how addresses relate
- **Exchange Detection**: Identifying known exchange addresses
- **Security Recommendations**: Generating actionable security advice

---

## Programming Languages & Frameworks

### TypeScript (Advanced Required)
- **Strict Mode**: Working with strict type checking (enabled in this project)
- **Type Safety**: Avoiding `any`, using proper types and generics
- **Interfaces & Types**: Defining complex data structures (see `src/lib/types.ts`)
- **Type Guards**: Runtime type checking and narrowing
- **Utility Types**: `Partial`, `Pick`, `Omit`, `Required`, etc.
- **Module Systems**: ES modules, imports/exports
- **Async/Await**: Promise-based asynchronous programming
- **Error Handling**: Try/catch, custom error types
- **Zod Schemas**: Runtime validation with Zod

### JavaScript (ES6+)
- **Modern Syntax**: Arrow functions, destructuring, spread/rest operators
- **Promises & Async**: Understanding event loop and concurrency
- **Closures & Scope**: Lexical scoping and closure patterns
- **Array Methods**: `map`, `filter`, `reduce`, `find`, etc.
- **Object Methods**: `Object.keys`, `Object.entries`, etc.
- **Template Literals**: String interpolation
- **Optional Chaining**: `?.` operator
- **Nullish Coalescing**: `??` operator

### React (19.x)
- **Functional Components**: Using function components exclusively
- **Hooks**: All standard hooks plus custom hooks
- **Custom Hooks**: Creating reusable stateful logic
- **Context API**: Global state without prop drilling
- **Render Optimization**: `React.memo`, `useMemo`, `useCallback`
- **Error Boundaries**: Catching and handling component errors
- **Suspense**: Code splitting and lazy loading
- **Server Components**: Understanding RSC boundaries

---

## AI & Machine Learning Integration

### Genkit Framework (Advanced)
- **Flow Definition**: Creating AI flows in `src/ai/flows/`
- **Schema Validation**: Using Zod for input/output schemas
- **Tool Integration**: Building AI tools for wallet analysis
- **Prompt Engineering**: Crafting effective prompts for insights
- **Flow Orchestration**: Chaining multiple AI operations
- **Development Server**: Running `npm run genkit:dev` for testing
- **Firebase Telemetry**: Production monitoring integration

### OpenAI Integration
- **GPT-4.1 Mini**: Primary model for wallet insights and chat
- **API Configuration**: Environment variable management
- **Token Management**: Understanding context limits
- **Response Parsing**: Handling structured AI responses
- **Error Handling**: Graceful degradation when AI unavailable

### AI Flows in This Project
- **wallet-insights-chat.ts**: Interactive AI chat with multiple tools
- **enhanced-bitcoin-analysis.ts**: Comprehensive wallet analysis
- **security-recommendations.ts**: AI-driven security advice
- **proactive-insights.ts**: Automated insight generation
- **proactive-suggestions.ts**: Context-aware recommendations
- **summarize-transaction.ts**: Human-readable transaction explanations
- **summarize-address.ts**: Address analysis and labeling
- **tax-report-flow.ts**: Tax report generation
- **news-flow.ts**: Crypto news fetching and summarization

### AI Best Practices
- **Structured Outputs**: Using Zod schemas for type-safe AI responses
- **Fallback Handling**: Graceful degradation when AI is unavailable
- **Rate Limiting**: Managing API call frequency
- **Caching**: Storing AI responses to reduce costs
- **Streaming**: Real-time response streaming for chat

---

## Security & Privacy

### Web Security Best Practices
- **HTTPS Only**: All API calls over secure connections
- **Environment Variables**: Securing API keys (never client-exposed)
- **Input Validation**: Sanitizing all user inputs
- **XSS Prevention**: React's built-in protection plus additional measures
- **Content Security Policy**: Browser security headers
- **CORS Configuration**: Proper cross-origin settings

### Bitcoin Privacy Principles
- **No Private Keys**: Only XPUBs are used; never request or store private keys
- **Local Storage**: XPUBs stored in browser localStorage
- **Public Data Only**: All analysis uses publicly available blockchain data
- **Address Reuse Warnings**: Educating users about privacy implications
- **No Backend Storage**: No central database of user wallets

### Nostr Integration (Optional)
- **Decentralized Identity**: Optional Nostr login
- **Encrypted Sync**: Securely sync XPUBs across devices
- **Local Keys**: Nostr private keys (nsec) never leave the device
- **Privacy-Focused**: No central authentication server

### Data Handling
- **Client-Side Processing**: All wallet analysis happens in browser
- **No Tracking**: Firebase used only for analytics, not user tracking
- **Minimal Data Collection**: Only aggregate usage metrics
- **Clear Data Options**: Users can clear all local data

---

## State Management & Architecture

### React Context (Primary)
- **WalletContext**: Central state for wallet data (`src/contexts/wallet-context.tsx`)
  - Connected XPUBs and wallet metadata
  - Derived addresses (receive and change)
  - Transaction history and balances
  - Security scores and insights
  - User preferences and settings

### Custom Hooks
- **use-analytics.ts**: Firebase analytics wrapper
- **use-toast.ts**: Toast notification management
- **use-mobile.tsx**: Mobile device detection
- **use-chunk-retry.ts**: Chunked data fetching with retry

### Local Storage
- **XPUB Storage**: Persisting wallet connections
- **User Preferences**: Theme, settings, labels
- **Cache Management**: Blockchain data caching
- **Session State**: Temporary UI state

### Application Architecture
- **Service Layer**: Business logic in `src/lib/` and `src/services/`
- **Separation of Concerns**: UI, business logic, and data access
- **Error Boundaries**: Graceful error handling at component level
- **Loading States**: Skeleton UI and loading indicators
- **Offline Handling**: Graceful degradation without network

---

## API Integration & Networking

### Blockchain Data Sources
- **Blockstream Esplora API**: Primary blockchain data source
  - UTXO queries
  - Transaction details and confirmations
  - Address balances and history
  - Fee estimates
- **mempool.space API**: Mempool and fee data
  - Real-time fee recommendations
  - Pending transaction visualization
  - Network statistics
- **blockchain.info API**: Fallback data source

### Market Data APIs
- **CoinGecko API**: Real-time Bitcoin pricing
  - Historical price data
  - Multi-currency support (USD, EUR, GBP)
  - Market statistics
- **Alternative.me**: Fear & Greed Index

### News & Content APIs
- **CryptoCompare API**: Bitcoin and crypto news
  - Latest articles
  - Market sentiment

### External Integrations
- **Google Sheets API**: Optional feedback export
  - Service account authentication
  - Spreadsheet updates
- **Firebase**: Client-side analytics only
  - Usage metrics
  - Error tracking

### HTTP Best Practices
- **Fetch API**: Making HTTP requests
- **Error Handling**: Network errors, timeouts, retries
- **Exponential Backoff**: Retry strategies (`src/lib/chunk-retry-service.ts`)
- **Request Caching**: Reducing redundant API calls (`src/lib/cache-utils.ts`)
- **Rate Limiting**: Respecting API limits

---

## UI/UX Development

### Tailwind CSS 4 (Advanced)
- **Utility Classes**: Comprehensive use of Tailwind utilities
- **Responsive Design**: Mobile-first responsive patterns
- **Dark Mode**: Theme switching with `next-themes`
- **Custom Configuration**: Extended theme in `tailwind.config.ts`
- **PostCSS Integration**: New `@tailwindcss/postcss` architecture in Tailwind 4
- **CSS Variables**: Theme customization with CSS custom properties
- **Performance**: Improved build performance with Tailwind 4

### shadcn/ui Components
- **Component Library**: Radix UI-based components in `src/components/ui/`
- **Available Components**: 
  - Accordion, Alert, Avatar, Badge, Button
  - Calendar, Card, Carousel, Chart, Checkbox
  - Collapsible, Dialog, Dropdown Menu, Form
  - Input, Label, Menubar, Popover, Progress
  - Radio Group, Scroll Area, Select, Separator
  - Sheet, Sidebar, Skeleton, Slider, Switch
  - Table, Tabs, Textarea, Toast, Tooltip
- **Customization**: Extending base components
- **Accessibility**: Built-in ARIA support

### Design Patterns
- **Component Composition**: Building complex UIs from simple parts
- **Container/Presentational**: Separation of logic and presentation
- **Compound Components**: Related component groups
- **Render Props**: Flexible component APIs (where applicable)

### Responsive Design
- **Mobile-First**: Designing for mobile, enhancing for desktop
- **Breakpoints**: Tailwind's responsive prefixes
- **Touch-Friendly**: Appropriate tap targets
- **Viewport Handling**: Safe areas and notches

### Accessibility
- **Semantic HTML**: Proper heading hierarchy, landmarks
- **ARIA Attributes**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG-compliant color choices
- **Focus Management**: Visible focus indicators

---

## Data Visualization

### Recharts (Primary)
- **Chart Types**: Line, Area, Bar, Pie charts
- **Responsive Charts**: Dynamic sizing
- **Tooltips & Legends**: Interactive data display
- **Custom Styling**: Tailwind integration
- **Animation**: Smooth transitions

### react-force-graph-2d
- **Transaction Graphs**: Visual blockchain exploration
- **Node/Edge Rendering**: Custom styling
- **Interactivity**: Pan, zoom, node selection
- **Performance**: Large graph optimization

### Chart Components
- **Balance History**: Wallet balance over time
- **Volume Analysis**: Inflow/outflow patterns
- **Performance Metrics**: Investment returns
- **AI Charts**: AI-generated visualizations (`src/components/ui/ai-chart.tsx`)

---

## Testing & Quality Assurance

### Type Checking
```bash
npm run typecheck
```
Validates TypeScript types across the entire codebase.

### Linting
```bash
npm run lint
```
Runs ESLint with Next.js configuration.

### Vitest (Unit Testing)
```bash
npm run test
```
- **Test Files**: Located in `tests/` directory
- **Available Tests**:
  - `address-discovery-unit.test.ts`
  - `tax-calculations.test.ts`
  - `validate-initial-check-limit.test.ts`
  - `wallet-snapshot-cache.test.ts`

### Manual Testing
- **Browser Testing**: Chrome, Firefox, Safari, Edge
- **Responsive Testing**: Mobile and desktop viewports
- **Network Conditions**: Testing with slow/offline connectivity
- **XPUB Testing**: Various XPUB formats and wallet sizes
- **AI Feature Testing**: Chat responses and insights

### Performance Testing
- **Lighthouse**: Core Web Vitals assessment
- **Bundle Analysis**: Monitoring bundle size
- **API Performance**: Response time monitoring
- **Custom Scripts**: Performance test scripts in `tests/`

---

## Build Systems & Deployment

### Next.js Build System
```bash
npm run build        # Production build
npm run build:clean  # Clean build (removes .next first)
npm run start        # Start production server
```
- **Static Generation**: Pre-rendering where possible
- **Dynamic Routes**: Server-side rendering for dynamic content
- **API Routes**: Serverless function deployment
- **Image Optimization**: Automatic image processing
- **Font Optimization**: Next.js font loading

### Development Server
```bash
npm run dev          # Start with Turbopack
npm run dev:clean    # Clean start (removes .next first)
npm run genkit:dev   # Start AI flows development server
npm run genkit:watch # AI flows with auto-reload
```

### Deployment Platforms
- **Vercel** (Recommended): Automatic deployments
- **Firebase App Hosting**: See `apphosting.*.yaml` configs
- **Google Cloud Run**: Container-based deployment

### Environment Configuration
- **`.env`**: Local development secrets
- **`.env.local`**: Local overrides (not committed)
- **Production**: Environment variables in hosting platform

### Build Optimization
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Minification**: Production code compression
- **Caching**: Static asset caching headers

---

## Development Tools & Workflows

### Version Control (Git)
- **Git Workflow**: Feature branches, pull requests, code review
- **Commit Messages**: Clear, descriptive commit messages
- **Branching Strategy**: `main` (production), `dev` (development), feature branches
- **GitHub**: Repository management, issues, PRs

### Code Editors
- **VS Code**: Primary editor with extensions
- **Extensions**: ESLint, Prettier, TypeScript, Tailwind CSS IntelliSense
- **IntelliSense**: TypeScript autocomplete and type hints
- **Path Aliases**: `@/` resolves to `src/`

### Package Management
- **npm**: Node package manager
- **package-lock.json**: Reproducible builds
- **patch-package**: Patching dependencies (see `patches/`)
- **Overrides**: Dependency version resolution

### Command Line Tools
- **Node.js**: JavaScript runtime (v18+, v20 recommended)
- **Next.js CLI**: Built-in development tools
- **Genkit CLI**: AI flow development
- **TypeScript**: Type checking and compilation

### Documentation Standards
- **Markdown**: All documentation in Markdown format
- **docs/ Folder**: Technical documentation storage
- **Exceptions**: README.md, LICENSE, CONTRIBUTING.md, AGENTS.md at root
- **Inline Comments**: Sparingly, for complex logic only

---

## Soft Skills & Best Practices

### Communication
- **Technical Writing**: Clear documentation and code comments
- **Code Reviews**: Constructive feedback and collaboration
- **Issue Reporting**: Detailed bug reports and feature requests
- **Stakeholder Communication**: Explaining technical decisions

### Problem Solving
- **Debugging**: Systematic approach to finding and fixing bugs
- **Performance Optimization**: Identifying and resolving bottlenecks
- **Security Mindset**: Thinking about privacy implications
- **Research**: Finding solutions in documentation and community

### Project-Specific Conventions
- **TypeScript First**: All new code uses TypeScript
- **Functional Components**: No class components
- **shadcn/ui Patterns**: Follow existing component patterns
- **Documentation Organization**: All docs in `docs/` folder (with noted exceptions)
- **Minimal Changes**: Surgical, focused changes only
- **Privacy Priority**: Never request or handle private keys

### Learning & Growth
- **Bitcoin Protocol**: Continuous learning about Bitcoin
- **Next.js Ecosystem**: Staying current with framework updates
- **AI/ML Trends**: Following Genkit and AI best practices
- **Web Standards**: Modern web development practices

---

## Knowledge Levels

### Essential (Must Have)
- ✅ Next.js App Router fundamentals
- ✅ React 19 with hooks
- ✅ TypeScript proficiency
- ✅ Tailwind CSS
- ✅ Git version control
- ✅ Bitcoin basics (XPUBs, addresses, transactions)

### Advanced (Highly Recommended)
- ⭐ Bitcoin BIPs (32, 39, 44, 84)
- ⭐ Genkit AI flow development
- ⭐ shadcn/ui component patterns
- ⭐ Blockchain API integration
- ⭐ Data visualization (Recharts)
- ⭐ Performance optimization

### Specialized (As Needed)
- 🔧 Advanced Bitcoin analysis (UTXO management, privacy scoring)
- 🔧 AI prompt engineering
- 🔧 Google Sheets API integration
- 🔧 Nostr protocol integration
- 🔧 Tax calculation algorithms
- 🔧 PDF generation (jspdf)

---

## Learning Resources

### Bitcoin Development
- **Bitcoin Developer Documentation**: https://developer.bitcoin.org/
- **Learn Me a Bitcoin**: https://learnmeabitcoin.com/
- **BIPs Repository**: https://github.com/bitcoin/bips
- **Mastering Bitcoin**: Book by Andreas Antonopoulos

### Next.js & React
- **Next.js Documentation**: https://nextjs.org/docs
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs

### AI & Genkit
- **Genkit Documentation**: https://firebase.google.com/docs/genkit
- **OpenAI API Reference**: https://platform.openai.com/docs/

### Libraries & Tools
- **bitcoinjs-lib**: https://github.com/bitcoinjs/bitcoinjs-lib
- **shadcn/ui**: https://ui.shadcn.com/
- **Recharts**: https://recharts.org/
- **Zod**: https://zod.dev/

### Blockchain APIs
- **Blockstream Esplora**: https://github.com/Blockstream/esplora/blob/master/API.md
- **mempool.space API**: https://mempool.space/docs/api
- **CoinGecko API**: https://docs.coingecko.com/

---

## Conclusion

Contributing to **BitSleuth Analyzer** requires a blend of modern web development expertise, Bitcoin protocol knowledge, and AI integration skills. This document serves as a comprehensive guide to the skills needed at various levels.

**Priority Skill Areas:**
1. 🌐 **Next.js 16 & React 19** - Core development platform
2. 🔧 **TypeScript** - Primary programming language
3. 🪙 **Bitcoin Protocol** - Understanding blockchain analysis
4. 🤖 **AI/Genkit** - Powering insights and chat
5. 🎨 **Tailwind 4 & shadcn/ui** - UI development

**For new contributors:**
- Start with Next.js App Router and TypeScript fundamentals
- Study Bitcoin XPUBs and address derivation basics
- Review existing codebase patterns in `src/lib/`, `src/ai/flows/`, and `src/components/`
- Run the development servers: `npm run dev` and `npm run genkit:dev`
- Always prioritize user privacy over convenience

**For experienced contributors:**
- Mentor others on Bitcoin protocol intricacies
- Review AI flow changes and prompt engineering
- Optimize performance and user experience
- Contribute to advanced features (tax reporting, coin control, Nostr sync)

---

**Remember**: This is a Bitcoin wallet analysis tool. Users trust us with visibility into their financial data. Every feature should be built with privacy, security, and accuracy as top priorities.

For questions or clarification on any skill area, please refer to:
- [AGENTS.md](../../../AGENTS.md) - Project overview and patterns
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) - Contribution guidelines
- [.github/copilot-instructions.md](../../copilot-instructions.md) - Development conventions
- [docs/](../../../docs/) - Additional technical documentation
