
'use client';

import Link from 'next/link';
import { ArrowRight, Bitcoin, ShieldCheck, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { IconContainer } from '@/components/ui/icon-container';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function DashboardPage() {
  const { data, isLoading, isLoadingAiContent, error, activeXpub: xpub, fiatBalance, currency, fiatPrice, isDiscovering, discoveryProgress } = useWallet();
  const hasBlockingError = !!error && !data;

  if (!xpub) return <FullPageLoader />;
  if (isLoading && !data) return <FullPageLoader />;
  if (hasBlockingError) return <ErrorDisplay message={error ?? 'Unable to load wallet data.'} />;
  if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;

  const recentTransactions = data.transactions.slice(0, 3);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Progressive Discovery Status */}
      {isDiscovering && discoveryProgress && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg px-4 py-4 shadow-md">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  🔍 Discovering wallet addresses...
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-mono">
                  {discoveryProgress.addressesWithActivity} found
                </p>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Your balance and transactions are updating in real-time as we discover more addresses. You can explore your wallet while discovery continues!
              </p>
              <div className="flex items-center gap-2">
                <Progress value={(discoveryProgress.addressesChecked / (discoveryProgress.addressesChecked + 20)) * 100} className="h-1.5" />
                <span className="text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap">
                  {discoveryProgress.addressesChecked} checked
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Insights Loading Indicator */}
      {isLoadingAiContent && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">AI insights loading...</span> Your wallet data is ready to analyze. AI-powered recommendations will appear shortly.
          </p>
        </div>
      )}
      
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <CardTitle className="text-base font-medium">Current Balance</CardTitle>
            <IconContainer variant="orange">
              <Bitcoin className="h-4 w-4 sm:h-5 sm:w-5" />
            </IconContainer>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tighter">
              {formatCurrency(fiatBalance)}
            </div>
            <p className="text-base sm:text-lg text-muted-foreground font-normal">
              {data.balanceBTC.toFixed(8)} BTC
            </p>
          </CardContent>
        </Card>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Card className="cursor-help border-2 shadow-sm hover:shadow-md transition-all duration-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
                        <CardTitle className="text-base font-medium">Security Score</CardTitle>
                        <IconContainer variant="emerald">
                          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                        </IconContainer>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tighter">{data.securityScore}%</div>
                        <Progress value={data.securityScore} className="mt-2 h-2 sm:h-3" />
                      </CardContent>
                    </Card>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs font-normal">This score reflects your privacy practices based on address reuse. A higher score means better privacy. It is calculated as 100 minus the percentage of your addresses that have been used more than once.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <Card className="border-2 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
            <CardTitle className="text-base font-medium">Performance (30d)</CardTitle>
            <IconContainer variant={data.performance.change30d >= 0 ? 'emerald' : 'rose'}>
              {data.performance.change30d >= 0 ? <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />}
            </IconContainer>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl sm:text-3xl font-bold tracking-tighter", data.performance.change30d >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {data.performance.change30d >= 0 ? '+' : ''}{isFinite(data.performance.change30d) ? data.performance.change30d.toFixed(2) : '0.00'}%
            </div>
             <div className="flex justify-between text-xs text-muted-foreground mt-2 font-normal">
                <span>24h: <span className={cn("font-semibold", data.performance.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{isFinite(data.performance.change24h) ? data.performance.change24h.toFixed(2) : '0.00'}%</span></span>
                <span>7d: <span className={cn("font-semibold", data.performance.change7d >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{isFinite(data.performance.change7d) ? data.performance.change7d.toFixed(2) : '0.00'}%</span></span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent">
              <CardTitle className="text-base font-medium">Activity (30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 pt-1">
              <div className="flex items-center gap-2 sm:gap-3">
                  <ArrowUpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 shrink-0" />
                  <div>
                      <p className="text-xs text-muted-foreground font-normal">Inflow</p>
                      <p className="font-bold text-sm">{data.inflowOutflow.inflowBTC.toFixed(6)} BTC</p>
                  </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                  <ArrowDownCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 shrink-0" />
                  <div>
                      <p className="text-xs text-muted-foreground font-normal">Outflow</p>
                      <p className="font-bold text-sm">{Math.abs(data.inflowOutflow.outflowBTC).toFixed(6)} BTC</p>
                  </div>
              </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 shadow-md">
        <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconContainer variant="primary">
                  <ArrowRight className="h-5 w-5" />
                </IconContainer>
                Recent Transactions
              </CardTitle>
              <CardDescription className="font-normal mt-2">
                A summary of your latest wallet activity.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow">
              <Link href="/transactions">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-0">Details</TableHead>
                  <TableHead className="text-right">Amount (BTC)</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Amount (Fiat)</TableHead>
                  <TableHead className="text-right pr-4 sm:pr-0">Status</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {recentTransactions.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No recent transactions found.
                    </TableCell>
                 </TableRow>
              )}
              {recentTransactions.map((tx) => {
                const fiatAmount = Math.abs(tx.btc * fiatPrice);
                const isReceived = tx.type === 'Received';
                return (
                    <TableRow key={tx.id}>
                    <TableCell className="pl-4 sm:pl-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span
                                className={cn(
                                    "flex items-center justify-center rounded-full p-1.5 sm:p-2 w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0",
                                    isReceived
                                        ? "bg-chart-positive/10 text-chart-positive"
                                        : "bg-chart-negative/10 text-chart-negative"
                                )}
                            >
                                {isReceived ? <ArrowDownLeft className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                            </span>
                            <div className="min-w-0">
                                <div className="font-medium text-base">{tx.type}</div>
                                <div className="text-sm text-muted-foreground font-normal">
                                    {new Date(tx.date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell
                        className={cn(
                        'text-right font-mono text-sm whitespace-nowrap',
                        isReceived ? 'text-chart-positive' : 'text-chart-negative'
                        )}
                    >
                        {tx.btc > 0 ? '+' : ''}{tx.btc.toFixed(6)} BTC
                    </TableCell>
                    <TableCell
                        className={cn(
                        'hidden text-right md:table-cell whitespace-nowrap',
                        isReceived ? 'text-chart-positive' : 'text-chart-negative'
                        )}
                    >
                        {isReceived ? '+' : '-'}{formatCurrency(fiatAmount)}
                    </TableCell>
                    <TableCell className="text-right pr-4 sm:pr-0">
                        <Badge
                        variant={tx.status === 'Confirmed' ? 'outline' : 'secondary'}
                        className={cn(
                            'text-xs sm:text-sm',
                            tx.status === 'Confirmed' && 'border-chart-positive/40 text-chart-positive',
                            tx.status === 'Pending' && 'border-yellow-500/40 text-yellow-500'
                        )}
                        >
                        {tx.status}
                        </Badge>
                    </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
