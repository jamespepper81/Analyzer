'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CircleQuestionMark, Book, Calculator, Globe, TrendingDown, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export function TaxHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CircleQuestionMark className="mr-2 h-4 w-4" />
          Tax Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Bitcoin Tax Reporting Guide</DialogTitle>
          <DialogDescription>
            Comprehensive guide to understanding and optimizing your Bitcoin taxes
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="methods">Methods</TabsTrigger>
              <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
              <TabsTrigger value="optimization">Optimization</TabsTrigger>
              <TabsTrigger value="exports">Exports</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <Book className="h-5 w-5" />
                    Tax Basics for Bitcoin
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    In most jurisdictions, Bitcoin is treated as property for tax purposes, not currency. 
                    This means that every time you dispose of Bitcoin (sell, trade, or spend), you potentially 
                    trigger a taxable event.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Key Concepts</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">Cost Basis</p>
                      <p className="text-muted-foreground">
                        The original value of Bitcoin when you acquired it, including any fees paid. 
                        This is what you'll use to calculate gains or losses when you sell.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Realized Gains/Losses</p>
                      <p className="text-muted-foreground">
                        The profit or loss from selling Bitcoin. Calculated as: Proceeds - Cost Basis. 
                        These are taxable in the year they occur.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Unrealized Gains/Losses</p>
                      <p className="text-muted-foreground">
                        The paper profit or loss on Bitcoin you still hold. Not taxable until you sell.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Holding Period</p>
                      <p className="text-muted-foreground">
                        How long you've held Bitcoin before selling. Many jurisdictions offer preferential 
                        tax rates for long-term holdings (typically {'>'} 1 year).
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Taxable Events</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Selling Bitcoin for fiat:</strong> Yes, taxable</li>
                    <li>• <strong>Trading Bitcoin for another crypto:</strong> Yes, taxable in most jurisdictions</li>
                    <li>• <strong>Spending Bitcoin:</strong> Yes, taxable</li>
                    <li>• <strong>Mining/Staking rewards:</strong> Yes, taxable as income at receipt</li>
                    <li>• <strong>Transferring between your own wallets:</strong> No, not taxable</li>
                    <li>• <strong>Buying Bitcoin:</strong> No, but establishes cost basis</li>
                    <li>• <strong>Holding Bitcoin:</strong> No, not taxable</li>
                  </ul>
                </div>

                <Alert>
                  <AlertTitle>Important Note</AlertTitle>
                  <AlertDescription>
                    Tax laws vary significantly by jurisdiction and individual circumstances. This guide 
                    provides general information. Always consult with a qualified tax professional for 
                    advice specific to your situation.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="methods" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <Calculator className="h-5 w-5" />
                    Accounting Methods
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The accounting method determines which specific Bitcoin units (lots) you're selling 
                    when you make a disposal. Different methods can result in different tax outcomes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">FIFO (First In, First Out)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sells the oldest Bitcoin first. This is the default method for most tax authorities 
                      and is required in some jurisdictions.
                    </p>
                    <div className="text-sm">
                      <p className="text-muted-foreground"><strong>Best for:</strong> When your oldest purchases have the highest cost basis</p>
                      <p className="text-muted-foreground"><strong>Tax impact:</strong> May create long-term gains if oldest holdings exceed 1 year</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">LIFO (Last In, First Out)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sells the newest Bitcoin first. Can be advantageous in rising markets.
                    </p>
                    <div className="text-sm">
                      <p className="text-muted-foreground"><strong>Best for:</strong> Minimizing gains in rising markets</p>
                      <p className="text-muted-foreground"><strong>Tax impact:</strong> Usually creates short-term gains</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">HIFO (Highest In, First Out)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sells Bitcoin with the highest cost basis first, minimizing gains (or maximizing losses).
                    </p>
                    <div className="text-sm">
                      <p className="text-muted-foreground"><strong>Best for:</strong> Minimizing tax liability</p>
                      <p className="text-muted-foreground"><strong>Tax impact:</strong> Lowest gains or highest losses</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Specific Identification (Spec ID)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Manually specify which Bitcoin units to sell. Offers maximum flexibility but requires 
                      detailed record keeping.
                    </p>
                    <div className="text-sm">
                      <p className="text-muted-foreground"><strong>Best for:</strong> Advanced tax planning</p>
                      <p className="text-muted-foreground"><strong>Tax impact:</strong> Depends on your selection</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Average Cost</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Uses the average cost of all Bitcoin holdings. Common in Canada.
                    </p>
                    <div className="text-sm">
                      <p className="text-muted-foreground"><strong>Best for:</strong> Simplicity, frequent traders</p>
                      <p className="text-muted-foreground"><strong>Tax impact:</strong> Moderate, smooths out price volatility</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Shared Pool (UK Section 104)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      UK-specific method that pools all Bitcoin acquired (except same-day and 30-day matches) 
                      into a single pool with an average cost.
                    </p>
                    <div className="text-sm">
                      <p className="text-muted-foreground"><strong>Best for:</strong> UK taxpayers</p>
                      <p className="text-muted-foreground"><strong>Tax impact:</strong> Required by HMRC</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTitle>Choosing a Method</AlertTitle>
                  <AlertDescription>
                    Some jurisdictions require specific methods. Check your local tax authority's guidance. 
                    In the US, you can choose any method but must use it consistently.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="jurisdictions" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <Globe className="h-5 w-5" />
                    Jurisdiction-Specific Rules
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Each jurisdiction has unique tax rules for cryptocurrency. Here are the key differences:
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">🇺🇸 United States</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• <strong>Long-term:</strong> Assets held {'>'} 365 days, taxed at 0%, 15%, or 20%</li>
                      <li>• <strong>Short-term:</strong> Assets held ≤365 days, taxed as ordinary income (10-37%)</li>
                      <li>• <strong>Forms:</strong> IRS Form 8949 and Schedule D</li>
                      <li>• <strong>Loss limits:</strong> $3,000 per year against ordinary income, rest carries forward</li>
                      <li>• <strong>Wash sale:</strong> Not currently applied to crypto (may change)</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">🇬🇧 United Kingdom</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• <strong>Capital Gains Tax:</strong> 10% or 20% depending on income</li>
                      <li>• <strong>Annual exemption:</strong> £6,000 (2023/24) tax-free allowance</li>
                      <li>• <strong>Same-day rule:</strong> Acquisitions on same day as disposal matched first</li>
                      <li>• <strong>Bed & Breakfast rule:</strong> Purchases within 30 days matched before pool</li>
                      <li>• <strong>Section 104 pool:</strong> Remaining acquisitions pooled with average cost</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">🇨🇦 Canada</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• <strong>Capital gains:</strong> 50% inclusion rate (half of gain is taxable)</li>
                      <li>• <strong>Superficial loss rule:</strong> Loss denied if repurchased within 30 days</li>
                      <li>• <strong>Method:</strong> Average cost basis commonly used</li>
                      <li>• <strong>Business vs capital:</strong> Frequent trading may be considered business income</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">🇦🇺 Australia</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• <strong>CGT discount:</strong> 50% discount if held {'>'} 12 months</li>
                      <li>• <strong>Personal use exemption:</strong> Possible for purchases under $10,000</li>
                      <li>• <strong>Timing:</strong> Based on disposal date</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">🇩🇪 Germany</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• <strong>Private sales allowance:</strong> €600 per year tax-free</li>
                      <li>• <strong>Holding period:</strong> Tax-free if held {'>'} 1 year</li>
                      <li>• <strong>Short-term:</strong> Progressive rates up to 45% if held ≤1 year</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <AlertTitle>Stay Updated</AlertTitle>
                  <AlertDescription>
                    Cryptocurrency tax regulations are evolving. Always check the latest guidance from 
                    your tax authority or consult a professional.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="optimization" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5" />
                    Tax Optimization Strategies
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Legal strategies to minimize your tax liability while remaining compliant.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Tax-Loss Harvesting</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Selling assets with unrealized losses to offset capital gains. This reduces your 
                      taxable income for the year.
                    </p>
                    <div className="text-sm">
                      <p className="font-medium mt-2">How it works:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-1">
                        <li>Identify lots with unrealized losses (current value {'<'} cost basis)</li>
                        <li>Sell those lots before year-end to realize the loss</li>
                        <li>Use losses to offset gains (short-term losses offset short-term gains first)</li>
                        <li>Excess losses can offset up to $3,000 of ordinary income (US)</li>
                        <li>Remaining losses carry forward to future years</li>
                      </ol>
                      <p className="font-medium mt-2">Important considerations:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
                        <li>Be aware of wash sale rules (where applicable)</li>
                        <li>In UK: 30-day bed & breakfast rule</li>
                        <li>In Canada: 30-day superficial loss rule</li>
                        <li>Consider repurchasing to maintain exposure</li>
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Holding Period Optimization</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Timing sales to qualify for long-term capital gains rates.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <p className="mt-2">If your lot is close to qualifying for long-term status (365 days in US/AU, 
                      1 year in Germany), consider waiting to benefit from lower tax rates. The tax savings often 
                      outweigh short-term price volatility.</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">HIFO Method Selection</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Using the Highest In, First Out method to minimize gains.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <p className="mt-2">If allowed in your jurisdiction, HIFO automatically sells your most expensive 
                      lots first, resulting in the smallest possible gain (or largest loss). This is legal and can 
                      significantly reduce your tax bill.</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Charitable Donations</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Donating appreciated Bitcoin to qualified charities (where applicable).
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <p className="mt-2">In some jurisdictions (like the US), you can donate appreciated Bitcoin to charity 
                      and deduct the fair market value while avoiding capital gains tax. This is most beneficial for 
                      long-term holdings with large gains.</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Income Smoothing</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Spreading out taxable events across multiple years.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <p className="mt-2">If you have large gains, consider selling portions over multiple tax years to 
                      stay within lower tax brackets. This is especially effective in progressive tax systems.</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTitle>Professional Advice Recommended</AlertTitle>
                  <AlertDescription>
                    Tax optimization can be complex and jurisdiction-specific. Consider working with a tax 
                    professional who specializes in cryptocurrency to develop a strategy tailored to your situation.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="exports" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5" />
                    Export Formats
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Understanding the different export formats and when to use them.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Capital Gains CSV</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete record of all disposal events with proceeds, cost basis, and gains/losses. 
                      Suitable for uploading to tax software or providing to your accountant.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Tax Summary CSV</h4>
                    <p className="text-sm text-muted-foreground">
                      High-level summary of your tax situation including total gains, income, and key metrics. 
                      Good for quick reference and filing preparation.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Tax Lots CSV</h4>
                    <p className="text-sm text-muted-foreground">
                      Detailed inventory of all remaining tax lots with cost basis and unrealized gains. 
                      Useful for planning future sales and year-end tax strategy.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Income CSV</h4>
                    <p className="text-sm text-muted-foreground">
                      Separate report for income events like mining and staking rewards. These are typically 
                      reported differently than capital gains.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">IRS Form 8949 CSV (US Only)</h4>
                    <p className="text-sm text-muted-foreground">
                      Pre-formatted data ready for IRS Form 8949, separated into short-term and long-term 
                      transactions. Can be directly transcribed or uploaded to tax preparation software.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Text Report</h4>
                    <p className="text-sm text-muted-foreground">
                      Human-readable formatted report suitable for printing or PDF conversion. Includes 
                      disclaimers and is appropriate for documentation purposes.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold">Complete Package</h4>
                    <p className="text-sm text-muted-foreground">
                      Downloads all available reports in one click. Recommended for comprehensive record 
                      keeping and professional review.
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertTitle>Record Keeping</AlertTitle>
                  <AlertDescription>
                    Keep all exported reports along with supporting documentation (exchange records, wallet 
                    transaction histories) for at least 7 years or as required by your tax authority.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
