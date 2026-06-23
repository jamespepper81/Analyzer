# Security Policy

## About BitSleuth Analyzer

BitSleuth Analyzer is a read-only Bitcoin wallet analysis web application. It uses extended public keys (XPUBs) to observe wallet activity without ever handling private keys or signing transactions.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in BitSleuth Analyzer, please report it privately to help protect our users.

### How to Report

Send an email to **security@bitsleuth.ai** with the following information:

- **Description**: A clear description of the vulnerability
- **Impact**: The potential impact of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Area**: Which part of the application is affected (e.g., web UI, API routes, AI flows, Nostr integration)
- **Suggested Fix**: If you have suggestions for fixing the issue (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will assess the vulnerability and determine its severity
- **Updates**: You will receive updates on our progress at least every 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Credit**: If you wish, we will publicly credit you for the discovery once the issue is resolved

## Security Architecture

### Read-Only by Design

- The application only accepts XPUBs (extended public keys), which are mathematically incapable of authorizing transactions
- No private keys are ever requested, handled, or stored
- All blockchain interaction is purely observational via public APIs
- No wallet creation — users bring their own XPUBs from external wallets

### Client-Side Data Storage

- All user data (XPUBs, preferences, cached wallet data) is stored exclusively in browser `localStorage`
- No backend database stores user wallet information
- No user accounts or server-side sessions

### Optional Nostr Integration

- Users may optionally log in with a Nostr private key (nsec) for encrypted cross-device XPUB synchronization
- The nsec is stored in browser `localStorage` and used client-side only for NIP-04 encryption/decryption
- XPUB data is encrypted before being published to Nostr relays; only the user's key pair can decrypt it
- The nsec never leaves the browser and is never sent to the BitSleuth server

### Server-Side API Key Isolation

- Sensitive API keys (`OPENAI_API_KEY`, `GOOGLE_SHEETS_PRIVATE_KEY`, `COINGECKO_API_KEY`, `CRYPTOCOMPARE_API_KEY`) are server-side only, accessed via `process.env` (never prefixed with `NEXT_PUBLIC_`)
- The Google Analytics measurement ID (`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`) is public client config designed to be safe for browser exposure — it only enables anonymous analytics collection

### Security Headers

The application sets the following security headers via `next.config.ts`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Powered-By` header is suppressed

### Input Validation and Output Safety

- All AI flow inputs are validated with Zod schemas before processing
- AI model responses are filtered through output guards before display
- Markdown rendering uses `react-markdown` with controlled component rendering

### Analytics Disclosure

- BitSleuth Analyzer uses Firebase Analytics to collect anonymous usage metrics (page views, feature usage)
- No personally identifiable information (PII) is collected
- No wallet addresses or financial data is sent to analytics

## Scope

### In Scope

- **XPUB data exposure**: Any vulnerability that could leak a user's XPUB to unintended parties (XSS, localStorage exfiltration, etc.)
- **Nostr nsec exposure**: Leakage of the Nostr private key from localStorage or during relay communication
- **API key leakage**: Server-side secrets exposed in client bundles, logs, or error messages
- **Cross-site scripting (XSS)**: Injection via AI chat responses, user-supplied data, or URL parameters
- **AI prompt injection**: Manipulation of AI flows to extract system prompts, bypass guardrails, or produce harmful output
- **Server-side request forgery (SSRF)**: Exploiting API routes to make unintended server-side requests
- **Dependency vulnerabilities**: Security issues in direct dependencies with demonstrable impact
- **Unauthorized access to API routes**: Accessing server-side endpoints in unintended ways
- **Secrets in repository**: Hardcoded credentials or `.env` files in the codebase

### Out of Scope

- Social engineering attacks against individual users
- Denial-of-service attacks against third-party APIs (Blockstream, mempool.space, CoinGecko)
- Vulnerabilities in third-party services themselves (Firebase, Nostr relays, OpenAI)
- Issues requiring physical access to a user's device
- Browser-level vulnerabilities or localStorage security in the browser itself
- UI/UX issues without a security impact

## External APIs

All blockchain data is fetched from public, read-only APIs:

| API | Purpose | Auth | Data Sensitivity |
|-----|---------|------|-----------------|
| Blockstream | Blockchain data | None | Public |
| mempool.space | Mempool and network stats | None | Public |
| CoinGecko | Price and market data | Optional API key (server-side) | Public |
| CryptoCompare | News articles | API key (server-side) | Public |
| OpenAI | AI analysis and chat | API key (server-side) | Wallet data sent for analysis |
| Google Sheets | Feedback export | Service account (server-side) | User feedback text |

**Note**: Wallet data (XPUBs, transaction summaries, balances) is sent to OpenAI for AI-powered analysis. No private keys are ever included.

## Environment Variables

**Public client configuration (safe for browser):**
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — Google Analytics (GA4) measurement ID
- `NEXT_PUBLIC_SITE_URL` — Application URL

**Server-side secrets (must not be exposed to client):**
- `OPENAI_API_KEY` — Required for AI features
- `GOOGLE_SHEETS_PRIVATE_KEY` — Optional, feedback export
- `GOOGLE_SHEETS_CLIENT_EMAIL` — Optional, feedback export
- `COINGECKO_API_KEY` — Optional, enhanced market data
- `CRYPTOCOMPARE_API_KEY` — Optional, news feed

`.env` files are excluded from the repository. Automated guardrails in `.rules` enforce no hardcoded secrets and no committed `.env` files.

## Open Source

BitSleuth Analyzer is open source and publicly auditable. We welcome security-focused code review from the community.
