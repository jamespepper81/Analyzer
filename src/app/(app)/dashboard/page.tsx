
'use client';

import Link from 'next/link';
import { ArrowRight, Bitcoin, ShieldCheck, TrendingUp, TrendingDown, CircleArrowUp, CircleArrowDown, ArrowUpRight, ArrowDownLeft, Activity, RefreshCw } from 'lucide-react';
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
import { ErrorDisplay } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { LoadingProgress, CompactProgress, DashboardSkeleton } from '@/components/dashboard/loading-progress';
import type { LoadStage } from '@/components/ui/orbital-loader';

export default function DashboardPage() {
  const { data, isLoading, isLoadingAiContent, error, activeXpub: xpub, fiatBalance, currency, fiatPrice, isDiscovering, discoveryProgress, refetch } = useWallet();
  const hasBlockingError = !!error && !data;
  const [isLongWait, setIsLongWait] = useState(false);

  // Determine current loading stage for premium UX
  const getLoadStage = (): LoadStage => {
    if (!xpub) return 'CONNECTING';
    if (isDiscovering && discoveryProgress) {
      if (discoveryProgress.addressesWithActivity === 0) return 'DISCOVERING';
      if (data && data.transactions.length > 0) return 'TRANSACTIONS';
      return 'BALANCES';
    }
    if (isLoading && !data) return 'DISCOVERING';
    if (isLoadingAiContent) return 'ENRICHING';
    if (data) return 'COMPLETE';
    return 'CONNECTING';
  };

  const loadStage = getLoadStage();
  const stageNumber = {
    'CONNECTING': 1,
    'NOSTR_SYNCING': 1,
    'DISCOVERING': 2,
    'BALANCES': 2,
    'TRANSACTIONS': 3,
    'ENRICHING': 4,
    'COMPLETE': 4,
  }[loadStage];

  // Log when dashboard mounts for login flow tracking
  useEffect(() => {
    logger.loginFlow('dashboardMounted', {
      hasData: !!data,
      isLoading,
      activeXpub: xpub ? xpub.substring(0, 20) + '...' : null
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track long wait times (30+ seconds)
  useEffect(() => {
    if (!isLoading && data) {
      setIsLongWait(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (isLoading || isDiscovering) {
        setIsLongWait(true);
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [isLoading, isDiscovering, data]);

  // Show skeleton dashboard immediately when no xpub
  if (!xpub) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <LoadingProgress
          stage="CONNECTING"
          stageNumber={1}
          message="Connecting to your wallet..."
        />
        <DashboardSkeleton />
      </div>
    );
  }

  // Premium loading state: show skeleton with progress
  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <LoadingProgress
          stage={loadStage}
          stageNumber={stageNumber}
          message={discoveryProgress
            ? `Discovering addresses... Found ${discoveryProgress.addressesWithActivity}`
            : 'Connecting to blockchain...'}
          addressesFound={discoveryProgress?.addressesWithActivity}
          transactionsLoaded={0}
          isLongWait={isLongWait}
        />
        <DashboardSkeleton />
      </div>
    );
  }

  if (hasBlockingError) return <ErrorDisplay message={error ?? 'Unable to load wallet data.'} />;
  if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;

  // Check if this is an empty wallet (no transactions)
  const isEmptyWallet = data.transactions.length === 0 && data.balanceBTC === 0;

  const recentTransactions = data.transactions.slice(0, 3);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Progressive Discovery Status - Premium compact progress */}
      {isDiscovering && discoveryProgress && (
        <CompactProgress
          stage={loadStage}
          message="Discovering addresses in real-time..."
          addressesFound={discoveryProgress.addressesWithActivity}
          transactionsLoaded={data.transactions.length}
        />
      )}
      
      {/* Empty Wallet State */}
      {isEmptyWallet && !isDiscovering && (
        <Card className="border-2 border-dashed border-muted-foreground/30 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Bitcoin className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Empty Wallet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              This wallet has no transaction history yet. Once you receive or send Bitcoin using addresses from this XPUB, they will appear here.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="default">
                <Link href="/discover">
                  <Activity className="mr-2 h-4 w-4" />
                  Explore Bitcoin Network
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/market">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Market Data
                </Link>
              </Button>
            </div>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 max-w-lg">
              <p className="text-xs text-blue-900 dark:text-blue-100 text-left">
                <strong className="block mb-1">💡 What to do next:</strong>
                • Generate a receiving address from your wallet using this XPUB<br />
                • Send Bitcoin to that address<br />
                • Return here to see your balance and transaction history
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* AI Insights Loading Indicator */}
      {!isEmptyWallet && isLoadingAiContent && (
        <CompactProgress
          stage="ENRICHING"
          message="Analyzing your wallet with AI..."
          isRefreshing={false}
        />
      )}
      
      {/* Main Dashboard Content - Only show for non-empty wallets */}
      {!isEmptyWallet && (
        <>
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
              <IconContainer variant="purple">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              </IconContainer>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 pt-1">
              <div className="flex items-center gap-2 sm:gap-3">
                  <CircleArrowUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 shrink-0" />
                  <div>
                      <p className="text-xs text-muted-foreground font-normal">Inflow</p>
                      <p className="font-bold text-sm">{data.inflowOutflow.inflowBTC.toFixed(6)} BTC</p>
                  </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                  <CircleArrowDown className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 shrink-0" />
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

      {/* Refresh button */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          disabled={isLoading || isDiscovering}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn(
            "h-4 w-4 mr-2",
            (isLoading || isDiscovering) && "animate-spin"
          )} />
          {isLoading || isDiscovering ? 'Refreshing...' : 'Refresh data'}
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
