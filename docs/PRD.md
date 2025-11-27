# Product Requirements Document (PRD)

## 1. Overview
**Product Name:** BitSleuth - AI Bitcoin Wallet Analyzer

**Description:** BitSleuth is an AI-powered Bitcoin wallet insights application that analyzes Bitcoin wallets by their extended public keys (XPUBs) to provide comprehensive security analysis, transaction insights, and investment intelligence. The platform combines advanced blockchain data analysis with AI-driven recommendations to help users understand their Bitcoin holdings, identify security risks, and optimize their Bitcoin management strategies.

**Goals:** 
- Provide comprehensive Bitcoin wallet analysis without requiring private keys
- Deliver AI-powered insights and security recommendations
- Enable users to understand their Bitcoin transaction patterns and investment performance
- Offer real-time market data and network insights
- Create a user-friendly interface for both beginners and advanced Bitcoin users

## 2. Problem Statement
**What problem are we solving?** 
Bitcoin users lack comprehensive tools to analyze their wallet security, understand their transaction patterns, and get actionable insights about their Bitcoin holdings. Existing solutions either require private keys (security risk) or provide limited analysis capabilities. Users need a way to:
- Assess wallet security and privacy practices
- Understand transaction patterns and investment performance
- Get proactive recommendations for improving Bitcoin management
- Access real-time market and network data
- Generate reports for tax and financial planning

**Why is this important?**
- Bitcoin security is critical as users can lose funds permanently
- Privacy best practices are often misunderstood by users
- Investment tracking and tax reporting are complex for Bitcoin
- Users need education about proper Bitcoin management
- The growing Bitcoin ecosystem requires better analytical tools

## 3. Objectives and Success Metrics
**Objectives (business + user goals):**
- **User Goals:** Help users secure their Bitcoin, understand their holdings, and make informed decisions
- **Business Goals:** Establish BitSleuth as the leading Bitcoin wallet analysis platform
- **Technical Goals:** Provide accurate, real-time analysis with AI-powered insights
- **Security Goals:** Maintain user privacy while providing comprehensive analysis

**KPIs / measurable success metrics:**
- Monthly Active Users (MAU)
- User retention rate (30-day, 90-day)
- Average session duration
- Number of wallets analyzed per user
- User engagement with AI chat features
- Security recommendations adoption rate
- User satisfaction scores
- API response times and uptime

## 4. Target Audience
**Who are the users?**
- **Primary:** Bitcoin holders and investors (individual and institutional)
- **Secondary:** Bitcoin developers and researchers
- **Tertiary:** Financial advisors and tax professionals

**Personas / user stories:**
- **Bitcoin Investor:** "As a Bitcoin investor, I want to analyze my wallet security and track my investment performance so I can make informed decisions about my holdings."
- **Privacy-Conscious User:** "As a privacy-focused Bitcoin user, I want to identify address reuse and other privacy risks so I can improve my operational security."
- **Tax Professional:** "As a tax professional, I want to generate comprehensive Bitcoin transaction reports so I can help clients with tax compliance."
- **Bitcoin Developer:** "As a Bitcoin developer, I want to explore blockchain data and understand transaction patterns so I can build better applications."

## 5. Features & Requirements
### Core Features
- [x] **XPUB Wallet Connection:** Securely connect Bitcoin wallets using extended public keys without exposing private keys
- [x] **Dashboard Overview:** Comprehensive dashboard showing balance, security score, recent activity, and key metrics
- [x] **Transaction Analysis:** Detailed transaction history with labeling, historical price context, and pattern analysis
- [x] **Security Analysis:** Privacy threat assessment, address reuse detection, dust analysis, and security recommendations
- [x] **AI Chat Interface:** Natural language interface for querying wallet data and getting AI-powered insights
- [x] **Analysis Charts:** Balance history, transaction volume, inflow/outflow, and performance visualizations
- [x] **Market Data:** Real-time Bitcoin price, charts, candlesticks, and Fear & Greed Index
- [x] **Mempool Explorer:** Live network fees, pending blocks, and mempool statistics
- [x] **Address Discovery:** Explore any Bitcoin address or transaction with interactive blockchain graphs
- [x] **Coin Control:** UTXO management and optimization tools
- [x] **Multi-Currency Support:** Display values in USD, EUR, and GBP
- [x] **Nostr Integration:** Optional encrypted XPUB sync across devices using Nostr protocol

### Nice-to-Have Features
- [ ] **Tax Reporting:** Advanced P&L calculations and tax summary generation (currently in beta)
- [ ] **Portfolio Tracking:** Multi-wallet portfolio management and aggregation
- [ ] **Alert System:** Custom notifications for security events and market conditions
- [ ] **API Access:** Developer API for third-party integrations
- [ ] **Mobile App:** Native mobile applications for iOS and Android
- [ ] **Advanced Analytics:** Machine learning models for transaction pattern prediction
- [ ] **Social Features:** Share insights and collaborate with other users
- [ ] **Educational Content:** Built-in Bitcoin education and best practices guides

## 6. Technical Considerations
**Platforms:**
- Web application (Next.js 15 with App Router)
- Progressive Web App (PWA) capabilities
- Responsive design for mobile and desktop
- Future: Native mobile apps

**Integrations:**
- **Blockchain Data:** Blockstream API, mempool.space, blockchain.info
- **Market Data:** CoinGecko API, Alternative.me (Fear & Greed Index)
- **AI Services:** OpenAI (GPT-4.1 Mini) via Genkit framework
- **Analytics:** Firebase Analytics
- **Authentication:** Nostr protocol for decentralized identity
- **Data Export:** Google Sheets API for feedback export

**Dependencies:**
- Node.js 18+ runtime environment
- Next.js 15 framework
- React 18 with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- Bitcoin libraries: bitcoinjs-lib, bip32, secp256k1
- AI/ML: Google Genkit framework with OpenAI GPT-4.1 Mini models
- Real-time data: Various Bitcoin APIs

## 7. Risks & Assumptions
**Risks:**
- **API Dependencies:** Reliance on external Bitcoin APIs could cause service interruptions
- **Privacy Concerns:** Users may be hesitant to share XPUB keys despite security measures
- **Regulatory Changes:** Evolving cryptocurrency regulations could impact service availability
- **Technical Complexity:** Bitcoin analysis requires deep technical knowledge and ongoing updates
- **Competition:** Other wallet analysis tools could gain market share
- **Data Accuracy:** Blockchain data inconsistencies could lead to incorrect analysis

**Assumptions:**
- Users understand the difference between XPUB and private keys
- Bitcoin network will continue to operate reliably
- External APIs will maintain reasonable uptime and pricing
- Users value privacy and security analysis features
- AI-powered insights will provide value over static analysis
- Nostr integration will appeal to privacy-conscious users

## 8. Timeline & Milestones
**Phase 1: Core Platform (Completed)**
- XPUB wallet connection and basic analysis
- Dashboard and transaction views
- Security analysis and recommendations
- AI chat interface
- Market data integration

**Phase 2: Enhanced Features (In Progress)**
- Advanced analytics and charting
- Mempool and network data
- Coin control and UTXO management
- Nostr integration
- Multi-currency support

**Phase 3: Advanced Capabilities (Planned)**
- Tax reporting and P&L calculations
- Portfolio aggregation
- Mobile applications
- API access for developers
- Advanced AI features

## 9. Open Questions
**Any unresolved items for discussion:**
- Should we implement a freemium model with usage limits?
- How can we better educate users about Bitcoin privacy best practices?
- What additional blockchain networks should we support in the future?
- How can we improve the accuracy of security recommendations?
- Should we implement user accounts for saving analysis history?
- What level of API rate limiting is appropriate for different user tiers?
- How can we better integrate with popular Bitcoin wallets and services?
- What additional compliance features are needed for institutional users?
