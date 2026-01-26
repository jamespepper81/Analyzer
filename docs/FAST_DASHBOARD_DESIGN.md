# Fast Dashboard Design: Dual-Login Flow

> Design specification for instant dashboard routing with premium background loading UX.

**Goal**: Route users to `/dashboard` within 200ms of authentication detection, with all data loading in the background.

---

## Table of Contents

1. [End-to-End Flow](#1-end-to-end-flow)
2. [Dashboard Loading State Spec](#2-dashboard-loading-state-spec)
3. [Engineering Plan](#3-engineering-plan)
4. [State Machine Model](#4-state-machine-model)
5. [Implementation Pseudocode](#5-implementation-pseudocode)
6. [Performance Budgets & Instrumentation](#6-performance-budgets--instrumentation)

---

## 1. End-to-End Flow

### 1.1 XPUB Connection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER ENTERS XPUB                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User types/pastes XPUB                                                  │
│  2. Click "Connect Wallet"                                                  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ VALIDATION GATE (sync, <50ms)                                        │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • Validate XPUB format (regex + prefix check)                        │   │
│  │ • Infer address type from prefix (zpub/ypub/xpub)                    │   │
│  │ • Generate wallet fingerprint (first 8 chars of hash)                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ROUTE IMMEDIATELY (target: <200ms from click)                        │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • Set activeXpub in context (persist to localStorage)                │   │
│  │ • Set authState = 'AUTHENTICATED'                                    │   │
│  │ • router.push('/dashboard')                                          │   │
│  │ • DO NOT WAIT for any network requests                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ BACKGROUND LOADING (async, non-blocking)                             │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Phase 1: Check cache (0-100ms)                                       │   │
│  │   • Check localStorage for cached WalletSnapshot                     │   │
│  │   • If valid: show immediately, continue to refresh                  │   │
│  │                                                                      │   │
│  │ Phase 2: Address Discovery (100ms - 30s)                             │   │
│  │   • Derive first batch of addresses (external + change)              │   │
│  │   • Check addresses in parallel batches of 10                        │   │
│  │   • Fire progress callbacks as addresses discovered                  │   │
│  │                                                                      │   │
│  │ Phase 3: Balances & Transactions (parallel with Phase 2)             │   │
│  │   • Fetch UTXOs for discovered addresses (incremental)               │   │
│  │   • Fetch transactions for discovered addresses (incremental)        │   │
│  │   • Update UI with partial results as they arrive                    │   │
│  │                                                                      │   │
│  │ Phase 4: Enrichment (after core data)                                │   │
│  │   • Fetch historical prices for transactions                         │   │
│  │   • Calculate P&L metrics                                            │   │
│  │   • Load AI insights (proactive suggestions)                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What counts as "detected" for XPUB:**
- Valid XPUB format (starts with xpub/ypub/zpub/tpub/upub/vpub)
- Passes base58check validation
- Can derive at least one address

**Data required before routing:** NONE (zero network calls)

**Data loaded after routing:** Everything

---

### 1.2 Nostr Login Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER ENTERS NSEC                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User types/pastes nsec                                                  │
│  2. Click "Login with Nostr"                                                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ VALIDATION GATE (sync, <50ms)                                        │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • Validate nsec format (nsec1... bech32 encoding)                    │   │
│  │ • Derive npub from nsec (local crypto, no network)                   │   │
│  │ • Check for locally cached XPUBs for this npub                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                         │                                                   │
│                         ▼                                                   │
│              ┌──────────┴──────────┐                                        │
│              │ Cached XPUBs exist? │                                        │
│              └──────────┬──────────┘                                        │
│                    │         │                                              │
│                   YES        NO                                             │
│                    │         │                                              │
│                    ▼         ▼                                              │
│  ┌─────────────────────┐  ┌─────────────────────────────────────────────┐   │
│  │ FAST PATH           │  │ FIRST-TIME NOSTR LOGIN                      │   │
│  │ Route immediately   │  │ Route with "Syncing from Nostr" state       │   │
│  │ with cached data    │  │ Fetch XPUBs from relays in background       │   │
│  └─────────────────────┘  └─────────────────────────────────────────────┘   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ROUTE IMMEDIATELY                                                    │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • Set nostrNsec + nostrNpub in context                               │   │
│  │ • Set authState = 'AUTHENTICATED' (or 'SYNCING_NOSTR')               │   │
│  │ • router.push('/dashboard')                                          │   │
│  │ • If no cached XPUBs: show "Connecting to Nostr relays" on dashboard │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ BACKGROUND LOADING                                                   │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Nostr Sync (if first-time, parallel with wallet loading):            │   │
│  │   • Connect to relays (4 default relays, race for first response)    │   │
│  │   • Fetch kind:4 events (encrypted DMs to self containing XPUBs)     │   │
│  │   • Decrypt and parse XPUBs                                          │   │
│  │   • Set activeXpub from first decrypted XPUB                         │   │
│  │   • Fetch kind:0 event (profile metadata)                            │   │
│  │                                                                      │   │
│  │ Then: Same wallet loading flow as XPUB connection                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What counts as "detected" for Nostr:**
- Valid nsec format (bech32 with nsec1 prefix)
- Can derive npub locally

**Data required before routing:** NONE

**Special case:** First-time Nostr login shows "Syncing from Nostr" state while fetching XPUBs from relays. Dashboard is usable but shows sync progress.

---

## 2. Dashboard Loading State Spec

### 2.1 Timeline-Based UI States

#### Phase 0: Instant (0-100ms)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  BitSleuth                                           [Account ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ◉◉◉ Orbital Loader (premium animation - see 2.3)               │    │
│  │                                                                 │    │
│  │  "Connecting to your wallet..."                                 │    │
│  │                                                                 │    │
│  │  [━━━━━━━━━━━━░░░░░░░░░░░░░░░] Stage 1 of 4                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │   │
│  │ ░░ Balance ░░│ │ ░░ Security ░│ │ ░░ Perform ░░│ │ ░░ Activity ░│   │
│  │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  Recent Transactions                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Skeleton cards immediately visible (perceived instant load)
- Premium orbital loader as focal point
- Stage-based progress (not fake percentages)
- Microcopy starts optimistic

#### Phase 1: Discovery (100ms - 5s)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  BitSleuth                                           [Account ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ◉◉◉ Orbital Loader (nodes appearing one by one)                │    │
│  │                                                                 │    │
│  │  "Discovering your addresses..."                                │    │
│  │   Found 12 addresses so far                                     │    │
│  │                                                                 │    │
│  │  [━━━━━━━━━━━━━━━━░░░░░░░░░░] Stage 2 of 4                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │    0.0 BTC   │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │   │
│  │   Counting   │ │ ░░ Security ░│ │ ░░ Perform ░░│ │ ░░ Activity ░│   │
│  │      ...     │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  Recent Transactions                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Incoming    +0.05 BTC    $4,250     Pending confirmation      │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Balance card shows partial balance (updates live)
- First transactions appear as they're discovered
- Address count updates in real-time
- Skeleton cards for unloaded sections

#### Phase 2: Loading Data (5s - 15s)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  BitSleuth                                           [Account ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ◉◉◉ Orbital Loader (orbiting animation)                        │    │
│  │                                                                 │    │
│  │  "Loading transaction history..."                               │    │
│  │   Processing 47 transactions                                    │    │
│  │                                                                 │    │
│  │  [━━━━━━━━━━━━━━━━━━━━━━░░░░] Stage 3 of 4                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   0.847 BTC  │ │    Score     │ │   +12.4%     │ │   24 txns    │   │
│  │  $72,015.30  │ │   Loading... │ │   30 days    │ │   this month │   │
│  │  ✓ Verified  │ │              │ │  ✓ Verified  │ │  ✓ Verified  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  Recent Transactions                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Incoming    +0.05 BTC    $4,250     ✓ Confirmed (12 blocks)   │   │
│  │ ○ Outgoing    -0.12 BTC    $10,200    ✓ Confirmed (156 blocks)  │   │
│  │ ● Incoming    +0.32 BTC    $27,200    ✓ Confirmed (890 blocks)  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  💡 AI Insights                                                 │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │  Analyzing your wallet patterns...                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Core cards populated with real data
- ✓ Verified badge shows data is confirmed
- Transactions table fully populated
- AI insights section appears with loading state
- Security score still loading (requires AI analysis)

#### Phase 3: Complete (15s+)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  BitSleuth                                           [Account ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   0.847 BTC  │ │     87%      │ │   +12.4%     │ │   ↑ 1.2 BTC  │   │
│  │  $72,015.30  │ │  ████████░░  │ │   30 days    │ │   ↓ 0.4 BTC  │   │
│  │  ✓ Complete  │ │ Good health  │ │  All-time +% │ │   This month │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  Recent Transactions                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Incoming    +0.05 BTC    $4,250     ✓ Confirmed (12 blocks)   │   │
│  │ ○ Outgoing    -0.12 BTC    $10,200    ✓ Confirmed (156 blocks)  │   │
│  │ ● Incoming    +0.32 BTC    $27,200    ✓ Confirmed (890 blocks)  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  💡 AI Insights                                                 │   │
│  │  "Your wallet shows healthy diversification across 12 addresses.│   │
│  │   Consider consolidating small UTXOs to reduce future fees."    │   │
│  │                                                                 │   │
│  │  [View Security Report →]  [Chat with AI →]                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### "Still Loading" State (30s+)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ○○○ Gentle pulse (not spinning frantically)                    │    │
│  │                                                                 │    │
│  │  "Still discovering addresses..."                               │    │
│  │   This wallet has lots of history - we're being thorough.       │    │
│  │                                                                 │    │
│  │  Found 156 addresses with activity                              │    │
│  │  [Continue exploring while we finish →]                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ... (rest of dashboard is functional with partial data)               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Microcopy Examples

**Stage Messages (confident, friendly):**

| Stage | Primary Message | Secondary Message |
|-------|-----------------|-------------------|
| Connecting | "Connecting to your wallet..." | — |
| Discovery | "Discovering your addresses..." | "Found {n} addresses so far" |
| Balances | "Calculating your balance..." | "Checking {n} addresses" |
| Transactions | "Loading transaction history..." | "Processing {n} transactions" |
| Enrichment | "Analyzing your wallet..." | "Almost there" |
| Complete | — | — |

**Long-wait messages (30s+):**
- "This wallet has lots of history – we're being thorough."
- "Large wallets take a moment. You can explore while we finish."
- "Still working on it. Your data will appear as it's ready."

**Error states (reassuring):**
- "Having trouble connecting. Retrying..." (with retry count)
- "Some data is taking longer than usual. Showing what we have."
- "Couldn't reach all sources. Your balance may be incomplete."

**Never say:**
- "Please wait" (passive)
- "Loading..." (vague)
- "This may take a while" (discouraging)
- Percentages unless they're real

---

### 2.3 Premium Loading Animation: "Orbital Nodes"

**Concept:** A constellation of Bitcoin-themed nodes that orbit and connect, representing the decentralized network your wallet is connecting to.

```
                    ◉ ─ ─ ─ ◉
                  ╱           ╲
                ◉               ◉
                │       ₿       │
                ◉               ◉
                  ╲           ╱
                    ◉ ─ ─ ─ ◉
```

**Animation States:**

1. **Initializing (0-100ms):** Nodes fade in one by one, clockwise
2. **Discovering (100ms-5s):** Nodes pulse when addresses found, lines draw between them
3. **Loading (5s-15s):** Smooth orbital rotation, nodes glow brighter as data arrives
4. **Complete:** Nodes converge to center, form Bitcoin logo, fade out

**Technical Spec:**
```css
/* Orbital container */
.orbital-loader {
  width: 120px;
  height: 120px;
  position: relative;
}

/* Individual node */
.orbital-node {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7931a 0%, #ffb84d 100%);
  box-shadow: 0 0 20px rgba(247, 147, 26, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

/* Orbit path */
.orbital-path {
  stroke: rgba(247, 147, 26, 0.2);
  stroke-dasharray: 4 4;
  animation: rotate 20s linear infinite;
}

/* Connection lines (draw on discovery) */
.orbital-connection {
  stroke: rgba(247, 147, 26, 0.6);
  stroke-width: 1;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: draw 0.5s ease-out forwards;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}
```

**Fallback:** For reduced-motion preferences, use a simple pulsing Bitcoin icon.

---

### 2.4 Progress Model: Stages Not Percentages

**Why stages over percentages:**
- Network timing is unpredictable
- Fake percentages erode trust
- Stages communicate meaningful progress
- Users understand "Step 2 of 4" better than "34%"

**Stage Definitions:**

| Stage | Name | Conditions to Enter | Visual |
|-------|------|---------------------|--------|
| 1 | Connecting | Auth validated | Nodes appearing |
| 2 | Discovering | First address checked | Nodes connecting |
| 3 | Loading | First balance received | Nodes orbiting |
| 4 | Analyzing | Core data complete | Nodes converging |
| ✓ | Complete | All data loaded | Nodes form ₿ |

**Progress bar behavior:**
- Each stage = 25% of bar
- Within stage: Gentle pulse/shimmer (no fake movement)
- Never show percentage numbers

---

## 3. Engineering Plan

### 3.1 Concurrency Strategy

```typescript
// Parallel by address type, batched within type
const BATCH_SIZE = 10;
const MAX_CONCURRENT_BATCHES = 3;

async function loadWalletData(xpub: string) {
  // Phase 1: Derive addresses (CPU-bound, instant)
  const addressTypes = inferAddressTypes(xpub); // ['native'] for zpub, etc.

  // Phase 2: Discover addresses in parallel batches
  const discoveryController = new AbortController();
  const discoveredAddresses: Address[] = [];

  await Promise.all(
    addressTypes.map(type =>
      discoverAddressesProgressive(xpub, type, {
        batchSize: BATCH_SIZE,
        maxConcurrent: MAX_CONCURRENT_BATCHES,
        onBatchComplete: (addresses) => {
          discoveredAddresses.push(...addresses);
          emitProgress({ stage: 'DISCOVERING', addressCount: discoveredAddresses.length });
        },
        signal: discoveryController.signal
      })
    )
  );

  // Phase 3: Fetch balances + transactions in parallel
  // Dedupe: same address won't be fetched twice
  const deduper = new RequestDeduper();

  await Promise.all([
    // Balances (fast, small payloads)
    fetchBalancesIncremental(discoveredAddresses, {
      onAddressBalance: (addr, balance) => {
        emitProgress({ stage: 'BALANCES', partialBalance: runningTotal });
      },
      deduper
    }),

    // Transactions (slower, larger payloads)
    fetchTransactionsIncremental(discoveredAddresses, {
      onTransactionBatch: (txs) => {
        emitProgress({ stage: 'TRANSACTIONS', partialTxs: allTxs });
      },
      deduper
    })
  ]);

  // Phase 4: Enrichment (after core data)
  // Fire-and-forget, don't block
  enrichWithHistoricalPrices(transactions).catch(console.error);
  fetchAiInsights(walletData).catch(console.error);
}
```

**Deduplication:**
```typescript
class RequestDeduper {
  private inFlight = new Map<string, Promise<any>>();

  async fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}
```

---

### 3.2 Caching Strategy

**Three-tier cache:**

| Tier | Storage | TTL | Use Case |
|------|---------|-----|----------|
| Memory | React state | Session | Active wallet, instant switching |
| IndexedDB | Browser | 1 hour | Full wallet snapshots |
| LocalStorage | Browser | 24 hours | Lightweight metadata |

**Cache Keys:**
```typescript
// Wallet snapshot (IndexedDB)
`wallet:${xpubFingerprint}` → WalletSnapshot

// Address discovery result (IndexedDB)
`addresses:${xpubFingerprint}` → Address[]

// Price data (LocalStorage)
`price:btc:${currency}` → { price: number, timestamp: number }

// Last known balance (LocalStorage, for instant display)
`balance:${xpubFingerprint}` → { btc: number, timestamp: number }
```

**Invalidation Rules:**
```typescript
const CACHE_CONFIG = {
  walletSnapshot: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true, // Show stale, fetch fresh
  },
  addresses: {
    ttl: 60 * 60 * 1000, // 1 hour (addresses don't change)
    staleWhileRevalidate: false,
  },
  price: {
    ttl: 60 * 1000, // 1 minute
    staleWhileRevalidate: true,
  },
  balance: {
    ttl: 30 * 1000, // 30 seconds
    staleWhileRevalidate: true,
  }
};

function isCacheValid(entry: CacheEntry, config: CacheConfig): boolean {
  const age = Date.now() - entry.timestamp;
  return age < config.ttl;
}

function shouldUseStale(entry: CacheEntry, config: CacheConfig): boolean {
  return config.staleWhileRevalidate && entry !== null;
}
```

---

### 3.3 Optimistic UI Patterns

**Pattern 1: Show cached immediately, refresh in background**
```typescript
async function loadDashboard(xpub: string) {
  // 1. Check cache first (sync, instant)
  const cached = await getCachedWallet(xpub);

  if (cached) {
    // Show cached data immediately
    setWalletData(cached.data);
    setLoadingState('REFRESHING'); // Subtle indicator

    // Refresh in background
    const fresh = await fetchWalletData(xpub);
    setWalletData(fresh);
    setLoadingState('COMPLETE');
    await cacheWallet(xpub, fresh);
  } else {
    // No cache: show loading state
    setLoadingState('LOADING');
    const data = await fetchWalletDataProgressive(xpub, onProgress);
    setWalletData(data);
    setLoadingState('COMPLETE');
    await cacheWallet(xpub, data);
  }
}
```

**Pattern 2: Optimistic balance display**
```typescript
// Show last known balance instantly, update when fresh data arrives
function BalanceCard({ xpub }: { xpub: string }) {
  const lastKnown = useLastKnownBalance(xpub); // From localStorage
  const { balance, isLoading } = useWalletBalance(xpub);

  const displayBalance = balance ?? lastKnown;
  const isStale = balance === null && lastKnown !== null;

  return (
    <Card>
      <span className={isStale ? 'opacity-70' : ''}>
        {formatBTC(displayBalance)}
      </span>
      {isStale && <RefreshingIndicator />}
    </Card>
  );
}
```

---

### 3.4 Incremental Rendering

**React pattern: Stream results into state**
```typescript
function useDashboardLoader(xpub: string) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  useEffect(() => {
    if (!xpub) return;

    const controller = new AbortController();

    loadWalletProgressive(xpub, {
      onProgress: (update) => {
        dispatch({ type: 'PROGRESS', payload: update });
      },
      onAddresses: (addresses) => {
        dispatch({ type: 'ADDRESSES_RECEIVED', payload: addresses });
      },
      onBalance: (balance) => {
        dispatch({ type: 'BALANCE_RECEIVED', payload: balance });
      },
      onTransactions: (txs) => {
        dispatch({ type: 'TRANSACTIONS_RECEIVED', payload: txs });
      },
      onComplete: () => {
        dispatch({ type: 'LOADING_COMPLETE' });
      },
      onError: (error) => {
        dispatch({ type: 'ERROR', payload: error });
      },
      signal: controller.signal
    });

    return () => controller.abort();
  }, [xpub]);

  return state;
}
```

**Reducer for incremental updates:**
```typescript
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'PROGRESS':
      return {
        ...state,
        stage: action.payload.stage,
        addressCount: action.payload.addressCount ?? state.addressCount,
        txCount: action.payload.txCount ?? state.txCount,
      };

    case 'TRANSACTIONS_RECEIVED':
      // Merge new transactions, dedupe by txid
      const existingIds = new Set(state.transactions.map(tx => tx.txid));
      const newTxs = action.payload.filter(tx => !existingIds.has(tx.txid));
      return {
        ...state,
        transactions: [...state.transactions, ...newTxs].sort(byTimestampDesc),
      };

    case 'BALANCE_RECEIVED':
      return {
        ...state,
        balance: action.payload,
        lastBalanceUpdate: Date.now(),
      };

    // ... other cases
  }
}
```

---

### 3.5 Backoff and Retry Rules

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'SERVICE_UNAVAILABLE',
  ],
};

async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  config = RETRY_CONFIG
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error, config.retryableErrors)) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        emitProgress({
          type: 'RETRYING',
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          nextRetryIn: delay,
        });

        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

**Failure States (Graceful Degradation):**
```typescript
// Dashboard remains usable even with partial failures
const FALLBACK_STATES = {
  balanceUnavailable: {
    display: 'Balance unavailable',
    action: 'Retry',
    usable: true, // Dashboard still works
  },
  transactionsUnavailable: {
    display: 'Transactions loading...',
    action: 'Retry',
    usable: true,
  },
  completeFailure: {
    display: 'Unable to connect',
    action: 'Try again',
    usable: false, // Show error state
  },
};
```

---

## 4. State Machine Model

### 4.1 State Diagram

```
                              ┌─────────────────┐
                              │     IDLE        │
                              │ (no active auth)│
                              └────────┬────────┘
                                       │
                          [xpub_entered OR nsec_entered]
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ AUTH_VALIDATING │
                              │  (sync, <50ms)  │
                              └────────┬────────┘
                                       │
                   ┌───────────────────┼───────────────────┐
                   │                   │                   │
            [invalid_xpub]    [valid_xpub]         [valid_nsec]
                   │                   │                   │
                   ▼                   ▼                   ▼
          ┌──────────────┐   ┌─────────────────┐  ┌─────────────────┐
          │ AUTH_FAILED  │   │  AUTH_DETECTED  │  │ NOSTR_DETECTED  │
          │ (show error) │   │                 │  │                 │
          └──────────────┘   └────────┬────────┘  └────────┬────────┘
                                      │                    │
                              [route_to_dashboard]         │
                                      │                    │
                                      ├────────────────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │     ROUTED      │
                              │ (on /dashboard) │
                              └────────┬────────┘
                                       │
                              [start_background_load]
                                       │
                   ┌───────────────────┼───────────────────┐
                   │                   │                   │
            [has_cache]         [no_cache]         [nostr_needs_sync]
                   │                   │                   │
                   ▼                   │                   ▼
          ┌──────────────┐            │          ┌─────────────────┐
          │ CACHE_SHOWN  │            │          │  NOSTR_SYNCING  │
          │              │◄───────────┤          │ (fetch from     │
          └──────┬───────┘            │          │  relays)        │
                 │                    │          └────────┬────────┘
                 │                    │                   │
        [refresh_in_bg]              │          [xpubs_received]
                 │                    │                   │
                 └────────────────────┼───────────────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │   DISCOVERING   │
                              │ (addresses)     │
                              └────────┬────────┘
                                       │
                   ┌───────────────────┼───────────────────┐
                   │                   │                   │
          [addresses_found]   [discovery_complete]   [discovery_error]
                   │                   │                   │
                   ▼                   ▼                   ▼
          ┌──────────────┐   ┌─────────────────┐  ┌─────────────────┐
          │   LOADING    │   │ LOADING_DATA    │  │  ERROR_PARTIAL  │
          │ (partial)    │──▶│ (full)          │  │ (show what we   │
          └──────────────┘   └────────┬────────┘  │  have)          │
                                      │           └────────┬────────┘
                                      │                    │
                          [all_data_loaded]      [retry_available]
                                      │                    │
                                      ▼                    │
                              ┌─────────────────┐          │
                              │    ENRICHING    │          │
                              │ (AI, prices)    │          │
                              └────────┬────────┘          │
                                       │                   │
                              [enrichment_complete]        │
                                       │                   │
                                       ▼                   │
                              ┌─────────────────┐          │
                              │     READY       │◄─────────┘
                              │ (fully loaded)  │
                              └─────────────────┘
```

### 4.2 State Definitions

```typescript
type DashboardState =
  | { status: 'IDLE' }
  | { status: 'AUTH_VALIDATING'; input: string; type: 'xpub' | 'nsec' }
  | { status: 'AUTH_FAILED'; error: string }
  | { status: 'AUTH_DETECTED'; xpub: string }
  | { status: 'NOSTR_DETECTED'; nsec: string; npub: string }
  | { status: 'ROUTED'; xpub?: string; nsec?: string }
  | { status: 'NOSTR_SYNCING'; npub: string; relaysChecked: number }
  | { status: 'CACHE_SHOWN'; data: WalletData; isStale: boolean }
  | { status: 'DISCOVERING'; addressCount: number; batchesComplete: number }
  | { status: 'LOADING_PARTIAL'; data: Partial<WalletData>; progress: LoadProgress }
  | { status: 'LOADING_DATA'; progress: LoadProgress }
  | { status: 'ENRICHING'; data: WalletData }
  | { status: 'ERROR_PARTIAL'; data: Partial<WalletData>; errors: LoadError[] }
  | { status: 'READY'; data: WalletData };

interface LoadProgress {
  stage: 'DISCOVERING' | 'BALANCES' | 'TRANSACTIONS' | 'ENRICHING';
  stageNumber: 1 | 2 | 3 | 4;
  addressesFound: number;
  transactionsLoaded: number;
  message: string;
}

interface LoadError {
  type: 'BALANCE' | 'TRANSACTIONS' | 'ENRICHMENT';
  message: string;
  retryable: boolean;
}
```

### 4.3 Events

```typescript
type DashboardEvent =
  // Auth events
  | { type: 'XPUB_ENTERED'; xpub: string }
  | { type: 'NSEC_ENTERED'; nsec: string }
  | { type: 'AUTH_VALID'; xpub?: string; nsec?: string; npub?: string }
  | { type: 'AUTH_INVALID'; error: string }

  // Routing events
  | { type: 'ROUTE_TO_DASHBOARD' }
  | { type: 'DASHBOARD_MOUNTED' }

  // Nostr events
  | { type: 'NOSTR_RELAY_CHECKED'; relay: string }
  | { type: 'NOSTR_XPUBS_RECEIVED'; xpubs: string[] }
  | { type: 'NOSTR_SYNC_FAILED'; error: string }

  // Cache events
  | { type: 'CACHE_HIT'; data: WalletData }
  | { type: 'CACHE_MISS' }
  | { type: 'CACHE_STALE'; data: WalletData }

  // Discovery events
  | { type: 'ADDRESS_BATCH_COMPLETE'; addresses: Address[]; batchNumber: number }
  | { type: 'DISCOVERY_COMPLETE'; totalAddresses: number }
  | { type: 'DISCOVERY_ERROR'; error: string }

  // Loading events
  | { type: 'BALANCE_RECEIVED'; balance: number }
  | { type: 'TRANSACTIONS_RECEIVED'; transactions: Transaction[] }
  | { type: 'LOADING_COMPLETE' }
  | { type: 'LOADING_ERROR'; errorType: string; error: string }

  // Enrichment events
  | { type: 'ENRICHMENT_COMPLETE'; insights: AiInsights }
  | { type: 'ENRICHMENT_ERROR'; error: string }

  // User actions
  | { type: 'RETRY_REQUESTED' }
  | { type: 'REFRESH_REQUESTED' };
```

### 4.4 Transitions

```typescript
function dashboardMachine(state: DashboardState, event: DashboardEvent): DashboardState {
  switch (state.status) {
    case 'IDLE':
      if (event.type === 'XPUB_ENTERED') {
        return { status: 'AUTH_VALIDATING', input: event.xpub, type: 'xpub' };
      }
      if (event.type === 'NSEC_ENTERED') {
        return { status: 'AUTH_VALIDATING', input: event.nsec, type: 'nsec' };
      }
      break;

    case 'AUTH_VALIDATING':
      if (event.type === 'AUTH_VALID') {
        if (state.type === 'xpub') {
          return { status: 'AUTH_DETECTED', xpub: event.xpub! };
        } else {
          return { status: 'NOSTR_DETECTED', nsec: event.nsec!, npub: event.npub! };
        }
      }
      if (event.type === 'AUTH_INVALID') {
        return { status: 'AUTH_FAILED', error: event.error };
      }
      break;

    case 'AUTH_DETECTED':
    case 'NOSTR_DETECTED':
      if (event.type === 'ROUTE_TO_DASHBOARD') {
        return {
          status: 'ROUTED',
          xpub: state.status === 'AUTH_DETECTED' ? state.xpub : undefined,
          nsec: state.status === 'NOSTR_DETECTED' ? state.nsec : undefined,
        };
      }
      break;

    case 'ROUTED':
      if (event.type === 'CACHE_HIT') {
        return { status: 'CACHE_SHOWN', data: event.data, isStale: false };
      }
      if (event.type === 'CACHE_STALE') {
        return { status: 'CACHE_SHOWN', data: event.data, isStale: true };
      }
      if (event.type === 'CACHE_MISS' && state.xpub) {
        return { status: 'DISCOVERING', addressCount: 0, batchesComplete: 0 };
      }
      if (event.type === 'CACHE_MISS' && state.nsec) {
        return { status: 'NOSTR_SYNCING', npub: '', relaysChecked: 0 };
      }
      break;

    case 'NOSTR_SYNCING':
      if (event.type === 'NOSTR_XPUBS_RECEIVED') {
        return { status: 'DISCOVERING', addressCount: 0, batchesComplete: 0 };
      }
      if (event.type === 'NOSTR_RELAY_CHECKED') {
        return { ...state, relaysChecked: state.relaysChecked + 1 };
      }
      break;

    case 'DISCOVERING':
      if (event.type === 'ADDRESS_BATCH_COMPLETE') {
        return {
          ...state,
          addressCount: state.addressCount + event.addresses.length,
          batchesComplete: event.batchNumber,
        };
      }
      if (event.type === 'DISCOVERY_COMPLETE') {
        return {
          status: 'LOADING_DATA',
          progress: {
            stage: 'BALANCES',
            stageNumber: 2,
            addressesFound: event.totalAddresses,
            transactionsLoaded: 0,
            message: 'Calculating your balance...',
          },
        };
      }
      break;

    // ... additional transitions
  }

  return state; // No transition
}
```

---

## 5. Implementation Pseudocode

### 5.1 Fast Route to Dashboard Auth Gate

```typescript
// src/lib/auth/fast-auth-gate.ts

import { validateXpub, deriveXpubFingerprint } from '@/lib/bitcoin';
import { validateNsec, deriveNpub } from '@/lib/nostr';

interface AuthResult {
  success: boolean;
  error?: string;
  authType?: 'xpub' | 'nostr';
  credentials?: {
    xpub?: string;
    nsec?: string;
    npub?: string;
    fingerprint?: string;
  };
}

/**
 * Validates auth input synchronously (no network calls)
 * Target: <50ms
 */
export function validateAuthInput(input: string): AuthResult {
  const trimmed = input.trim();

  // Try XPUB first (most common)
  if (isXpubFormat(trimmed)) {
    const validation = validateXpub(trimmed);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return {
      success: true,
      authType: 'xpub',
      credentials: {
        xpub: trimmed,
        fingerprint: deriveXpubFingerprint(trimmed),
      },
    };
  }

  // Try Nostr nsec
  if (isNsecFormat(trimmed)) {
    const validation = validateNsec(trimmed);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return {
      success: true,
      authType: 'nostr',
      credentials: {
        nsec: trimmed,
        npub: deriveNpub(trimmed),
      },
    };
  }

  return { success: false, error: 'Invalid wallet key format' };
}

function isXpubFormat(input: string): boolean {
  return /^[xyztuv]pub[a-zA-HJ-NP-Z0-9]{100,112}$/.test(input);
}

function isNsecFormat(input: string): boolean {
  return /^nsec1[a-z0-9]{58}$/.test(input);
}
```

```typescript
// src/hooks/use-fast-auth.ts

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { validateAuthInput } from '@/lib/auth/fast-auth-gate';
import { useWallet } from '@/contexts/wallet-context';
import { useDashboardLoader } from '@/hooks/use-dashboard-loader';

export function useFastAuth() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setActiveXpub, setNostrCredentials } = useWallet();
  const { startBackgroundLoad } = useDashboardLoader();

  const authenticate = useCallback(async (input: string) => {
    // Step 1: Validate synchronously (<50ms)
    const result = validateAuthInput(input);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Step 2: Set credentials in context (sync)
    if (result.authType === 'xpub') {
      setActiveXpub(result.credentials!.xpub!);
    } else {
      setNostrCredentials(result.credentials!.nsec!, result.credentials!.npub!);
    }

    // Step 3: Route immediately (don't await)
    startTransition(() => {
      router.push('/dashboard');
    });

    // Step 4: Trigger background loading (fire and forget)
    // This runs AFTER navigation starts
    queueMicrotask(() => {
      startBackgroundLoad({
        xpub: result.credentials?.xpub,
        nsec: result.credentials?.nsec,
        npub: result.credentials?.npub,
      });
    });

    return { success: true };
  }, [router, setActiveXpub, setNostrCredentials, startBackgroundLoad, startTransition]);

  return { authenticate, isPending };
}
```

```typescript
// src/app/page.tsx (Login page - simplified)

'use client';

import { useState } from 'react';
import { useFastAuth } from '@/hooks/use-fast-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { authenticate, isPending } = useFastAuth();

  const handleConnect = async () => {
    setError(null);
    const result = await authenticate(input);

    if (!result.success) {
      setError(result.error ?? 'Connection failed');
    }
    // Success: user is already navigating to /dashboard
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8">Connect Your Wallet</h1>

      <div className="w-full max-w-md space-y-4">
        <Input
          placeholder="Enter XPUB or Nostr nsec..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleConnect}
          disabled={!input || isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect Wallet'
          )}
        </Button>
      </div>
    </div>
  );
}
```

---

### 5.2 Background Loaders with Concurrency

```typescript
// src/lib/loaders/background-loader.ts

import { WalletData, Address, Transaction, LoadProgress } from '@/lib/types';
import { getCachedWallet, setCachedWallet, getLastKnownBalance } from '@/lib/cache';
import { discoverAddressesProgressive } from '@/lib/blockchain';
import { fetchNostrXpubs } from '@/lib/nostr';

type ProgressCallback = (progress: LoadProgress) => void;
type DataCallback<T> = (data: T) => void;

interface LoaderConfig {
  xpub?: string;
  nsec?: string;
  npub?: string;
  onProgress: ProgressCallback;
  onBalance: DataCallback<number>;
  onTransactions: DataCallback<Transaction[]>;
  onComplete: DataCallback<WalletData>;
  onError: DataCallback<Error>;
  signal?: AbortSignal;
}

const BATCH_SIZE = 10;
const MAX_CONCURRENT = 3;

export async function startBackgroundLoader(config: LoaderConfig): Promise<void> {
  const { xpub, nsec, npub, onProgress, onBalance, onTransactions, onComplete, onError, signal } = config;

  try {
    // Phase 0: Determine what to load
    let effectiveXpub = xpub;

    if (!effectiveXpub && nsec && npub) {
      // Nostr login: need to fetch XPUBs first
      onProgress({
        stage: 'NOSTR_SYNCING',
        stageNumber: 0,
        message: 'Connecting to Nostr relays...',
        addressesFound: 0,
        transactionsLoaded: 0,
      });

      const nostrXpubs = await fetchNostrXpubs(nsec, npub, {
        onRelayChecked: (relay) => {
          onProgress({
            stage: 'NOSTR_SYNCING',
            stageNumber: 0,
            message: `Connected to ${relay}`,
            addressesFound: 0,
            transactionsLoaded: 0,
          });
        },
        signal,
      });

      if (nostrXpubs.length === 0) {
        // First-time Nostr user: no XPUBs stored yet
        onComplete({ isEmpty: true, nostrOnly: true });
        return;
      }

      effectiveXpub = nostrXpubs[0]; // Use first XPUB as active
    }

    if (!effectiveXpub) {
      throw new Error('No XPUB available to load');
    }

    // Phase 1: Check cache
    const cached = await getCachedWallet(effectiveXpub);
    if (cached && !cached.isStale) {
      onComplete(cached.data);
      // Still refresh in background
      refreshWalletData(effectiveXpub, config);
      return;
    }

    if (cached?.isStale) {
      // Show stale data immediately
      onComplete(cached.data);
    }

    // Show last known balance instantly
    const lastBalance = getLastKnownBalance(effectiveXpub);
    if (lastBalance !== null) {
      onBalance(lastBalance);
    }

    // Phase 2: Discover addresses
    onProgress({
      stage: 'DISCOVERING',
      stageNumber: 1,
      message: 'Discovering your addresses...',
      addressesFound: 0,
      transactionsLoaded: 0,
    });

    const addresses: Address[] = [];
    let runningBalance = 0;
    const allTransactions: Transaction[] = [];

    await discoverAddressesProgressive(effectiveXpub, {
      batchSize: BATCH_SIZE,
      maxConcurrent: MAX_CONCURRENT,

      onAddressBatch: async (batch) => {
        addresses.push(...batch);

        onProgress({
          stage: 'DISCOVERING',
          stageNumber: 1,
          message: `Found ${addresses.length} addresses`,
          addressesFound: addresses.length,
          transactionsLoaded: allTransactions.length,
        });

        // Immediately fetch balances and txs for this batch (parallel)
        const [balances, txs] = await Promise.all([
          fetchBalancesForAddresses(batch.map(a => a.address)),
          fetchTransactionsForAddresses(batch.map(a => a.address)),
        ]);

        // Update balance incrementally
        runningBalance += balances.reduce((sum, b) => sum + b.balance, 0);
        onBalance(runningBalance);

        // Update transactions incrementally
        const newTxs = txs.filter(tx => !allTransactions.some(t => t.txid === tx.txid));
        allTransactions.push(...newTxs);
        onTransactions([...allTransactions].sort(byTimestampDesc));

        onProgress({
          stage: 'LOADING',
          stageNumber: 2,
          message: `Processing ${allTransactions.length} transactions`,
          addressesFound: addresses.length,
          transactionsLoaded: allTransactions.length,
        });
      },

      signal,
    });

    // Phase 3: Discovery complete - final tally
    onProgress({
      stage: 'ENRICHING',
      stageNumber: 3,
      message: 'Analyzing your wallet...',
      addressesFound: addresses.length,
      transactionsLoaded: allTransactions.length,
    });

    // Build final wallet data
    const walletData: WalletData = {
      xpub: effectiveXpub,
      addresses,
      balanceBTC: runningBalance,
      transactions: allTransactions.sort(byTimestampDesc),
      utxos: computeUtxos(allTransactions, addresses),
      discoveryComplete: true,
    };

    // Cache the result
    await setCachedWallet(effectiveXpub, walletData);

    onProgress({
      stage: 'COMPLETE',
      stageNumber: 4,
      message: 'Ready',
      addressesFound: addresses.length,
      transactionsLoaded: allTransactions.length,
    });

    onComplete(walletData);

    // Phase 4: Enrichment (fire and forget)
    enrichWalletData(walletData).catch(console.error);

  } catch (error) {
    if (signal?.aborted) return;
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

async function refreshWalletData(xpub: string, config: LoaderConfig): Promise<void> {
  // Background refresh without blocking UI
  // Uses same loader but doesn't trigger loading states
}

function byTimestampDesc(a: Transaction, b: Transaction): number {
  return (b.timestamp ?? 0) - (a.timestamp ?? 0);
}
```

---

### 5.3 UI Store Updates for Incremental Rendering

```typescript
// src/contexts/dashboard-context.tsx

'use client';

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { startBackgroundLoader } from '@/lib/loaders/background-loader';
import { useWallet } from '@/contexts/wallet-context';

interface DashboardState {
  status: 'idle' | 'loading' | 'partial' | 'ready' | 'error';
  stage: LoadStage;
  stageNumber: number;
  message: string;

  // Data (can be partial)
  balance: number | null;
  transactions: Transaction[];
  addresses: Address[];
  utxos: UTXO[];

  // Progress
  addressesFound: number;
  transactionsLoaded: number;

  // Errors
  errors: LoadError[];

  // Metadata
  isRefreshing: boolean;
  lastUpdated: number | null;
}

type DashboardAction =
  | { type: 'START_LOADING' }
  | { type: 'PROGRESS'; payload: LoadProgress }
  | { type: 'BALANCE_UPDATE'; payload: number }
  | { type: 'TRANSACTIONS_UPDATE'; payload: Transaction[] }
  | { type: 'COMPLETE'; payload: WalletData }
  | { type: 'ERROR'; payload: Error }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_COMPLETE' };

const initialState: DashboardState = {
  status: 'idle',
  stage: 'CONNECTING',
  stageNumber: 0,
  message: 'Connecting to your wallet...',
  balance: null,
  transactions: [],
  addresses: [],
  utxos: [],
  addressesFound: 0,
  transactionsLoaded: 0,
  errors: [],
  isRefreshing: false,
  lastUpdated: null,
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'START_LOADING':
      return {
        ...initialState,
        status: 'loading',
      };

    case 'PROGRESS':
      return {
        ...state,
        status: state.status === 'idle' ? 'loading' : state.status,
        stage: action.payload.stage,
        stageNumber: action.payload.stageNumber,
        message: action.payload.message,
        addressesFound: action.payload.addressesFound,
        transactionsLoaded: action.payload.transactionsLoaded,
      };

    case 'BALANCE_UPDATE':
      return {
        ...state,
        status: state.balance === null ? 'partial' : state.status,
        balance: action.payload,
      };

    case 'TRANSACTIONS_UPDATE':
      // Merge and dedupe
      const existingIds = new Set(state.transactions.map(t => t.txid));
      const newTxs = action.payload.filter(t => !existingIds.has(t.txid));
      return {
        ...state,
        status: 'partial',
        transactions: [...state.transactions, ...newTxs].sort(byTimestampDesc),
      };

    case 'COMPLETE':
      return {
        ...state,
        status: 'ready',
        stage: 'COMPLETE',
        stageNumber: 4,
        message: 'Ready',
        balance: action.payload.balanceBTC,
        transactions: action.payload.transactions,
        addresses: action.payload.addresses,
        utxos: action.payload.utxos,
        isRefreshing: false,
        lastUpdated: Date.now(),
      };

    case 'ERROR':
      return {
        ...state,
        status: state.balance !== null ? 'partial' : 'error',
        errors: [...state.errors, { message: action.payload.message, retryable: true }],
      };

    case 'REFRESH_START':
      return {
        ...state,
        isRefreshing: true,
      };

    case 'REFRESH_COMPLETE':
      return {
        ...state,
        isRefreshing: false,
        lastUpdated: Date.now(),
      };

    default:
      return state;
  }
}

const DashboardContext = createContext<{
  state: DashboardState;
  startLoading: () => void;
  refresh: () => void;
} | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { activeXpub, nostrNsec, nostrNpub } = useWallet();

  const startLoading = useCallback(() => {
    dispatch({ type: 'START_LOADING' });

    const controller = new AbortController();

    startBackgroundLoader({
      xpub: activeXpub ?? undefined,
      nsec: nostrNsec ?? undefined,
      npub: nostrNpub ?? undefined,

      onProgress: (progress) => {
        dispatch({ type: 'PROGRESS', payload: progress });
      },

      onBalance: (balance) => {
        dispatch({ type: 'BALANCE_UPDATE', payload: balance });
      },

      onTransactions: (transactions) => {
        dispatch({ type: 'TRANSACTIONS_UPDATE', payload: transactions });
      },

      onComplete: (data) => {
        dispatch({ type: 'COMPLETE', payload: data });
      },

      onError: (error) => {
        dispatch({ type: 'ERROR', payload: error });
      },

      signal: controller.signal,
    });

    return () => controller.abort();
  }, [activeXpub, nostrNsec, nostrNpub]);

  const refresh = useCallback(() => {
    dispatch({ type: 'REFRESH_START' });
    // Re-run loader with current credentials
    startLoading();
  }, [startLoading]);

  // Auto-start loading when wallet is set
  useEffect(() => {
    if (activeXpub || nostrNsec) {
      return startLoading();
    }
  }, [activeXpub, nostrNsec, startLoading]);

  return (
    <DashboardContext.Provider value={{ state, startLoading, refresh }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}
```

```typescript
// src/app/(app)/dashboard/page.tsx (using incremental state)

'use client';

import { useDashboard } from '@/contexts/dashboard-context';
import { OrbitalLoader } from '@/components/ui/orbital-loader';
import { DashboardSkeleton } from '@/components/dashboard/skeleton';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { TransactionsTable } from '@/components/dashboard/transactions-table';
import { SecurityCard } from '@/components/dashboard/security-card';
import { RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { state, refresh } = useDashboard();

  const showLoader = state.status === 'loading' && state.balance === null;
  const showPartialData = state.status === 'partial' || (state.status === 'loading' && state.balance !== null);
  const showFullData = state.status === 'ready';

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Progress indicator (shows during any loading) */}
      {(state.status === 'loading' || state.status === 'partial') && (
        <LoadingProgress
          stage={state.stage}
          stageNumber={state.stageNumber}
          message={state.message}
          addressesFound={state.addressesFound}
          transactionsLoaded={state.transactionsLoaded}
        />
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          balance={state.balance}
          isLoading={state.balance === null}
          isRefreshing={state.isRefreshing}
        />

        <SecurityCard
          // Security score requires AI analysis, loads last
          isLoading={state.status !== 'ready'}
        />

        <PerformanceCard
          transactions={state.transactions}
          isLoading={state.transactions.length === 0}
        />

        <ActivityCard
          transactions={state.transactions}
          isLoading={state.transactions.length === 0}
        />
      </div>

      {/* Transactions table */}
      <TransactionsTable
        transactions={state.transactions.slice(0, 5)}
        isLoading={state.status === 'loading' && state.transactions.length === 0}
        isPartial={state.status === 'partial'}
        totalCount={state.transactionsLoaded}
      />

      {/* Refresh button (only when ready) */}
      {state.status === 'ready' && (
        <button
          onClick={refresh}
          disabled={state.isRefreshing}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${state.isRefreshing ? 'animate-spin' : ''}`} />
          {state.isRefreshing ? 'Refreshing...' : 'Refresh data'}
        </button>
      )}

      {/* Error state (partial data still shown) */}
      {state.errors.length > 0 && (
        <ErrorBanner errors={state.errors} onRetry={refresh} />
      )}
    </div>
  );
}

function LoadingProgress({ stage, stageNumber, message, addressesFound, transactionsLoaded }) {
  return (
    <div className="bg-card rounded-lg p-6 border">
      <div className="flex items-center gap-6">
        <OrbitalLoader stage={stage} />

        <div className="flex-1">
          <p className="font-medium">{message}</p>

          {addressesFound > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Found {addressesFound} addresses
              {transactionsLoaded > 0 && ` · ${transactionsLoaded} transactions`}
            </p>
          )}

          {/* Stage progress bar */}
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(stageNumber / 4) * 100}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Stage {stageNumber} of 4
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Performance Budgets & Instrumentation

### 6.1 Target Times

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| **Auth validation** | <50ms | <100ms | >200ms |
| **Time to route** | <200ms | <500ms | >1s |
| **First dashboard paint** | <500ms | <1s | >2s |
| **First data visible** | <2s | <5s | >10s |
| **Time to interactive** | <3s | <8s | >15s |
| **Full load (small wallet)** | <10s | <20s | >30s |
| **Full load (large wallet)** | <30s | <60s | >120s |

### 6.2 What to Measure

```typescript
// src/lib/performance/metrics.ts

interface DashboardMetrics {
  // Timing
  authValidationMs: number;
  timeToRouteMs: number;
  firstPaintMs: number;
  firstDataMs: number;
  timeToInteractiveMs: number;
  fullLoadMs: number;

  // Counts
  addressesDiscovered: number;
  transactionsLoaded: number;
  apiCallsMade: number;
  cacheHits: number;
  cacheMisses: number;
  retries: number;

  // Context
  walletSize: 'small' | 'medium' | 'large';
  authType: 'xpub' | 'nostr';
  hadCache: boolean;
  hadErrors: boolean;
}

// Navigation timing
performance.mark('auth_start');
// ... validate
performance.mark('auth_end');
performance.measure('auth_validation', 'auth_start', 'auth_end');

// Route timing
performance.mark('route_start');
router.push('/dashboard');
// In dashboard:
performance.mark('dashboard_mounted');
performance.measure('time_to_route', 'auth_start', 'dashboard_mounted');

// First paint
performance.mark('first_data_rendered');
performance.measure('first_data_time', 'auth_start', 'first_data_rendered');
```

### 6.3 Instrumentation Checklist

```typescript
// What to log
const METRICS_TO_TRACK = [
  // Auth flow
  'auth.validation.duration',
  'auth.validation.type', // xpub vs nostr
  'auth.validation.error',

  // Routing
  'route.duration',
  'route.to_first_paint',

  // Cache
  'cache.check.duration',
  'cache.hit',
  'cache.miss',
  'cache.stale_serve',

  // Discovery
  'discovery.duration',
  'discovery.addresses_found',
  'discovery.batches_processed',

  // API calls
  'api.blockstream.duration',
  'api.blockstream.error',
  'api.mempool.duration',
  'api.mempool.error',
  'api.coingecko.duration',

  // Nostr (if applicable)
  'nostr.relay.connect.duration',
  'nostr.relay.connect.success',
  'nostr.xpubs.fetch.duration',

  // Retries
  'retry.count',
  'retry.reason',

  // Full flow
  'dashboard.full_load.duration',
  'dashboard.full_load.wallet_size',
];
```

### 6.4 Performance Budget Enforcement

```typescript
// In CI/CD or local dev
const PERFORMANCE_BUDGETS = {
  'auth.validation.duration': { warn: 50, error: 100 },
  'route.duration': { warn: 200, error: 500 },
  'route.to_first_paint': { warn: 500, error: 1000 },
  'discovery.duration': { warn: 10000, error: 30000 },
  'dashboard.full_load.duration': { warn: 15000, error: 60000 },
};

function checkPerformanceBudgets(metrics: Record<string, number>): BudgetResult[] {
  return Object.entries(PERFORMANCE_BUDGETS).map(([key, budget]) => {
    const value = metrics[key];
    if (value > budget.error) {
      return { key, status: 'error', value, threshold: budget.error };
    }
    if (value > budget.warn) {
      return { key, status: 'warn', value, threshold: budget.warn };
    }
    return { key, status: 'pass', value };
  });
}
```

---

## Assumptions Made

1. **XPUB validation can be done sync**: Using bitcoinjs-lib's validation is CPU-bound and completes in <10ms
2. **Nostr nsec → npub derivation is sync**: Cryptographic derivation is local and instant
3. **IndexedDB is available**: All modern browsers support it; localStorage fallback for edge cases
4. **Network is variable**: Design assumes 2G-5G mobile and WiFi connections
5. **Wallet sizes vary significantly**: Small (<10 addresses), Medium (10-100), Large (100-1000+)
6. **Users return frequently**: Caching strategy optimizes for repeat visits
7. **Partial data is better than no data**: Users prefer seeing something over a blank loading screen

---

## Summary

This design achieves the goal of **getting users to the dashboard as fast as possible** by:

1. **Zero network calls before routing** - Auth validation is pure client-side
2. **Immediate route on auth detection** - Target <200ms from click to navigation
3. **Background loading with incremental rendering** - Data appears as it arrives
4. **Premium loading UX** - Orbital animation + stage progress + reassuring microcopy
5. **Three-tier caching** - Memory → IndexedDB → localStorage for instant repeat visits
6. **Graceful degradation** - Dashboard remains usable even with partial failures

The state machine model ensures predictable transitions and the instrumentation checklist provides the data needed to prove and maintain these performance targets.
