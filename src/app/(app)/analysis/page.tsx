'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Scatter, ScatterChart, XAxis, YAxis, Tooltip, ZAxis } from 'recharts';
import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Currency } from '@/lib/types';

const CustomFeeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const feeRate = (data.fee / data.size).toFixed(2);
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                <div className="font-bold mb-1">Transaction Details</div>
                <div className="text-muted-foreground">ID: <span className="font-mono">{data.id.slice(0,10)}...</span></div>
                <div>Size: <span className="font-semibold">{data.size.toLocaleString()} bytes</span></div>
                <div>Fee: <span className="font-semibold">{data.fee.toLocaleString()} sats</span></div>
                <div>Fee Rate: <span className="font-semibold">{feeRate} sat/byte</span></div>
            </div>
        );
    }
    return null;
};

const satsFormatter = (value: any) => {
    if (typeof value !== 'number') return value;
    if (value === 0) return '0';

    const sats = Math.abs(value); // Use absolute value for formatting
    if (sats >= 1_000_000_000) return `${(sats / 1_000_000_000).toLocaleString(undefined, {maximumFractionDigits: 1})}B`;
    if (sats >= 1_000_000) return `${(sats / 1_000_000).toLocaleString(undefined, {maximumFractionDigits: 1})}M`;
    if (sats >= 1000) return `${(sats / 1000).toLocaleString(undefined, {maximumFractionDigits: 1})}k`;
    
    return `${sats.toFixed(0)}`;
};

const btcToSatsFormatter = (value: any) => {
    if (typeof value !== 'number') return value;
    return satsFormatter(value * 1e8);
}


export default function AnalysisPage() {
  const { data, isLoading, error, activeXpub: xpub, fiatPrice, currency } = useWallet();

  const balanceChartData = useMemo(() => {
    if (!data || !data.transactions || data.transactions.length === 0) {
      return [];
    }
    const sortedTransactions = [...data.transactions].reverse();
    let cumulativeBalance = 0;
    const history = sortedTransactions.map((tx) => {
      cumulativeBalance += tx.btc;
      return {
        date: new Date(tx.date),
        balanceBTC: cumulativeBalance,
        balanceFiat: cumulativeBalance * (fiatPrice || 0),
      };
    });
    const firstTxDate = history.length > 0 ? history[0].date : new Date();
    const startingPoint = {
        date: new Date(firstTxDate.getTime() - 86400000), // one day before first tx
        balanceBTC: 0,
        balanceFiat: 0,
    };
    
    const balanceNowBtc = data.balanceBTC || 0;
    const endingPoint = {
        date: new Date(),
        balanceBTC: balanceNowBtc,
        balanceFiat: balanceNowBtc * (fiatPrice || 0),
    };
    return [startingPoint, ...history, endingPoint];
  }, [data, fiatPrice]);
  
  const monthlyVolumeData = useMemo(() => {
    if (!data?.transactions) return [];
    const volumesByMonth = data.transactions.reduce((acc, tx) => {
        const date = new Date(tx.date);
        // Using a consistent key format 'YYYY-MM' to ensure correct sorting later
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

        if (!acc[monthKey]) {
            acc[monthKey] = { name: monthLabel, sent: 0, received: 0, key: monthKey };
        }
        if (tx.btc < 0) {
            acc[monthKey].sent += Math.abs(tx.btc);
        } else {
            acc[monthKey].received += tx.btc;
        }
        return acc;
    }, {} as Record<string, { name: string; sent: number; received: number, key: string }>);
    
    // Sort by the 'YYYY-MM' key to ensure chronological order
    return Object.values(volumesByMonth).sort((a,b) => a.key.localeCompare(b.key));
  }, [data]);

  const feeScatterData = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions
        .map(tx => ({
            size: tx.size,
            fee: tx.fee,
            id: tx.id,
        }))
        .filter(tx => tx.size > 0 && tx.fee > 0);
  }, [data]);


  const utxoChartData = useMemo(() => {
    if (!data || !data.utxos) return [];
    
    const getSymbol = (c: Currency): string => {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
        };
        return symbols[c] || '$';
    };
    const symbol = getSymbol(currency);

    const buckets = {
        [`Dust (<${symbol}1)`]: 0,
        [`Small (${symbol}1-${symbol}100)`]: 0,
        [`Medium (${symbol}100-${symbol}10k)`]: 0,
        [`Large (>${symbol}10k)`]: 0,
    };
    data.utxos.forEach(utxo => {
        const valueFiat = (utxo.value / 1e8) * (fiatPrice || 0);
        if (valueFiat < 1) {
            buckets[`Dust (<${symbol}1)`]++;
        } else if (valueFiat <= 100) {
            buckets[`Small (${symbol}1-${symbol}100)`]++;
        } else if (valueFiat <= 10000) {
            buckets[`Medium (${symbol}100-${symbol}10k)`]++;
        } else {
            buckets[`Large (>${symbol}10k)`]++;
        }
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [data, fiatPrice, currency]);
  
  const monthlyFeeData = useMemo(() => {
    if (!data?.transactions) return [];
    const feesByMonth = data.transactions.reduce((acc, tx) => {
        if (tx.fee <= 0) return acc; // Only include transactions that paid a fee
        const date = new Date(tx.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

        if (!acc[monthKey]) {
            acc[monthKey] = { name: monthLabel, fee: 0, key: monthKey };
        }
        
        acc[monthKey].fee += tx.fee / 1e8; // Convert satoshis to BTC
        
        return acc;
    }, {} as Record<string, { name: string; fee: number, key: string }>);
    
    return Object.values(feesByMonth).sort((a,b) => a.key.localeCompare(b.key));
  }, [data]);

  if (!xpub) return <FullPageLoader />;
  if (isLoading) return <FullPageLoader />;
  if (error) return <ErrorDisplay message={error} />;
  if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;
    
  if (balanceChartData.length <= 2) { // only has start and end points
    return (
        <div className="flex flex-col items-center justify-center gap-4 text-center h-[calc(100vh-12rem)]">
          <TrendingUp className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Not Enough Data</h1>
          <p className="text-muted-foreground">
            There is not enough transaction history to generate a chart.
          </p>
        </div>
      );
  }

  const balanceChartConfig = {
    balanceFiat: { label: `Balance (${currency})`, color: 'hsl(var(--primary))' },
  };

  const monthlyVolumeConfig = {
      received: { label: 'Received', color: 'hsl(var(--chart-received))' },
      sent: { label: 'Sent', color: 'hsl(var(--chart-sent))' },
  };

  const feeScatterConfig = {
      fee: { label: 'Fee (sats)' },
      size: { label: 'Size (bytes)' },
  };
  
  const utxoChartConfig = { value: { label: 'Count', color: 'hsl(var(--chart-1))' } };

  const feeAnalysisConfig = {
    fee: { label: 'Total Fees (sats)', color: 'hsl(var(--chart-3))' },
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
       <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Portfolio Value Over Time</CardTitle>
            <CardDescription className="text-sm">
              This chart visualizes the total value of your wallet's Bitcoin balance in your selected currency.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={balanceChartConfig} className="h-[300px] sm:h-[400px] w-full">
              <AreaChart data={balanceChartData} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                <defs>
                    <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-balanceFiat)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-balanceFiat)" stopOpacity={0.1}/>
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
                  tickFormatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(value as number)}
                  domain={[0, 'dataMax']}
                />
                <Tooltip
                  cursor={true}
                  content={
                    <ChartTooltipContent
                        formatter={(value, name, props) => (
                           <div className="space-y-1">
                              <div className="font-medium">{new Date(props.payload.date).toLocaleString()}</div>
                              <div>Balance: {new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}</div>
                              <div className="text-muted-foreground text-sm">{props.payload.balanceBTC.toFixed(8)} BTC</div>
                           </div>
                        )}
                        itemStyle={{ display: 'none' }}
                    />
                  }
                />
                <Area
                  dataKey="balanceFiat"
                  type="monotone"
                  fill="url(#fillBalance)"
                  stroke="var(--color-balanceFiat)"
                  strokeWidth={2}
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
       </Card>

       <Card>
          <CardHeader>
              <CardTitle className="text-base sm:text-lg">Monthly Volume</CardTitle>
              <CardDescription className="text-sm">Sent vs. Received volume in satoshis by month.</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
              <ChartContainer config={monthlyVolumeConfig} className="h-[200px] sm:h-[250px] w-full">
                  <BarChart data={monthlyVolumeData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8} 
                        fontSize={12} 
                        tickFormatter={btcToSatsFormatter} 
                        label={{ value: 'sats', angle: -90, position: 'insideLeft' }}
                       />
                      <Tooltip 
                        cursor={true} 
                        content={<ChartTooltipContent 
                            indicator="dot" 
                            formatter={(value) => `${(Math.abs(Number(value)) * 1e8).toLocaleString()} sats`}
                        />} 
                       />
                      <Legend />
                      <Bar dataKey="received" fill="var(--color-received)" radius={4} stackId="a" />
                      <Bar dataKey="sent" fill="var(--color-sent)" radius={4} stackId="a" />
                  </BarChart>
              </ChartContainer>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-base sm:text-lg">UTXO Distribution</CardTitle>
                <CardDescription className="text-sm">Breakdown of your Unspent Transaction Outputs.</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
                <ChartContainer config={utxoChartConfig} className="h-[200px] sm:h-[250px] w-full">
                    <BarChart data={utxoChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={120} fontSize={12} />
                        <Tooltip cursor={true} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle className="text-base sm:text-lg">Fee Analysis</CardTitle>
              <CardDescription className="text-sm">Total transaction fees paid over time (in satoshis).</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
              <ChartContainer config={feeAnalysisConfig} className="h-[300px] sm:h-[400px] w-full">
                  <BarChart data={monthlyFeeData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                      <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={8} 
                          fontSize={12} 
                          tickFormatter={btcToSatsFormatter}
                          label={{ value: 'sats', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                          cursor={true} 
                          content={
                            <ChartTooltipContent 
                                formatter={(value) => (
                                    <div className="space-y-1">
                                      <div>Total Fees: {Number(Number(value) * 1e8).toLocaleString()} sats</div>
                                    </div>
                                )}
                                itemStyle={{ display: 'none' }}
                            />
                          }
                      />
                      <Bar dataKey="fee" fill="var(--color-fee)" radius={4} />
                  </BarChart>
              </ChartContainer>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-base sm:text-lg">Transaction Fee Analysis</CardTitle>
                <CardDescription className="text-sm">Fee (sats) vs. transaction size (bytes). Helps spot high-fee transactions.</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
                <ChartContainer config={feeScatterConfig} className="h-[300px] sm:h-[400px] w-full">
                    <ScatterChart margin={{ top: 20, right: 40, bottom: 20, left: 40, }}>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis type="number" dataKey="size" name="Size" tickFormatter={satsFormatter} label={{ value: 'bytes', position: 'insideBottom', offset: 0 }} />
                        <YAxis 
                            type="number" 
                            dataKey="fee" 
                            name="Fee" 
                            tickFormatter={satsFormatter} 
                            label={{ value: 'sats', angle: -90, position: 'insideLeft' }}
                        />
                        <ZAxis type="category" dataKey="id" name="txid"/>
                        <Tooltip content={<CustomFeeTooltip />} cursor={{ strokeDasharray: '3 3' }}/>
                        <Scatter name="Transactions" data={feeScatterData} fill="hsl(var(--primary))" opacity={0.6} />
                    </ScatterChart>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base sm:text-lg">Largest UTXOs</CardTitle>
                <CardDescription className="text-sm">A list of your top 10 largest unspent "coins".</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-4 sm:pl-0">Value (BTC)</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead className="text-right pr-4 sm:pr-0">Transaction ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...data.utxos].sort((a, b) => b.value - a.value).slice(0, 10).map((utxo) => (
                            <TableRow key={`${utxo.txid}:${utxo.vout}`}>
                                <TableCell className="font-mono text-xs sm:text-sm pl-4 sm:pl-0 whitespace-nowrap">{(utxo.value / 1e8).toFixed(8)}</TableCell>
                                <TableCell className="font-mono text-xs max-w-[150px] sm:max-w-none">
                                    <Link href={`/address/${utxo.address}`} className="hover:underline cursor-pointer truncate block">
                                    {utxo.address}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs pr-4 sm:pr-0">
                                     <Link href={`/transactions/${utxo.txid}`} className="hover:underline cursor-pointer whitespace-nowrap">
                                        {utxo.txid.slice(0,10)}...
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                         {data.utxos.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-sm">
                                    No unspent transaction outputs (UTXOs) found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
