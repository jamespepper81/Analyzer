# Bitcoin Tax Accounting Methods - Quick Reference

## Overview

Your choice of accounting method determines which Bitcoin units are considered sold first when you make a disposal. This directly impacts your capital gains calculations and tax liability.

## Method Comparison Table

| Method | Best For | Typical Tax Impact | Complexity | Jurisdiction Rules |
|--------|----------|-------------------|------------|-------------------|
| **FIFO** | Long-term holders | Higher gains in bull markets | Low | Default in US, required in many jurisdictions |
| **LIFO** | Active traders | Lower gains in bull markets | Low | Not allowed in all jurisdictions |
| **HIFO** | Tax optimization | Minimal gains | Medium | Requires detailed tracking |
| **Specific ID** | Maximum control | Variable (you choose) | High | Requires contemporaneous documentation |
| **Average Cost** | Simplicity | Moderate | Low | Required in Canada |
| **Shared Pool** | UK compliance | Moderate | Medium | Required in UK (Section 104) |

## Detailed Method Descriptions

### FIFO (First In, First Out)

**How it works:** Sells the oldest Bitcoin first (earliest purchases)

**Example:**
```
Timeline:
Jan 2023: Buy 1 BTC at $20,000
Jun 2023: Buy 1 BTC at $50,000
Dec 2023: Sell 0.5 BTC at $60,000

FIFO calculation:
Uses Jan purchase: 0.5 × $20,000 = $10,000 cost basis
Proceeds: 0.5 × $60,000 = $30,000
Gain: $30,000 - $10,000 = $20,000 (Long-term if >365 days)
```

**Advantages:**
- ✅ Simple to understand and implement
- ✅ Default method accepted everywhere
- ✅ Often qualifies for long-term rates (oldest = longest held)
- ✅ No special documentation required
- ✅ Minimal record-keeping

**Disadvantages:**
- ❌ Usually produces highest gains in bull markets
- ❌ Less tax flexibility
- ❌ May not be optimal for tax minimization

**Use when:**
- You're a long-term holder
- You bought Bitcoin early and it's appreciated
- Your jurisdiction requires FIFO
- You want simplicity

---

### LIFO (Last In, First Out)

**How it works:** Sells the newest Bitcoin first (latest purchases)

**Example:**
```
Timeline:
Jan 2023: Buy 1 BTC at $20,000
Jun 2023: Buy 1 BTC at $50,000
Dec 2023: Sell 0.5 BTC at $60,000

LIFO calculation:
Uses Jun purchase: 0.5 × $50,000 = $25,000 cost basis
Proceeds: 0.5 × $60,000 = $30,000
Gain: $30,000 - $25,000 = $5,000 (Short-term)
```

**Advantages:**
- ✅ Lower gains in appreciating markets
- ✅ Useful for tax-loss harvesting
- ✅ Can defer selling low-basis lots
- ✅ Simple to implement

**Disadvantages:**
- ❌ Often produces short-term gains (higher tax rates)
- ❌ Not allowed in some jurisdictions
- ❌ May not align with long-term investment strategy

**Use when:**
- You're actively trading
- Bitcoin price is rising rapidly
- You want to minimize current-year gains
- Recent purchases have higher basis

**⚠️ Check jurisdiction:** LIFO may not be permitted in your country.

---

### HIFO (Highest In, First Out)

**How it works:** Sells Bitcoin with the highest cost basis first (most expensive purchases)

**Example:**
```
Timeline:
Jan 2023: Buy 1 BTC at $20,000
Jun 2023: Buy 1 BTC at $50,000
Sep 2023: Buy 1 BTC at $40,000
Dec 2023: Sell 0.5 BTC at $60,000

HIFO calculation:
Uses Jun purchase (highest): 0.5 × $50,000 = $25,000 cost basis
Proceeds: 0.5 × $60,000 = $30,000
Gain: $30,000 - $25,000 = $5,000
```

**Advantages:**
- ✅ Minimizes capital gains
- ✅ Optimal for tax reduction in bull markets
- ✅ Retains low-basis lots for future long-term treatment
- ✅ Flexibility in tax planning

**Disadvantages:**
- ❌ Requires detailed lot tracking
- ❌ More complex record-keeping
- ❌ May produce short-term gains if highest basis is recent
- ❌ Needs careful documentation

**Use when:**
- You want to minimize taxes
- You have purchases at varying prices
- You can maintain detailed records
- Your jurisdiction permits HIFO

---

### Specific Identification (SpecID)

**How it works:** You manually specify which exact lots to sell for each disposal

**Example:**
```
Holdings:
Lot A: 1 BTC at $20,000 (2 years old) - Long-term
Lot B: 1 BTC at $50,000 (6 months old) - Short-term
Lot C: 1 BTC at $40,000 (1.5 years old) - Long-term

December Sale: 0.5 BTC at $60,000

Your choice: Sell from Lot B
Reason: Highest basis, minimize gain
Gain: $30,000 - $25,000 = $5,000 (Short-term)

OR choose: Sell from Lot A
Reason: Long-term rates lower than short-term
Gain: $30,000 - $10,000 = $20,000 (Long-term at 15% vs 24%)
Tax: $3,000 (15%) vs $1,200 (24% on $5,000) - you save more!
```

**Advantages:**
- ✅ Maximum flexibility and control
- ✅ Can optimize for specific tax situations
- ✅ Mix of minimizing gains AND optimizing rates
- ✅ Can choose based on timing needs

**Disadvantages:**
- ❌ **Requires contemporaneous documentation** (document BEFORE or AT TIME of sale)
- ❌ Complex record-keeping
- ❌ Must specify at time of sale, not later
- ❌ IRS/tax authority scrutiny if audited

**Use when:**
- You're sophisticated with taxes
- You have a complex portfolio
- You can document lot selection properly
- You want maximum control

**⚠️ Critical:** You MUST document which lot you're selling at the time of sale. Can't reconstruct later!

**How to document:**
- Email yourself: "Selling 0.5 BTC from lot acquired [date] with basis [$amount]"
- Broker instructions: Tell exchange/broker specific lot
- Trading journal: Record in contemporaneous notes
- Timestamp important: Must be at or before trade execution

---

### Average Cost

**How it works:** Calculates weighted average cost basis of all Bitcoin holdings

**Example:**
```
Holdings:
Purchase 1: 1 BTC at $20,000
Purchase 2: 1 BTC at $50,000
Purchase 3: 1 BTC at $40,000

Average Cost Calculation:
Total BTC: 3 BTC
Total Cost: $20,000 + $50,000 + $40,000 = $110,000
Average: $110,000 ÷ 3 = $36,667 per BTC

Sell 0.5 BTC at $60,000:
Cost basis: 0.5 × $36,667 = $18,333
Proceeds: 0.5 × $60,000 = $30,000
Gain: $30,000 - $18,333 = $11,667

Remaining holdings:
2.5 BTC with total cost: $110,000 - $18,333 = $91,667
New average: $91,667 ÷ 2.5 = $36,667 (same)
```

**Advantages:**
- ✅ Simple to calculate
- ✅ Smooth out basis fluctuations
- ✅ Required method in some jurisdictions
- ✅ Fair representation of total investment

**Disadvantages:**
- ❌ Less tax optimization potential
- ❌ Can't choose specific lots
- ❌ Not permitted in all jurisdictions
- ❌ Average changes with each transaction

**Use when:**
- Required by your jurisdiction (e.g., Canada)
- You prefer simplicity
- You have many small purchases
- You don't need to optimize lot selection

**Note:** This is the **Adjusted Cost Base (ACB)** method required in Canada.

---

### Shared Pool (UK Section 104)

**How it works:** UK-specific method with multiple matching rules applied in order

**Matching Order:**
1. **Same-day matching**: Disposals matched with acquisitions on the same day first
2. **30-day bed-and-breakfast rule**: Disposals matched with acquisitions in next 30 days
3. **Section 104 pool**: Remaining disposals matched against the pooled average

**Example:**
```
Timeline:
Jan 1: Buy 1 BTC at £20,000
Feb 1: Buy 1 BTC at £30,000
Mar 1: Sell 1 BTC at £35,000
Mar 15: Buy 1 BTC at £32,000

Step 1 - Same-day matching:
No acquisition on Mar 1, so skip

Step 2 - 30-day bed-and-breakfast:
Acquisition on Mar 15 (within 30 days after disposal)
Match: £35,000 proceeds - £32,000 basis = £3,000 gain

If NO repurchase on Mar 15:
Step 3 - Section 104 pool:
Pool: 2 BTC at £50,000 (£25,000 average)
Match against pool: £35,000 - £25,000 = £10,000 gain
Remaining pool: 1 BTC at £25,000
```

**Advantages:**
- ✅ Required for UK compliance
- ✅ Prevents bed-and-breakfast tax avoidance
- ✅ Clear rules from HMRC
- ✅ Automated in BitSleuth

**Disadvantages:**
- ❌ Complex three-step matching process
- ❌ Bed-and-breakfast rule limits loss harvesting
- ❌ Must track pool continuously
- ❌ UK-specific (not useful elsewhere)

**Use when:**
- You're a UK taxpayer (required by law)
- You file taxes with HMRC
- You need to be compliant with UK CGT rules

**⚠️ UK taxpayers must use this method** - it's not optional.

## Choosing the Right Method

### Decision Tree

```
START: Which accounting method should I use?

┌─ Is your jurisdiction's method REQUIRED?
│  ├─ Yes ─→ Use required method:
│  │         • UK → Shared Pool (Section 104)
│  │         • Canada → Average Cost
│  │         • US (default) → FIFO
│  │         • Check local rules
│  │
│  └─ No ─→ Continue ↓

┌─ What's your priority?
│  
│  ├─ TAX OPTIMIZATION (minimize gains)
│  │  ├─ Can you track lots in detail? ─→ HIFO or Specific ID
│  │  └─ Want simplicity? ─→ LIFO (if allowed)
│  │
│  ├─ LONG-TERM HOLDING
│  │  └─ FIFO (benefits from long-term rates)
│  │
│  ├─ SIMPLICITY
│  │  └─ FIFO or Average Cost
│  │
│  └─ MAXIMUM CONTROL
│     └─ Specific ID (requires documentation)
```

### By Investor Type

**Long-term Buy-and-Hold Investor:**
- **Best**: FIFO
- **Alternative**: Specific ID (for occasional optimization)
- **Avoid**: LIFO (creates short-term gains)

**Active Trader:**
- **Best**: HIFO (minimize gains)
- **Alternative**: LIFO or Specific ID
- **Avoid**: FIFO (maximizes gains in bull markets)

**Tax Optimizer:**
- **Best**: Specific ID (maximum flexibility)
- **Alternative**: HIFO (good balance)
- **Avoid**: Average Cost (no lot selection)

**Simple/Casual User:**
- **Best**: FIFO or Average Cost
- **Alternative**: Default method for jurisdiction
- **Avoid**: Specific ID (too complex)

## Common Scenarios

### Scenario 1: Bull Market, Want to Minimize Gains

**Setup:**
```
Multiple purchases at increasing prices:
$10k, $20k, $30k, $40k, $50k
Now selling at $60k
```

**Best Method:** HIFO
- Sells $50k basis first
- Gain: $10k per unit

**Why not FIFO:**
- Would sell $10k basis first
- Gain: $50k per unit
- 5× higher gain!

---

### Scenario 2: Need Long-Term Capital Gains Rate

**Setup:**
```
Lot A: $20k basis, bought 13 months ago (long-term)
Lot B: $45k basis, bought 6 months ago (short-term)
Selling at $50k
```

**Best Method:** Specific ID
- Choose Lot A
- Gain: $30k (but long-term rate: 15%)
- Tax: $4,500

**Why not HIFO:**
- Would choose Lot B
- Gain: $5k (but short-term rate: 24%)
- Tax: $1,200
- **Actually saves more!** $5k × 24% < $30k × 15%

**Lesson:** Sometimes higher gain at lower rate is better!

---

### Scenario 3: Tax-Loss Harvesting Year-End

**Setup:**
```
Have $50k realized gains
Lot C: $60k basis, now worth $40k (-$20k unrealized loss)
```

**Best Method:** Specific ID
- Choose Lot C to sell
- Realize $20k loss
- Offset against $50k gain
- Net taxable: $30k
- Saves: $20k × your tax rate

---

### Scenario 4: Canadian Taxpayer

**Setup:**
```
Canada requires Average Cost method
Multiple purchases need tracking
```

**Required Method:** Average Cost (ACB)
- Must use regardless of optimization
- CRA requires this method
- Calculate weighted average continuously

---

## Method Comparison: Same Sale Different Methods

**Given:**
- Purchase 1: 1 BTC at $10,000 (2 years ago)
- Purchase 2: 1 BTC at $30,000 (1 year ago)
- Purchase 3: 1 BTC at $50,000 (6 months ago)
- Sale: 1 BTC at $60,000

**Results by Method:**

| Method | Lot Used | Cost Basis | Gain | Term | Tax Rate* | Tax* |
|--------|----------|------------|------|------|-----------|------|
| FIFO | Purchase 1 | $10,000 | $50,000 | Long | 15% | $7,500 |
| LIFO | Purchase 3 | $50,000 | $10,000 | Short | 24% | $2,400 |
| HIFO | Purchase 3 | $50,000 | $10,000 | Short | 24% | $2,400 |
| SpecID (choose 2) | Purchase 2 | $30,000 | $30,000 | Long | 15% | $4,500 |
| Avg Cost | All (avg) | $30,000 | $30,000 | Mixed | 15-24% | $4,500-$7,200 |

*Assuming US rates: 15% long-term, 24% short-term for illustration

**Key Insights:**
- FIFO: Highest gain, but long-term rate
- LIFO/HIFO: Lowest gain, but short-term rate
- Specific ID: Can optimize for best after-tax result
- Average Cost: Middle ground, no optimization

**Best choice depends on:**
- Your tax bracket
- Short vs long-term rate difference
- Whether you can use the method (jurisdiction rules)

## Implementation in BitSleuth

### Switching Methods

1. Go to **Report (Beta)** → **Enhanced Tax Report**
2. Find **Tax Report Configuration** section
3. Select **Accounting Method** dropdown
4. Choose your method
5. Report regenerates automatically

### Viewing Method Impact

**Before changing:**
- Note current capital gains in Overview tab
- Screenshot if desired for comparison

**After changing:**
- Compare new capital gains calculation
- Check disposal details to see which lots were used
- Review tax lots to see remaining basis

**Example comparison:**
```
FIFO: $50,000 total gains
Switch to HIFO: $20,000 total gains
Potential savings: $30,000 × your tax rate
```

### Documentation for Specific ID

If using Specific ID in BitSleuth:
1. Before selling, document your choice
2. Use **Edit** button on disposal to confirm category
3. Keep external records (email to yourself)
4. Screenshot the lot you're selecting
5. Note date, time, and specific lot details

## Best Practices

### Record Keeping

**For All Methods:**
- ✅ Keep all exchange statements
- ✅ Download wallet transaction exports
- ✅ Save BitSleuth reports (PDF and CSV)
- ✅ Maintain annual tax summaries

**For HIFO/Specific ID:**
- ✅ Detailed lot tracking spreadsheet
- ✅ Screenshots of lot selections
- ✅ Email trail of decisions
- ✅ Trading journal with contemporaneous notes

### Consistency

**Important:**
- Use the same method all year
- Don't switch mid-year (unless jurisdiction change)
- Document method choice for audit defense
- If changing methods, note why and when

### Professional Advice

**When to consult a tax professional:**
- Switching from FIFO to another method
- Using Specific ID for first time
- Large capital gains (>$50k)
- Complex situation with multiple jurisdictions
- If unsure which method is optimal for you

## Disclaimer

This guide is for educational purposes only. Tax rules vary by jurisdiction and individual circumstances. Always consult with a qualified tax professional before making decisions about accounting methods for your taxes.

The choice of accounting method can significantly impact your tax liability. While BitSleuth calculates accurately for each method, the legal implications and optimal choice depend on your specific situation, jurisdiction, and tax strategy.

---

**Last Updated:** December 2024  
**For Support:** [Open an issue](https://github.com/BitSleuthAI/Analyzer/issues) on GitHub
