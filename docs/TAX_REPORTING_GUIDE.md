# BitSleuth Tax Reporting Guide

## Overview

BitSleuth now includes a comprehensive, professional-grade Bitcoin tax reporting tool that serves as a free, open-source alternative to Koinly. This guide covers all features and how to use them effectively.

## Features

### 🧮 Tax Calculation Engine

#### Accounting Methods (6 supported)
1. **FIFO (First In, First Out)** - Default for US; sells oldest Bitcoin first
2. **LIFO (Last In, First Out)** - Sells newest Bitcoin first
3. **HIFO (Highest In, First Out)** - Sells most expensive Bitcoin first to minimize gains
4. **Specific Identification** - Manually specify which lots to sell
5. **Average Cost** - Uses average cost of all holdings (common in Canada)
6. **Shared Pool (UK Section 104)** - UK-specific method with same-day and 30-day matching

#### Jurisdiction Support (6 jurisdictions)
1. **United States** - IRS rules, long-term >365 days
2. **United Kingdom** - HMRC rules, Section 104, same-day and 30-day matching
3. **Canada** - CRA rules, 50% inclusion rate, superficial loss rules
4. **Australia** - ATO rules, 50% CGT discount for >12 months
5. **Germany** - Tax-free after 1 year, €600 exemption
6. **Other** - Generic international rules

### 📊 User Interface

#### Four-Tab Interface

**1. Overview Tab**
- Total capital gains summary
- Short-term vs long-term breakdown
- Ordinary income (mining, staking)
- Unrealized gains
- Harvestable losses
- Portfolio performance chart
- Transaction summary statistics

**2. Capital Gains Tab**
- Detailed disposal events
- Each transaction shows:
  - Date and type
  - Amount disposed
  - Proceeds received
  - Cost basis
  - Realized gain/loss
  - Term (short/long)
- Income events section (mining, staking, airdrops)

**3. Tax Lots Tab**
- Complete inventory of remaining lots
- For each lot:
  - Acquisition date
  - Amount remaining
  - Cost basis
  - Current value
  - Unrealized gain/loss
  - Holding period
  - Tax term classification

**4. Tax Optimization Tab**
- Harvestable loss identification
- Potential tax savings
- Strategic recommendations:
  - Tax-loss harvesting opportunities
  - Lots approaching long-term status
  - Optimization strategies
- Separate short-term and long-term tracking

### 📤 Export Functionality

#### Available Exports

1. **Capital Gains CSV**
   - Complete disposal event record
   - Compatible with tax software
   - Format: Date, Type, Amount, Proceeds, Cost Basis, Gain/Loss, Term

2. **Tax Summary CSV**
   - High-level summary
   - Includes all key metrics
   - Quick reference format

3. **Tax Lots CSV**
   - Detailed lot inventory
   - Useful for planning
   - Shows unrealized gains by lot

4. **Income CSV**
   - Mining, staking, and other income events
   - Separate from capital gains
   - FMV at receipt

5. **IRS Form 8949 CSV (US only)**
   - Pre-formatted for IRS submission
   - Separate short-term and long-term files
   - Ready for Schedule D

6. **Text Report**
   - Human-readable formatted report
   - Suitable for printing
   - Includes disclaimers

7. **Complete Package**
   - One-click download of all reports
   - Comprehensive record keeping
   - Includes jurisdiction-specific exports

### 📚 In-App Help System

Comprehensive 5-tab help dialog covering:

1. **Tax Basics**
   - Cost basis concepts
   - Realized vs unrealized gains
   - Taxable events
   - Key terminology

2. **Accounting Methods**
   - Detailed explanation of each method
   - When to use each
   - Tax impact comparison
   - Best practices

3. **Jurisdictions**
   - Rules for each supported country
   - Long-term holding periods
   - Special rules (wash sale, bed & breakfast, etc.)
   - Tax rates and thresholds

4. **Tax Optimization**
   - Tax-loss harvesting guide
   - Holding period optimization
   - HIFO method selection
   - Charitable donation strategies
   - Income smoothing

5. **Export Formats**
   - Explanation of each export type
   - When to use each format
   - Record keeping best practices

## How to Use

### Getting Started

1. **Navigate to Report Page**
   - Click "Report" in the sidebar
   - Toggle to "Enhanced Tax Report" tab if not default

2. **Configure Report**
   - Select date range (tax year recommended)
   - Choose accounting method
   - Select your tax jurisdiction

3. **Review Results**
   - Overview tab shows summary
   - Check all four tabs for complete picture
   - Use help button for guidance

4. **Export for Filing**
   - Download appropriate exports
   - Use Form 8949 if in US
   - Keep complete package for records

### Best Practices

#### Choosing Accounting Method
- **US taxpayers**: FIFO is default, but HIFO minimizes taxes
- **UK taxpayers**: Use Shared Pool (Section 104)
- **Canada**: Average Cost is common
- **Others**: HIFO generally minimizes liability

#### Tax Optimization
1. Review "Tax Optimization" tab before year-end
2. Identify harvestable losses
3. Check lots approaching long-term status
4. Consider waiting for long-term rates if close
5. Use HIFO to minimize gains when selling

#### Record Keeping
- Export complete package annually
- Keep all reports for 7+ years
- Document any manual adjustments
- Include supporting transaction records

### Understanding Results

#### Short-Term vs Long-Term
- **Short-term**: Held ≤ threshold (usually 1 year)
  - Taxed at higher rates (ordinary income in US)
  - No preferential treatment
  
- **Long-term**: Held > threshold
  - Lower tax rates in many jurisdictions
  - 0-20% in US vs 10-37% for short-term
  - 50% discount in Australia
  - Tax-free in Germany

#### Cost Basis
Your cost basis includes:
- Purchase price of Bitcoin
- Exchange fees
- Network transaction fees (for purchases)

Never includes:
- Selling fees (reduces proceeds instead)
- Fees for non-taxable transfers

#### Realized vs Unrealized
- **Realized**: Actual gains from sales, taxable now
- **Unrealized**: Paper gains on holdings, not taxable until sold

## Tax Optimization Strategies

### Tax-Loss Harvesting

**What it is:** Selling assets with losses to offset gains

**How to do it:**
1. Go to Tax Optimization tab
2. Review harvestable losses section
3. Sell lots with largest losses before year-end
4. Use losses to offset gains dollar-for-dollar
5. Excess losses can offset income (up to $3,000/year in US)

**Important rules:**
- **US**: No wash sale rule for crypto (yet)
- **UK**: 30-day bed & breakfast rule - don't repurchase within 30 days
- **Canada**: 30-day superficial loss rule - similar to UK

### Holding Period Optimization

**Strategy:** Time sales to qualify for long-term rates

**Example:** 
- Bitcoin purchased on Jan 1, 2023
- Held until Jan 2, 2024 (1 year + 1 day)
- Now qualifies for long-term rates
- Could save 10-20% in taxes (US)

**Use the tool:**
- Check Tax Lots tab for holding periods
- Look for "approaching long-term" alerts
- Wait a few more days for significant savings

### Method Selection

**HIFO for minimizing gains:**
```
Example portfolio:
Lot A: 0.1 BTC bought at $30,000 = $3,000
Lot B: 0.1 BTC bought at $40,000 = $4,000
Lot C: 0.1 BTC bought at $50,000 = $5,000
Current price: $60,000

Selling 0.1 BTC:
- FIFO: Sells Lot A, gain = $6,000 - $3,000 = $3,000
- HIFO: Sells Lot C, gain = $6,000 - $5,000 = $1,000
Tax savings: 20% × $2,000 difference = $400
```

## Jurisdiction-Specific Guidance

### United States 🇺🇸

**Key Points:**
- Report on Form 8949 and Schedule D
- Long-term >365 days: 0%, 15%, or 20% rates
- Short-term ≤365 days: ordinary income rates (10-37%)
- $3,000 annual loss limit against income
- Wash sale doesn't apply to crypto (as of 2024)

**BitSleuth exports:**
- Form 8949 CSV (short and long-term)
- Capital gains CSV
- Summary CSV

### United Kingdom 🇬🇧

**Key Points:**
- Section 104 pooling method
- Same-day matching: acquisitions on sale day matched first
- Bed & breakfast: purchases within 30 days matched before pool
- Annual exemption: £6,000 (2023/24)
- CGT rates: 10% or 20% depending on income

**Use:**
- Select "Shared Pool" method
- Tool automatically applies same-day and 30-day rules
- Capital gains CSV for Self Assessment

### Canada 🇨🇦

**Key Points:**
- 50% inclusion rate (half of gain is taxable)
- Average cost method common
- Superficial loss rule: 30-day repurchase denies loss
- Business vs capital distinction important

**Use:**
- Select "Average Cost" method
- Review for superficial losses
- Capital gains CSV for tax filing

### Australia 🇦🇺

**Key Points:**
- CGT discount: 50% off gains for >12 months
- Personal use exemption possible
- Report on tax return

**Use:**
- Tool shows 50% discount eligibility
- Check long-term lots for discount
- Capital gains CSV for return

### Germany 🇩🇪

**Key Points:**
- Tax-free if held >1 year
- €600 annual allowance for gains
- Progressive tax up to 45% if held ≤1 year

**Use:**
- Focus on 1-year holding period
- Lots >1 year show as tax-free
- Minimize sales of short-term holdings

## Integration with Tax Software

### Importing to Tax Software

Most tax software (TurboTax, TaxAct, H&R Block, etc.) accepts CSV imports:

1. Export Capital Gains CSV or Form 8949 CSV
2. In your tax software, find "Import" or "Upload"
3. Select "Investment sales" or "Form 8949"
4. Upload the CSV file
5. Review imported transactions
6. Software will calculate totals automatically

### Working with Accountants

For accountant review:

1. Download Complete Package
2. Include:
   - Capital gains CSV
   - Tax summary CSV
   - Text report (readable format)
   - Tax lots CSV (for planning)
3. Provide supporting documentation:
   - Exchange records
   - Wallet transaction history
   - Historical price sources

## Technical Details

### Cost Basis Calculation

The tool uses **lot-level tracking** for accurate cost basis:

```
Example transaction flow:
Buy 1.0 BTC at $30,000 (Lot A)
Buy 0.5 BTC at $40,000 (Lot B)
Sell 0.75 BTC at $50,000

FIFO method:
- Sells all of Lot A (1.0 BTC)
- But only 0.75 BTC sold total
- So: 0.75 BTC from Lot A
- Cost basis: 0.75 × $30,000 = $22,500
- Proceeds: 0.75 × $50,000 = $37,500
- Gain: $15,000

HIFO method:
- Sells from Lot B first (highest cost)
- Lot B: 0.5 BTC at $40,000
- Need 0.25 BTC more from Lot A
- Cost basis: (0.5 × $40,000) + (0.25 × $30,000) = $27,500
- Proceeds: $37,500
- Gain: $10,000

Tax savings: $5,000 × 20% = $1,000
```

### Unrealized Gains

Calculated as:
```
Unrealized Gain = (Current Price × Amount) - Cost Basis

For each lot:
Lot unrealized = (Current BTC price × Lot amount) - (Lot cost per unit × Lot amount)

Total unrealized = Sum of all lot unrealized gains
```

### Harvestable Losses

Identified as:
```
For each lot:
  If unrealized gain < 0:
    If holding period < long-term threshold:
      Add to harvestable short-term losses
    Else:
      Add to harvestable long-term losses
```

## Common Questions

### Q: Can I change accounting methods?
**A:** Yes, but check your jurisdiction's rules. US allows any method but must be used consistently. UK requires Section 104. Change the selector and report regenerates automatically.

### Q: What if I have multiple wallets?
**A:** Currently, the tool analyzes one XPUB at a time. For multiple wallets, generate separate reports and combine manually. Future versions may support aggregation.

### Q: Are fees included in cost basis?
**A:** Yes, purchase fees are included in cost basis. Selling fees are deducted from proceeds. This is handled automatically.

### Q: What about mining/staking income?
**A:** Shown separately in Income Events section. These are taxed as ordinary income at fair market value upon receipt. When later sold, capital gains apply on any price change since receipt.

### Q: Can I edit transactions?
**A:** Not currently in the UI. The tool uses blockchain data directly. For corrections, you'll need to note adjustments separately for your accountant.

### Q: Is this IRS/HMRC/CRA approved?
**A:** The tool follows published guidelines for each tax authority. However, it's for informational purposes only. Always consult a qualified tax professional.

### Q: What about crypto-to-crypto trades?
**A:** Most jurisdictions treat these as taxable disposals. The tool classifies sales (including trades) as disposal events and calculates gains/losses. Receiving side establishes new cost basis.

### Q: Do self-transfers trigger taxes?
**A:** No. The tool detects self-transfers (same wallet sending to itself) and excludes them from taxable events.

## Limitations & Future Enhancements

### Current Limitations
- Single wallet analysis (no aggregation)
- Bitcoin only (no altcoins or tokens)
- No DeFi transaction support
- No NFT tracking
- No PDF generation (CSV/text only)
- No transaction editing UI

### Planned Enhancements
- Multi-wallet aggregation
- PDF report generation
- Manual transaction adjustment
- DeFi transaction support
- More jurisdictions (France, Spain, Japan)
- Historical data import
- Portfolio simulation ("what if" scenarios)

## Disclaimer

**Important:** This tool is for informational purposes only and does not constitute tax, legal, or financial advice. Tax laws vary by jurisdiction and individual circumstances. The tool performs calculations based on published guidelines, but:

- Tax laws change frequently
- Your individual situation may have unique factors
- Professional advice is recommended
- Errors or omissions may exist

**Always consult with a qualified tax professional before making tax-related decisions.**

## Support & Feedback

- Found a bug? Open an issue on GitHub
- Have a suggestion? Submit feedback via the app
- Need help? Check the in-app help dialog
- Want to contribute? See CONTRIBUTING.md

## Version History

### v1.0 (Current)
- Initial release
- 6 accounting methods
- 6 jurisdictions
- 4-tab interface
- Full export suite
- Comprehensive help system

---

**Made with ❤️ by the BitSleuth team**

*Empowering Bitcoin users with professional-grade tax tools, for free.*
