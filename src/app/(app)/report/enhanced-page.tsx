'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { format, subMonths, startOfYear, endOfYear, getYear } from 'date-fns';
import { Calendar as CalendarIcon, Info, TrendingUp, TrendingDown, Bitcoin as BitcoinIcon, AlertTriangle, CheckCircle2, FileText, Download, Package, FileOutput, Edit2 } from 'lucide-react';

import { useWallet } from '@/contexts/wallet-context';
import { 
  exportFullTaxPackage,
  downloadFile,
  generateCapitalGainsCSV,
  generateTaxSummaryCSV,
  generateTextReport,
  generateForm8949Data
} from '@/lib/tax-export';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { EnhancedTaxReportOutput, AccountingMethod, Jurisdiction } from '@/lib/types';
import { getEnhancedTaxReport } from '@/ai/flows/enhanced-tax-report-flow';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TaxHelpDialog } from '@/components/tax-help-dialog';
import { TransactionCategoryDialog } from '@/components/transaction-category-dialog';
import { UTXOLotTracking } from '@/components/utxo-lot-tracking';
import { generateTaxReportPDF, generateForm8949PDF, downloadPDF } from '@/lib/pdf-export';

const ACCOUNTING_METHODS: { value: AccountingMethod; label: string; description: string }[] = [
  { value: 'FIFO', label: 'FIFO', description: 'First In, First Out - Default for US. Sells oldest assets first.' },
  { value: 'LIFO', label: 'LIFO', description: 'Last In, First Out - Sells newest assets first.' },
  { value: 'HIFO', label: 'HIFO', description: 'Highest In, First Out - Sells most expensive assets first to minimize gains.' },
  { value: 'AVG_COST', label: 'Average Cost', description: 'Average cost basis - Common in Canada.' },
  { value: 'SHARED_POOL', label: 'Shared Pool (UK)', description: 'UK Section 104 pooling method.' },
  { value: 'SPEC_ID', label: 'Specific ID', description: 'Manually specify which lots to sell.' },
];

const JURISDICTIONS: { value: Jurisdiction; label: string; description: string }[] = [
  { value: 'US', label: 'United States', description: 'IRS rules - long-term >365 days' },
  { value: 'UK', label: 'United Kingdom', description: 'HMRC rules - Section 104, same-day, 30-day matching' },
  { value: 'CANADA', label: 'Canada', description: 'CRA rules - 50% inclusion, superficial loss rules' },
  { value: 'AUSTRALIA', label: 'Australia', description: 'ATO rules - 50% CGT discount >12 months' },
  { value: 'GERMANY', label: 'Germany', description: 'Tax-free after 1 year, €600 exemption' },
  { value: 'OTHER', label: 'Other', description: 'Generic international rules' },
];

const StatCard = ({ title, value, subtitle, tooltip, variant = 'default' }: { 
  title: string;
  value: string; 
  subtitle?: string;
  tooltip: string;
  variant?: 'default' | 'success' | 'danger';
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
            {title} <Info className="h-3 w-3" />
          </p>
          <div className={cn(
            "font-bold tracking-tighter text-2xl",
            variant === 'success' && "text-emerald-500",
            variant === 'danger' && "text-rose-500"
          )}>
            {value}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </TooltipTrigger>
      <TooltipContent><p className="max-w-xs font-normal">{tooltip}</p></TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function EnhancedReportPage() {
  const { data: walletData, isLoading: isWalletLoading, error: walletError, activeXpub: xpub, currency, currencySymbol } = useWallet();
  const [reportData, setReportData] = useState<EnhancedTaxReportOutput | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const [accountingMethod, setAccountingMethod] = useState<AccountingMethod>('FIFO');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('US');
  
  // Transaction category editing
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    txid: string;
    date: string;
    amount: number;
    type: 'disposal' | 'income';
    currentCategory?: any;
  } | null>(null);
  const [transactionCategories, setTransactionCategories] = useState<Record<string, any>>({});

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const endDate = new Date();
    const startDate = subMonths(endDate, 12);
    return { from: startDate, to: endDate };
  });
  
  const [isDateRangePopoverOpen, setIsDateRangePopoverOpen] = useState(false);

  const transactionYears = useMemo(() => {
    if (!walletData?.transactions) return [];
    const years = new Set(walletData.transactions.map(tx => getYear(new Date(tx.date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [walletData]);

  const formatCurrency = useCallback((value: number | undefined) => {
    if (value === undefined) return `${currencySymbol}0.00`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(value);
  }, [currency, currencySymbol]);

  const formatCurrencyFull = useCallback((value: number | undefined) => {
    if (value === undefined) return `${currencySymbol}0.00`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }, [currency, currencySymbol]);

  const generateReport = useCallback(async () => {
    if (!walletData || !date?.from || !date?.to) {
      return;
    }

    setIsReportLoading(true);
    setReportError(null);
    setReportData(null);
    
    try {
      const result = await getEnhancedTaxReport({
        walletData: JSON.stringify(walletData),
        startDate: date.from.toISOString(),
        endDate: date.to.toISOString(),
        currency: currency,
        accountingMethod,
        jurisdiction,
      });
      setReportData(result);
    } catch (e: any) {
      setReportError(e.message || "An error occurred while generating the report.");
    } finally {
      setIsReportLoading(false);
    }
  }, [walletData, date, currency, accountingMethod, jurisdiction]);

  useEffect(() => {
    if (walletData) {
      generateReport();
    }
  }, [walletData, date, accountingMethod, jurisdiction, generateReport]);

  const handleEditTransactionCategory = (txid: string, type: 'disposal' | 'income', currentCategory?: any) => {
    if (!reportData) return;
    
    const transaction = type === 'disposal' 
      ? reportData.disposals.find(d => d.txid === txid)
      : reportData.income.find(i => i.txid === txid);
    
    if (transaction) {
      setSelectedTransaction({
        txid: transaction.txid,
        date: transaction.date,
        amount: transaction.amount,
        type,
        currentCategory: currentCategory || (type === 'disposal' ? (transaction as any).type : (transaction as any).type),
      });
      setCategoryDialogOpen(true);
    }
  };

  const handleSaveTransactionCategory = (txid: string, newCategory: any) => {
    setTransactionCategories(prev => ({
      ...prev,
      [txid]: newCategory,
    }));
    // In a full implementation, this would trigger a report regeneration with the new category
    // For now, we just store it in state
  };

  const handleGeneratePDF = () => {
    if (!reportData) return;
    
    const pdf = generateTaxReportPDF(reportData, currency, currencySymbol);
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    downloadPDF(pdf, `bitcoin-tax-report-${timestamp}.pdf`);
  };

  const handleGenerateForm8949PDF = () => {
    if (!reportData) return;
    
    const taxYear = getYear(new Date(reportData.summary.endDate));
    const pdf = generateForm8949PDF(reportData.disposals, currency, currencySymbol, taxYear);
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    downloadPDF(pdf, `form-8949-${taxYear}-${timestamp}.pdf`);
  };

  const setDatePreset = (preset: 'thisYear' | 'lastYear' | 'last12Months' | number) => {
    const today = new Date();
    let fromDate, toDate;

    if (preset === 'thisYear') {
      fromDate = startOfYear(today);
      toDate = endOfYear(today);
    } else if (preset === 'lastYear') {
      const lastYear = getYear(today) - 1;
      fromDate = startOfYear(new Date(lastYear, 0, 1));
      toDate = endOfYear(new Date(lastYear, 11, 31));
    } else if (preset === 'last12Months') {
      fromDate = subMonths(today, 12);
      toDate = today;
    } else if (typeof preset === 'number') {
      fromDate = startOfYear(new Date(preset, 0, 1));
      toDate = endOfYear(new Date(preset, 11, 31));
    }

    setDate({ from: fromDate, to: toDate });
    setIsDateRangePopoverOpen(false);
  };

  const chartConfig = {
    totalValue: { label: 'Total Value', color: 'hsl(var(--chart-1))' },
    costBasis: { label: 'Cost Basis', color: 'hsl(var(--muted-foreground))' },
  };

  const chartData = useMemo(() => {
    if (!reportData?.portfolioHistory) return [];
    return reportData.portfolioHistory.map(item => ({
      date: new Date(item.date).getTime(),
      totalValue: item.totalValue,
      costBasis: item.costBasis,
    }));
  }, [reportData]);

  if (!xpub || isWalletLoading) return <FullPageLoader />;
  if (walletError) return <ErrorDisplay message={walletError} />;
  
  if (isReportLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generating Enhanced Tax Report...</CardTitle>
            <CardDescription className="font-normal">
              Calculating detailed tax lots, capital gains, and optimization opportunities...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FullPageLoader />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (reportError) return <ErrorDisplay message={reportError} />;
  if (!reportData) return <ErrorDisplay message="Could not generate the report." />;

  const { summary } = reportData;

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Report Configuration</CardTitle>
              <CardDescription>Select your accounting method and tax jurisdiction</CardDescription>
            </div>
            <TaxHelpDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Reporting Period</Label>
              <Popover open={isDateRangePopoverOpen} onOpenChange={setIsDateRangePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from && date?.to ? (
                      <>
                        {format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}
                      </>
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    disabled={{ after: new Date() }}
                  />
                  <div className="p-4 pt-0 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Quick Select</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setDatePreset('thisYear')}>This Year</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDatePreset('lastYear')}>Last Year</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDatePreset('last12Months')}>Last 12m</Button>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-4 gap-2">
                      {transactionYears.map(year => (
                        <Button key={year} variant="ghost" size="sm" onClick={() => setDatePreset(year)}>{year}</Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Accounting Method */}
            <div className="space-y-2">
              <Label>Accounting Method</Label>
              <Select value={accountingMethod} onValueChange={(v) => setAccountingMethod(v as AccountingMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTING_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{method.label}</span>
                        <span className="text-xs text-muted-foreground">{method.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jurisdiction */}
            <div className="space-y-2">
              <Label>Tax Jurisdiction</Label>
              <Select value={jurisdiction} onValueChange={(v) => setJurisdiction(v as Jurisdiction)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map(j => (
                    <SelectItem key={j.value} value={j.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{j.label}</span>
                        <span className="text-xs text-muted-foreground">{j.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Methodology */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Calculation Methodology
          </CardTitle>
          <CardDescription>Understanding how your tax numbers are calculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold mb-1">Cost Basis Calculation:</p>
            <p className="text-muted-foreground">
              Acquisition fees are added to cost basis. For {(() => {
                const methodInfo: Record<AccountingMethod, { name: string; description: string }> = {
                  'FIFO': { name: 'FIFO (First In, First Out)', description: ' oldest lots are sold first.' },
                  'LIFO': { name: 'LIFO (Last In, First Out)', description: ' newest lots are sold first.' },
                  'HIFO': { name: 'HIFO (Highest In, First Out)', description: ' highest cost lots are sold first to minimize gains.' },
                  'AVG_COST': { name: 'Average Cost', description: ' weighted average cost is used across all lots.' },
                  'SHARED_POOL': { name: 'Shared Pool (UK Section 104)', description: ' weighted average cost is used across all lots.' },
                  'SPEC_ID': { name: 'Specific ID', description: ' you specify which lots to sell.' },
                };
                const info = methodInfo[accountingMethod];
                return `${info.name},${info.description}`;
              })()}
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Capital Gains Formula:</p>
            <p className="text-muted-foreground">
              Proceeds (sale price minus disposal fees) − Cost Basis = Capital Gain/Loss
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Holding Period Classification:</p>
            <p className="text-muted-foreground">
              {jurisdiction === 'US' && 'Assets held >365 days qualify for long-term capital gains treatment with preferential tax rates.'}
              {jurisdiction === 'UK' && 'UK uses Section 104 pooling with same-day and 30-day matching rules. No distinction between short/long-term.'}
              {jurisdiction === 'CANADA' && 'Canada applies 50% inclusion rate to all capital gains. Superficial loss rule applies within 30 days.'}
              {jurisdiction === 'AUSTRALIA' && 'Assets held >365 days qualify for 50% CGT discount.'}
              {jurisdiction === 'GERMANY' && 'Assets held >365 days are tax-free if gains are below the exemption threshold.'}
              {jurisdiction === 'OTHER' && 'Generic rules applied. Consult local tax professional for jurisdiction-specific guidance.'}
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Fee Treatment:</p>
            <p className="text-muted-foreground">
              Purchase fees increase your cost basis (reducing future gains). Sale fees reduce your proceeds (increasing losses or reducing gains).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Tax Disclaimer</AlertTitle>
        <AlertDescription>
          This report is for informational purposes only and does not constitute tax, legal, or financial advice. 
          Tax laws vary by jurisdiction and individual circumstances. Always consult with a qualified tax professional 
          before making tax-related decisions.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="capital-gains">Capital Gains</TabsTrigger>
          <TabsTrigger value="lots">Tax Lots</TabsTrigger>
          <TabsTrigger value="utxo-tracking">UTXO Tracking</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Summary</CardTitle>
              <CardDescription>
                Method: {ACCOUNTING_METHODS.find(m => m.value === accountingMethod)?.label} | 
                Jurisdiction: {JURISDICTIONS.find(j => j.value === jurisdiction)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard
                  title="Total Capital Gains"
                  value={formatCurrencyFull(summary.totalCapitalGains)}
                  subtitle="Realized during period"
                  tooltip="Total realized capital gains (or losses) from disposals during the reporting period."
                  variant={summary.totalCapitalGains >= 0 ? 'success' : 'danger'}
                />
                <StatCard
                  title="Short-Term Gains"
                  value={formatCurrencyFull(summary.shortTermGains)}
                  subtitle={jurisdiction === 'US' ? 'Taxed as ordinary income' : ''}
                  tooltip="Capital gains from assets held less than the long-term threshold. In the US, these are taxed at ordinary income rates."
                  variant={summary.shortTermGains >= 0 ? 'success' : 'danger'}
                />
                <StatCard
                  title="Long-Term Gains"
                  value={formatCurrencyFull(summary.longTermGains)}
                  subtitle={jurisdiction === 'US' ? 'Preferential tax rates' : ''}
                  tooltip="Capital gains from assets held longer than the long-term threshold. Often taxed at lower rates."
                  variant={summary.longTermGains >= 0 ? 'success' : 'danger'}
                />
                <StatCard
                  title="Ordinary Income"
                  value={formatCurrencyFull(summary.ordinaryIncome)}
                  subtitle="Mining, staking, etc."
                  tooltip="Income from mining, staking, airdrops, and other sources taxed as ordinary income."
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground font-medium">Unrealized Gains</p>
                <p className={cn("text-2xl font-bold", summary.unrealizedGains >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {formatCurrencyFull(summary.unrealizedGains)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Not yet taxable</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground font-medium">Harvestable Losses</p>
                <p className="text-2xl font-bold text-blue-500">
                  {formatCurrencyFull(-(summary.harvestableShortTermLosses + summary.harvestableLongTermLosses))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Available to offset gains</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground font-medium">Deductible Fees</p>
                <p className="text-2xl font-bold">
                  {formatCurrencyFull(summary.deductibleFees)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Transaction costs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground font-medium">Cost Basis</p>
                <p className="text-2xl font-bold">
                  {formatCurrencyFull(summary.costBasis)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Current holdings</p>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillTotalValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-totalValue)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--color-totalValue)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value as number)}
                  />
                  <RechartsTooltip />
                  <Area
                    dataKey="totalValue"
                    type="monotone"
                    fill="url(#fillTotalValue)"
                    stroke="var(--color-totalValue)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    dataKey="costBasis"
                    type="monotone"
                    stroke="var(--color-costBasis)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="transparent"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capital Gains Tab */}
        <TabsContent value="capital-gains" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Disposal Events</CardTitle>
              <CardDescription>
                Detailed record of all taxable disposals during the reporting period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.disposals.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>No Disposals</AlertTitle>
                  <AlertDescription>
                    No taxable disposal events occurred during this reporting period.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (BTC)</TableHead>
                        <TableHead className="text-right">Proceeds</TableHead>
                        <TableHead className="text-right">Cost Basis</TableHead>
                        <TableHead className="text-right">Gain/Loss</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.disposals.map((disposal, idx) => {
                        const avgTerm = disposal.lots.reduce((sum, lot) => sum + lot.holdingPeriodDays, 0) / disposal.lots.length;
                        const isLongTerm = avgTerm >= reportData.jurisdictionRules.longTermHoldingPeriodDays;
                        const currentCategory = transactionCategories[disposal.txid] || disposal.type;
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {format(new Date(disposal.date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{currentCategory}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{disposal.amount.toFixed(8)}</TableCell>
                            <TableCell className="text-right">{formatCurrencyFull(disposal.proceeds)}</TableCell>
                            <TableCell className="text-right">{formatCurrencyFull(disposal.costBasis)}</TableCell>
                            <TableCell className={cn("text-right font-bold", disposal.realizedGain >= 0 ? "text-emerald-500" : "text-rose-500")}>
                              {formatCurrencyFull(disposal.realizedGain)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isLongTerm ? "default" : "secondary"}>
                                {isLongTerm ? 'Long' : 'Short'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransactionCategory(disposal.txid, 'disposal', disposal.type)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {reportData.income.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Income Events</CardTitle>
                <CardDescription>
                  Mining, staking, and other income taxed at ordinary rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (BTC)</TableHead>
                        <TableHead className="text-right">Fair Market Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.income.map((income, idx) => {
                        const currentCategory = transactionCategories[income.txid] || income.type;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {format(new Date(income.date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{currentCategory}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{income.amount.toFixed(8)}</TableCell>
                            <TableCell className="text-right">{formatCurrencyFull(income.fairMarketValue)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransactionCategory(income.txid, 'income', income.type)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tax Lots Tab */}
        <TabsContent value="lots" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Lot Details</CardTitle>
              <CardDescription>
                Detailed view of all remaining tax lots with cost basis and unrealized gains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Acquisition Date</TableHead>
                      <TableHead className="text-right">Amount (BTC)</TableHead>
                      <TableHead className="text-right">Cost Basis</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                      <TableHead className="text-right">Unrealized Gain/Loss</TableHead>
                      <TableHead>Holding Period</TableHead>
                      <TableHead>Term</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.lots.map((lot, idx) => {
                      const isLongTerm = lot.holdingPeriodDays >= reportData.jurisdictionRules.longTermHoldingPeriodDays;
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {format(new Date(lot.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-right font-mono">{lot.remaining.toFixed(8)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(lot.costPerUnit * lot.remaining)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(lot.currentValue)}</TableCell>
                          <TableCell className={cn("text-right font-bold", lot.unrealizedGain >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {formatCurrencyFull(lot.unrealizedGain)}
                          </TableCell>
                          <TableCell>{lot.holdingPeriodDays} days</TableCell>
                          <TableCell>
                            <Badge variant={isLongTerm ? "default" : "secondary"}>
                              {isLongTerm ? 'Long' : 'Short'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UTXO Tracking Tab */}
        <TabsContent value="utxo-tracking" className="space-y-6 mt-6">
          <UTXOLotTracking
            lots={reportData.lots}
            disposals={reportData.disposals}
            formatCurrency={formatCurrencyFull}
            currentPrice={walletData?.btcPrice || 0}
            jurisdictionRules={reportData.jurisdictionRules}
          />
        </TabsContent>

        {/* Tax Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6 mt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tax Loss Harvesting</AlertTitle>
            <AlertDescription>
              Review lots with unrealized losses that could be sold to offset capital gains. Be aware of wash sale rules 
              in your jurisdiction before repurchasing the same asset.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Harvestable Losses</CardTitle>
              <CardDescription>
                Lots with unrealized losses that could be used to offset gains
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.lots.filter(lot => lot.unrealizedGain < 0).length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>No Losses to Harvest</AlertTitle>
                  <AlertDescription>
                    All your tax lots currently have unrealized gains. There are no losses available to harvest.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Acquisition Date</TableHead>
                        <TableHead className="text-right">Amount (BTC)</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                        <TableHead className="text-right">Unrealized Loss</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead className="text-right">Potential Tax Benefit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.lots
                        .filter(lot => lot.unrealizedGain < 0)
                        .sort((a, b) => a.unrealizedGain - b.unrealizedGain)
                        .map((lot, idx) => {
                          const isLongTerm = lot.holdingPeriodDays >= reportData.jurisdictionRules.longTermHoldingPeriodDays;
                          // Rough estimate of tax benefit (actual rates vary)
                          const taxRate = isLongTerm ? 0.15 : 0.22; // Example rates
                          const potentialBenefit = Math.abs(lot.unrealizedGain) * taxRate;
                          
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {format(new Date(lot.date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-right font-mono">{lot.remaining.toFixed(8)}</TableCell>
                              <TableCell className="text-right">{formatCurrencyFull(lot.currentValue)}</TableCell>
                              <TableCell className="text-right font-bold text-rose-500">
                                {formatCurrencyFull(lot.unrealizedGain)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={isLongTerm ? "default" : "secondary"}>
                                  {isLongTerm ? 'Long' : 'Short'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-blue-500 font-medium">
                                ~{formatCurrencyFull(potentialBenefit)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optimization Strategies</CardTitle>
              <CardDescription>
                Personalized recommendations based on your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.harvestableShortTermLosses > 0 && (
                  <Alert>
                    <TrendingDown className="h-4 w-4" />
                    <AlertTitle>Short-Term Loss Harvesting Opportunity</AlertTitle>
                    <AlertDescription>
                      You have {formatCurrencyFull(-summary.harvestableShortTermLosses)} in short-term losses available.
                      These can offset short-term gains or up to $3,000 of ordinary income annually (US rules).
                    </AlertDescription>
                  </Alert>
                )}
                
                {summary.harvestableLongTermLosses > 0 && (
                  <Alert>
                    <TrendingDown className="h-4 w-4" />
                    <AlertTitle>Long-Term Loss Harvesting Opportunity</AlertTitle>
                    <AlertDescription>
                      You have {formatCurrencyFull(-summary.harvestableLongTermLosses)} in long-term losses available.
                      Consider selling these to offset long-term gains.
                    </AlertDescription>
                  </Alert>
                )}

                {reportData.lots.some(lot => 
                  lot.holdingPeriodDays >= reportData.jurisdictionRules.longTermHoldingPeriodDays - 30 &&
                  lot.holdingPeriodDays < reportData.jurisdictionRules.longTermHoldingPeriodDays &&
                  lot.unrealizedGain > 0
                ) && (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>Approaching Long-Term Status</AlertTitle>
                    <AlertDescription>
                      Some of your lots will qualify for long-term capital gains treatment within 30 days.
                      Consider waiting to sell these to benefit from lower tax rates.
                    </AlertDescription>
                  </Alert>
                )}

                {reportData.lots.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Active Positions</AlertTitle>
                    <AlertDescription>
                      You don't have any active tax lots in this reporting period.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Export Tax Report</CardTitle>
          <CardDescription>
            Download your tax report for review by your accountant or tax software
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* PDF Exports (New) */}
            <Button 
              onClick={handleGeneratePDF}
            >
              <FileOutput className="mr-2 h-4 w-4" />
              Generate PDF Report
            </Button>
            {reportData.jurisdiction === 'US' && (
              <Button 
                variant="outline"
                onClick={handleGenerateForm8949PDF}
              >
                <FileOutput className="mr-2 h-4 w-4" />
                Generate Form 8949 PDF
              </Button>
            )}
            
            {/* CSV Exports */}
            <Button 
              variant="outline"
              onClick={() => {
                const timestamp = format(new Date(), 'yyyy-MM-dd');
                const csv = generateCapitalGainsCSV(reportData.disposals, reportData.jurisdiction, currency);
                downloadFile(csv, `bitcoin-capital-gains-${timestamp}.csv`, 'text/csv');
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export Capital Gains CSV
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const timestamp = format(new Date(), 'yyyy-MM-dd');
                const csv = generateTaxSummaryCSV(reportData, currency);
                downloadFile(csv, `bitcoin-tax-summary-${timestamp}.csv`, 'text/csv');
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export Summary CSV
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const timestamp = format(new Date(), 'yyyy-MM-dd');
                const text = generateTextReport(reportData, currency, currencySymbol);
                downloadFile(text, `bitcoin-tax-report-${timestamp}.txt`, 'text/plain');
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Text Report
            </Button>
            {reportData.jurisdiction === 'US' && (
              <Button 
                variant="outline"
                onClick={() => {
                  const timestamp = format(new Date(), 'yyyy-MM-dd');
                  const form8949 = generateForm8949Data(reportData.disposals, currency);
                  downloadFile(form8949.shortTerm, `form-8949-short-term-${timestamp}.csv`, 'text/csv');
                  setTimeout(() => {
                    downloadFile(form8949.longTerm, `form-8949-long-term-${timestamp}.csv`, 'text/csv');
                  }, 100);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export Form 8949 CSV
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => exportFullTaxPackage(reportData, currency, currencySymbol)}
            >
              <Package className="mr-2 h-4 w-4" />
              Download Complete Package
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            The complete package includes: tax summary, capital gains, income events, tax lots, text report
            {reportData.jurisdiction === 'US' && ', and IRS Form 8949 data'}.
          </p>
        </CardContent>
      </Card>

      {/* Transaction Category Dialog */}
      <TransactionCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        transaction={selectedTransaction}
        onSave={handleSaveTransactionCategory}
      />
    </div>
  );
}
