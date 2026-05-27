# Bitcoin Tax Reporting - Frequently Asked Questions

## General Questions

### What is the Enhanced Tax Report feature?

The Enhanced Tax Report is a professional-grade Bitcoin tax analysis tool that calculates your capital gains, ordinary income, and tax optimization opportunities using multiple accounting methods and jurisdiction-specific rules. It's designed to help you understand and minimize your Bitcoin tax liability legally.

### Is this tool free to use?

Yes! BitSleuth is a free-to-use, open-source Bitcoin wallet analyzer (see LICENSE). The tax reporting feature is completely free and serves as an alternative to paid services like Koinly or CoinTracker.

### Can I use this report for my actual tax filing?

Our reports provide accurate calculations based on your transaction data, but they are informational tools. You should:
- Review the report with a qualified tax professional
- Verify all calculations before filing
- Use the exported data to prepare your actual tax forms
- Not rely solely on this tool for tax compliance

### Is my data secure?

Yes! BitSleuth runs entirely in your browser:
- Your XPUB and transaction data never leave your device
- We don't store or have access to your wallet information
- All calculations happen client-side
- No data is sent to our servers

## Accounting Methods

### Which accounting method should I use?

The choice depends on your jurisdiction and tax strategy:

- **US Taxpayers**: Default to FIFO unless you use specific identification
- **UK Taxpayers**: Must use Shared Pool (Section 104) with same-day and 30-day matching
- **Canadian Taxpayers**: Use Average Cost (adjusted cost base method)
- **Tax Optimization**: HIFO typically minimizes gains in bull markets
- **Flexibility**: Specific ID offers most control (requires documentation)

### Can I change my accounting method after the tax year?

Generally, no. You should:
- Choose your method at the beginning of the year
- Use it consistently throughout the year
- Document your choice if required by your jurisdiction
- Consult a tax professional before changing methods

### What's the difference between FIFO and HIFO?

**FIFO (First In, First Out)**:
- Sells oldest Bitcoin first
- Often results in higher gains if Bitcoin appreciated
- Required default method in many jurisdictions
- Example: If you bought at $10k, then $30k, selling uses $10k basis first

**HIFO (Highest In, First Out)**:
- Sells Bitcoin with highest cost basis first
- Minimizes capital gains
- Requires detailed lot tracking
- Example: Same scenario but sells $30k basis first, lower gain

### Does Specific Identification really require documentation?

Yes! For specific ID method:
- Must document lot selection at or before time of sale
- Keep records of which specific lot you're selling
- Email to yourself with timestamp works
- Can't reconstruct after the fact
- IRS requires contemporaneous records

## Tax Classifications

### What's the difference between short-term and long-term gains?

**Short-term Capital Gains**:
- Held 365 days or less (US) or jurisdiction threshold
- Taxed as ordinary income (higher rates)
- Same rate as your salary/wages
- Example: US 24% bracket = 24% tax on short-term gains

**Long-term Capital Gains**:
- Held more than 365 days (or jurisdiction threshold)
- Preferential lower tax rates
- Example: US 15% for most taxpayers (vs 22-24% ordinary)

**Why it matters**: $10,000 gain could be $2,400 tax (short) vs $1,500 tax (long) - $900 saved by waiting!

### What counts as a taxable disposal?

A taxable disposal occurs when you:
- ✅ Sell Bitcoin for fiat currency (USD, EUR, etc.)
- ✅ Trade Bitcoin for another cryptocurrency
- ✅ Spend Bitcoin to purchase goods or services
- ✅ Gift Bitcoin to someone (may vary by jurisdiction)
- ❌ Transfer between your own wallets (not taxable)
- ❌ Hold Bitcoin without selling (not taxable)

### Is transferring Bitcoin between my own wallets taxable?

No! Self-transfers are NOT taxable:
- Wallet-to-wallet transfers (same owner) = not taxable
- Exchange to personal wallet = not taxable  
- Cold storage to hot wallet = not taxable
- Network fees on self-transfers may be deductible

**Important**: Keep records to prove beneficial ownership didn't change.

### How is mining/staking taxed?

Mining and staking create **two tax events**:

**1. At Receipt (Ordinary Income)**:
- Taxed at fair market value when you receive it
- Added to your ordinary income
- Happens immediately upon receipt
- Example: Mine 0.1 BTC when price is $50,000 = $5,000 income

**2. At Sale (Capital Gain/Loss)**:
- Cost basis is FMV at receipt
- Gain/loss calculated from that basis
- Example: Later sell same 0.1 BTC for $60,000 = $10,000 proceeds - $5,000 basis = $5,000 capital gain

## Jurisdictions

### I'm in the US. What forms do I need?

**For Bitcoin taxes you'll need:**
- Form 8949 (Sales and Other Dispositions of Capital Assets)
  - Part I for short-term transactions
  - Part II for long-term transactions
- Schedule D (Capital Gains and Losses)
  - Aggregates Form 8949 totals
- Schedule 1 (Additional Income)
  - For mining/staking income (if applicable)
- Form 1040 (Individual Tax Return)
  - Includes question about cryptocurrency

Our tool can export Form 8949-ready CSV files!

### I'm in the UK. How does Section 104 pooling work?

UK taxpayers must use **Section 104 pooling**:

**Matching Order:**
1. **Same-day rule**: Disposals matched with acquisitions on same day first
2. **Bed and breakfast rule**: Disposals matched with acquisitions within next 30 days
3. **Section 104 pool**: Remaining disposals matched against the pool

**Pool Mechanics:**
- All acquisitions (after same-day and 30-day matching) go into one pool
- Pool has average cost basis
- Each disposal reduces the pool

**Example:**
```
Jan 1: Buy 1 BTC at £20,000
Feb 1: Buy 1 BTC at £30,000
Pool: 2 BTC with £50,000 total cost (£25,000 average)
Mar 1: Sell 1 BTC for £35,000
Gain: £35,000 - £25,000 = £10,000
Remaining pool: 1 BTC at £25,000
```

### What's the superficial loss rule in Canada?

**Canada's Superficial Loss Rule:**
- You sell at a loss
- You (or affiliated person) buy the same asset within 30 days before or after
- The loss is denied
- Denied loss is added to cost base of replacement asset

**Example:**
```
Dec 1: Sell 1 BTC for $40,000 (basis $50,000) = $10,000 loss
Dec 15: Buy 1 BTC for $42,000

Result:
- $10,000 loss denied for this year
- New BTC cost basis: $42,000 + $10,000 = $52,000
- Loss preserved for future sale
```

**Purpose**: Prevents tax-loss harvesting with immediate repurchase.

### Does Germany really have tax-free Bitcoin after 1 year?

Yes! **German tax treatment:**

**> 12 months:**
- Capital gains completely tax-free (0%)
- No limit on gains
- Applies to private sales
- Example: Buy at €10,000, sell at €100,000 after 1 year = €0 tax

**≤ 12 months:**
- Taxable at personal income rate
- €600 exemption per year
- Rates: 0% to 45% depending on income
- Example: €1,000 gain = €400 exempt, €600 taxable

**Important**: Lending or staking may extend the holding period to 10 years!

## Cost Basis and Fees

### What if I don't know my cost basis?

If you're missing cost basis records:

**Options:**
1. **Exchange exports**: Download CSV from exchanges you used
2. **Blockchain analysis**: Reconstruct from transaction history
3. **Historical price data**: Use BitSleuth's price data for dates
4. **Email confirmations**: Check old emails for purchase confirmations
5. **Bank statements**: Show fiat purchases
6. **Conservative estimate**: Use $0 basis (pays more tax, but safe)

**Best Practice**: Going forward, keep meticulous records!

### How are network fees treated?

**Network (miner) fees treatment varies by type:**

**On Purchases (buying BTC):**
- Add fees to cost basis
- Increases basis → reduces future gains
- Example: Buy 1 BTC for $50,000 + $20 fee = $50,020 basis

**On Sales (selling BTC):**
- Deduct fees from proceeds (some jurisdictions)
- Reduces proceeds → reduces gains
- Example: Sell for $60,000 - $30 fee = $59,970 proceeds

**On Self-Transfers:**
- May be deductible as investment expense (jurisdiction-dependent)
- Not added to cost basis (no purchase occurring)
- Keep records for potential deduction

**Exchange Fees:**
- Similar treatment to network fees
- Trading fees on buys increase basis
- Trading fees on sales reduce proceeds

### Can I add all fees to my cost basis?

**Generally yes for acquisition fees:**
- ✅ Network fees when buying
- ✅ Exchange trading fees on purchases
- ✅ Wire transfer fees to fund account
- ✅ Platform fees for acquiring Bitcoin

**Generally no for other fees:**
- ❌ Subscription fees for exchanges
- ❌ Monthly account fees
- ❌ Fees for services unrelated to acquisition
- ❌ Interest on borrowed funds (may be investment expense)

**When selling:**
- Most jurisdictions allow reducing proceeds by selling fees
- Check specific jurisdiction rules

## Tax Optimization

### What is tax-loss harvesting?

**Tax-loss harvesting is:**
- Selling Bitcoin at a loss to offset gains
- Reduces your taxable income
- Can carry losses forward to future years
- Legal and encouraged tax planning strategy

**How it works:**
```
2024 Transactions:
- Sold Bitcoin A: $20,000 gain
- Sold Bitcoin B: $8,000 loss
- Net gain: $12,000
- Tax saved: $8,000 × your tax rate
```

**Best practices:**
- Do it before year-end
- Check wash sale rules (don't currently apply to Bitcoin in US)
- Don't harvest losses you can't use
- Consider repurchasing after waiting period

### Can I use Bitcoin losses to offset other gains?

**In most jurisdictions, yes!**

**US:**
- Bitcoin losses offset other capital gains (stocks, bonds, real estate)
- Up to $3,000 of excess losses offset ordinary income per year
- Unlimited carryforward of excess losses

**UK:**
- Bitcoin losses offset other CGT gains in same year
- Carry forward unused losses indefinitely
- Can elect to carry back to previous year

**Canada:**
- Capital losses offset capital gains only (not other income)
- Carry back 3 years or forward indefinitely
- Apply 50% inclusion rate

**Australia:**
- Capital losses offset capital gains only
- Carry forward indefinitely
- Can't offset ordinary income

### When should I use HIFO vs FIFO?

**Use HIFO when:**
- ✅ You want to minimize current year gains
- ✅ You have multiple purchases at different prices
- ✅ Bitcoin price has appreciated significantly
- ✅ You keep detailed lot records
- ✅ Your jurisdiction allows it

**Use FIFO when:**
- ✅ Required by your jurisdiction (default for many)
- ✅ You want simpler record-keeping
- ✅ Your oldest lots have higher basis (bear market purchases)
- ✅ You want to convert short-term to long-term gains

**Example showing difference:**
```
Purchases:
Lot 1: 1 BTC at $20,000 (2 years ago)
Lot 2: 1 BTC at $40,000 (1 year ago)
Lot 3: 1 BTC at $60,000 (6 months ago)

Sell 1 BTC for $70,000:

FIFO: Sells Lot 1
Gain: $70,000 - $20,000 = $50,000 (long-term)

HIFO: Sells Lot 3
Gain: $70,000 - $60,000 = $10,000 (short-term)

HIFO saves: ($50,000 - $10,000) × tax rate
At 15% long-term rate: $6,000 saved!
```

### What are "harvestable losses"?

**Harvestable losses are:**
- Bitcoin positions currently worth less than you paid
- Unrealized losses that could be realized by selling
- Useful for offsetting realized gains in same tax year

**In BitSleuth:**
- **Optimization Tab** shows all harvestable losses
- Sorted by potential tax benefit
- Separated into short-term and long-term
- Shows exact loss amount per lot

**Strategy:**
```
Your situation:
- Realized gains: $30,000
- Harvestable losses: $10,000

Action:
- Sell loss positions before year-end
- New taxable gains: $20,000
- Tax savings: $10,000 × your tax rate
```

**Important**: Consider wash sale or superficial loss rules in your jurisdiction!

## Using the Tool

### How do I change the reporting period?

1. Go to Report (Beta) → Enhanced Tax Report
2. Click the date range selector (calendar icon)
3. Choose from:
   - **This Year**: Current tax year
   - **Last Year**: Previous tax year
   - **Last 12 Months**: Rolling 12-month period
   - **Specific Year**: Click year button (e.g., "2023")
   - **Custom Range**: Select start and end dates on calendar

Most users select a full tax year (Jan 1 - Dec 31).

### How do I edit a transaction category?

1. Navigate to **Capital Gains** tab
2. Find the transaction in the table
3. Click the **Edit icon** (pencil) in the Actions column
4. Select correct category from dropdown:
   - **Disposals**: SALE, TRADE, SPEND, GIFT
   - **Income**: MINING, STAKING, AIRDROP, GIFT, FORK, INTEREST, OTHER
5. Click **Save Changes**

Category changes update calculations immediately.

### What's the difference between Tax Lots and UTXO Tracking tabs?

**Tax Lots Tab:**
- Simple view of remaining lots
- Shows: acquisition date, amount, cost basis, current value
- Good for quick overview
- Shows unrealized gains

**UTXO Tracking Tab:**
- Detailed UTXO-level analysis
- Shows utilization (how much sold from each lot)
- Includes depleted lots history
- Statistics on active vs depleted lots
- Progress bars showing lot usage
- Better for detailed planning and audit trails

Both show the same underlying data, just different levels of detail.

### How do I export to PDF?

1. Scroll to bottom of page
2. Find **"Export Tax Report"** section
3. Click **"Generate PDF Report"** for comprehensive report
4. Or click **"Generate Form 8949 PDF"** for US IRS form (US only)
5. PDF downloads automatically to your browser's download folder

**PDF includes:**
- Executive summary
- Capital gains details
- Income events
- Tax lot inventory
- Tax optimization opportunities
- Disclaimer

### What CSV files should I download?

**For tax filing:**
- **Capital Gains CSV**: Required for most tax software
- **Form 8949 CSV (US)**: If using US tax software like TurboTax
- **Tax Summary CSV**: For your records

**For planning:**
- **Tax Lots CSV**: Shows unrealized positions
- **Income CSV**: Separate income tracking

**For accountant:**
- **Complete Package**: Downloads everything at once
- Or **PDF Report**: Professional formatted overview

### Can I import data from exchanges?

Currently, BitSleuth works with XPUBs (extended public keys) to automatically fetch your Bitcoin transaction history. It doesn't directly import exchange CSV files.

**To analyze exchange holdings:**
1. Withdraw Bitcoin from exchange to your XPUB-based wallet
2. BitSleuth will track from that point forward
3. For historical exchange trades, you'll need to manually reconstruct the cost basis

**Future enhancement**: Exchange API integration is planned.

## Troubleshooting

### Why are my disposals showing $0 cost basis?

This usually means:
- Transactions occurred before you started tracking
- Missing historical price data
- Self-transfers incorrectly classified as income

**Solutions:**
1. Extend reporting period to include first purchase
2. Check that self-transfers aren't counted as acquisitions
3. Verify historical price data is loading
4. Edit transaction categories if needed

### My short-term/long-term split seems wrong

**Common causes:**
1. **Incorrect accounting method**: Switch to FIFO/LIFO in settings
2. **Same-day matching (UK)**: UK rules match same-day first
3. **Date boundaries**: Check exact 365-day threshold
4. **Timezone issues**: Dates are calculated in UTC

**Verify:**
- Check individual lot holding periods in Tax Lots tab
- Confirm your jurisdiction's long-term threshold
- Review the disposal details table

### The numbers don't match my exchange

**BitSleuth calculates from on-chain data:**
- Uses Bitcoin blockchain transactions
- May not capture off-chain exchange trades
- Shows actual Bitcoin movements, not exchange balances

**Exchange shows different numbers when:**
- Trades happen within exchange (off-chain)
- You haven't withdrawn to on-chain wallet
- Exchange uses different cost basis method

**Best practice:**
- Use exchange exports for exchange-based trading
- Use BitSleuth for on-chain wallet activity
- Combine both for complete picture

### I have more questions

**Resources:**
- **Documentation**: Read the full [Tax Reporting Guide](./TAX_REPORTING_GUIDE.md)
- **GitHub Issues**: [Report bugs or request features](https://github.com/BitSleuthAI/Analyzer/issues)
- **Tax Professional**: Always consult a qualified CPA or tax advisor
- **Tax Authority**: Check official guidance from your jurisdiction's tax authority

## Disclaimer

This FAQ is for informational purposes only and does not constitute tax, legal, or financial advice. Tax laws vary by jurisdiction and individual circumstances. Always consult with a qualified tax professional before making tax-related decisions.

Bitcoin tax law is evolving. Rules and interpretations may change. Stay informed about developments in your jurisdiction.

---

**Last Updated:** December 2024  
**For Support:** [Open an issue](https://github.com/BitSleuthAI/Analyzer/issues) on GitHub
