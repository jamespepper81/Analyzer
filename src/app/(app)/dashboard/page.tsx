
'use client';

import Link from 'next/link';
import { ArrowRight, Bitcoin, ShieldCheck, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function DashboardPage() {
  const { data, isLoading, error, activeXpub: xpub, fiatBalance, currency, fiatPrice, refetch } = useWallet();

  if (!xpub) return <FullPageLoader />;
  if (isLoading) return <FullPageLoader />;
  if (error) return <ErrorDisplay message={error} />;
  if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;

  const recentTransactions = data.transactions.slice(0, 3);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Bitcoin className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tighter">
              {formatCurrency(fiatBalance)}
            </div>
            <p className="text-lg text-muted-foreground font-normal">
              {data.balanceBTC.toFixed(8)} BTC
            </p>
          </CardContent>
        </Card>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Card className="cursor-help">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tighter">{data.securityScore}%</div>
                        <Progress value={data.securityScore} className="mt-2 h-3" />
                      </CardContent>
                    </Card>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs font-normal">This score reflects your privacy practices based on address reuse. A higher score means better privacy. It is calculated as 100 minus the percentage of your addresses that have been used more than once.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Performance (30d)</CardTitle>
            {data.performance.change30d >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-rose-500" />}
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold tracking-tighter", data.performance.change30d >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {data.performance.change30d >= 0 ? '+' : ''}{isFinite(data.performance.change30d) ? data.performance.change30d.toFixed(2) : '0.00'}%
            </div>
             <div className="flex justify-between text-xs text-muted-foreground mt-2 font-normal">
                <span>24h: <span className={cn("font-semibold", data.performance.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{isFinite(data.performance.change24h) ? data.performance.change24h.toFixed(2) : '0.00'}%</span></span>
                <span>7d: <span className={cn("font-semibold", data.performance.change7d >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{isFinite(data.performance.change7d) ? data.performance.change7d.toFixed(2) : '0.00'}%</span></span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Activity (30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                  <ArrowUpCircle className="h-6 w-6 text-emerald-500 shrink-0" />
                  <div>
                      <p className="text-xs text-muted-foreground font-normal">Inflow</p>
                      <p className="font-bold text-sm">{data.inflowOutflow.inflowBTC.toFixed(6)} BTC</p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <ArrowDownCircle className="h-6 w-6 text-rose-500 shrink-0" />
                  <div>
                      <p className="text-xs text-muted-foreground font-normal">Outflow</p>
                      <p className="font-bold text-sm">{Math.abs(data.inflowOutflow.outflowBTC).toFixed(6)} BTC</p>
                  </div>
              </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription className="font-normal">
                A summary of your latest wallet activity.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/transactions">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount (BTC)</TableHead>
                <TableHead className="hidden text-right md:table-cell">Amount (Fiat)</TableHead>
                <TableHead className="text-right">Status</TableHead>
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
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <span
                                className={cn(
                                    "flex items-center justify-center rounded-full p-2 w-8 h-8",
                                    isReceived
                                        ? "bg-chart-positive/10 text-chart-positive"
                                        : "bg-chart-negative/10 text-chart-negative"
                                )}
                            >
                                {isReceived ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </span>
                            <div>
                                <div className="font-medium">{tx.type}</div>
                                <div className="text-sm text-muted-foreground font-normal">
                                    {new Date(tx.date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell
                        className={cn(
                        'text-right font-mono',
                        isReceived ? 'text-chart-positive' : 'text-chart-negative'
                        )}
                    >
                        {tx.btc > 0 ? '+' : ''}{tx.btc.toFixed(6)} BTC
                    </TableCell>
                    <TableCell
                        className={cn(
                        'hidden text-right md:table-cell',
                        isReceived ? 'text-chart-positive' : 'text-chart-negative'
                        )}
                    >
                        {isReceived ? '+' : '-'}{formatCurrency(fiatAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                        <Badge
                        variant={tx.status === 'Confirmed' ? 'outline' : 'secondary'}
                        className={cn(
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
        </CardContent>
      </Card>
    </div>
  );
}
