
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconContainer } from '@/components/ui/icon-container';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { getMarketPageData } from '@/lib/market';
import type { MarketPageData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, ComposedChart, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bitcoin, ArrowUp, ArrowDown } from 'lucide-react';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWallet } from '@/contexts/wallet-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const timeRanges = [
    { label: 'Live', value: '1' },
    { label: '7D', value: '7' },
    { label: '1M', value: '30' },
    { label: '1Y', value: '365' },
];

function FearGreedNeedle({ value }: { value: number }) {
    const rotation = (value / 100) * 180 - 90; // Map 0-100 to -90deg to 90deg

    return (
        <div className="relative w-full h-12">
            <div className="absolute bottom-0 left-0 w-full h-12 rounded-t-full overflow-hidden">
                 <div className="absolute w-full h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" />
            </div>
            <div
                className="absolute bottom-0 left-1/2 w-0.5 h-10 bg-card-foreground origin-bottom transition-transform duration-500"
                style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
            />
            <div className="absolute bottom-0 left-1/2 w-2 h-2 rounded-full bg-card-foreground transform -translate-x-1/2" />
        </div>
    );
}

function MarketStatItem({ label, value, subValue, change, tooltipText }: { label: string, value: string | number, subValue?: string | number, change?: number, tooltipText?: string }) {
    const content = (
        <div className="flex flex-col p-2 sm:p-3 rounded-lg bg-card-foreground/5 text-left h-full justify-between">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div>
                <p className="text-base sm:text-lg font-bold mt-1">{value}</p>
                {subValue && (
                     <div className="flex items-baseline gap-1 sm:gap-1.5">
                        <p className="text-xs text-muted-foreground">{subValue}</p>
                        {change !== undefined && (
                            <p className={cn("text-xs font-bold", change >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                                {change >= 0 ? '▲' : '▼'}{Math.abs(change).toFixed(2)}%
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    if (!tooltipText) return content;

    return (
        <UITooltip>
            <TooltipTrigger asChild>
                <div className="cursor-help">{content}</div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
                <p>{tooltipText}</p>
            </TooltipContent>
        </UITooltip>
    );
}

const CustomCandlestickTooltip = ({ active, payload, label, formatCurrency, formatCompact }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="p-2 text-xs rounded-lg border bg-background/95 backdrop-blur-sm">
                <div className="font-bold mb-1">{new Date(data.time).toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-x-2">
                    <div className="text-muted-foreground">Open:</div> <div className="font-mono text-right">{formatCurrency(data.open)}</div>
                    <div className="text-muted-foreground">High:</div> <div className="font-mono text-right">{formatCurrency(data.high)}</div>
                    <div className="text-muted-foreground">Low:</div> <div className="font-mono text-right">{formatCurrency(data.low)}</div>
                    <div className="text-muted-foreground">Close:</div> <div className="font-mono text-right">{formatCurrency(data.close)}</div>
                </div>
            </div>
        );
    }
    return null;
};


export default function MarketPage() {
    const { currency } = useWallet();
    const [data, setData] = useState<MarketPageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState('30');
    const isMobile = useIsMobile();

    const formatCurrency = useCallback((value: number | null | undefined, options?: Intl.NumberFormatOptions) => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            ...options
        }).format(value);
    }, [currency]);
    
    const formatCompact = useCallback((value: number | null | undefined) => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 2,
        }).format(value);
    }, []);

    const loadData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) {
            setIsLoading(true);
            setError(null);
        }
        const { data: marketData, error: apiError } = await getMarketPageData(range, currency);
        if (apiError) {
            setError(apiError);
            if (isInitialLoad) setData(null);
        } else {
            setData(marketData);
            if (!isInitialLoad) setError(null);
        }

        if (isInitialLoad) {
            setIsLoading(false);
        }
    }, [range, currency]);

    useEffect(() => {
        loadData(true);
    }, [loadData]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadData(false);
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [loadData]);

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.chartData.map(d => ({ date: d.timestamp, Price: d.price }));
    }, [data]);

    const candlestickChartData = useMemo(() => {
        if (!data) return [];
        return data.candlestickData.map(d => ({ ...d, ohlc: [d.open, d.high, d.low, d.close] }));
    }, [data]);
    
    const { priceChange, priceChangePercentage, isPositiveChange } = useMemo(() => {
        if (!data || !chartData || chartData.length < 2) {
            return {
                priceChange: data?.marketData.price_change_24h ?? 0,
                priceChangePercentage: data?.marketData.price_change_percentage_24h ?? 0,
                isPositiveChange: (data?.marketData.price_change_percentage_24h ?? 0) >= 0,
            };
        }
    
        if (range === '1') {
            return {
                priceChange: data.marketData.price_change_24h,
                priceChangePercentage: data.marketData.price_change_percentage_24h,
                isPositiveChange: data.marketData.price_change_percentage_24h >= 0,
            };
        }
    
        const firstPrice = chartData[0].Price;
        const lastPrice = chartData[chartData.length - 1].Price;
        
        const absoluteChange = lastPrice - firstPrice;
        const percentageChange = firstPrice === 0 ? 0 : (absoluteChange / firstPrice) * 100;
    
        return {
            priceChange: absoluteChange,
            priceChangePercentage: percentageChange,
            isPositiveChange: percentageChange >= 0,
        };
    }, [data, chartData, range]);

    const chartConfig = useMemo(() => ({
        Price: {
            label: `Price (${currency})`,
            color: isPositiveChange
                ? 'hsl(var(--chart-positive))'
                : 'hsl(var(--chart-negative))',
        },
    }), [isPositiveChange, currency]);
    
    if (isLoading) return <FullPageLoader />;
    if (error) return <ErrorDisplay message={error} />;
    if (!data) return <ErrorDisplay message="No market data found." />;

    const { marketData, fearAndGreed } = data;

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="lg:col-span-4 border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-orange-500/5 via-transparent to-transparent border-b">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <IconContainer variant="orange">
                                  <Bitcoin className="h-6 w-6 sm:h-8 sm:w-8" />
                                </IconContainer>
                                <div>
                                    <CardTitle className="text-lg sm:text-2xl font-bold">Bitcoin <span className="text-muted-foreground font-normal">BTC</span></CardTitle>
                                    <CardDescription className="text-xs">
                                        Last updated: {formatDistanceToNow(new Date(marketData.last_updated), { addSuffix: true })}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="text-left sm:text-right w-full sm:w-auto">
                                <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter">{formatCurrency(marketData.price)}</p>
                                <div className={cn("flex items-center sm:justify-end gap-1 text-sm sm:text-base font-bold", isPositiveChange ? 'text-emerald-500' : 'text-rose-500')}>
                                    {isPositiveChange ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />}
                                    {formatCurrency(priceChange)} ({priceChangePercentage.toFixed(2)}%)
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MarketStatItem label="Market Cap" value={formatCompact(marketData.market_cap)} subValue={`Rank #${marketData.market_cap_rank}`} tooltipText="Price x Circulating Supply." />
                    <MarketStatItem label="Volume (24h)" value={formatCompact(marketData.total_volume)} tooltipText="The value of BTC traded in 24 hours." />
                    <MarketStatItem 
                        label="High / Low (24h)" 
                        value={formatCurrency(marketData.high_24h)} 
                        subValue={formatCurrency(marketData.low_24h)} 
                        change={marketData.price_change_percentage_24h}
                        tooltipText="The highest and lowest trading price in the last 24 hours." 
                    />
                    {fearAndGreed && fearAndGreed.value_classification !== 'Error' && (
                        <UITooltip>
                            <TooltipTrigger asChild>
                                <div className="flex flex-col p-3 rounded-lg bg-card-foreground/5 text-left h-full justify-between cursor-help">
                                    <p className="text-xs text-muted-foreground">Fear & Greed Index</p>
                                    <div>
                                        <p className="text-lg font-bold mt-1">{fearAndGreed.value_classification}</p>
                                        <FearGreedNeedle value={fearAndGreed.value} />
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>Daily market sentiment. Current value: {fearAndGreed.value}.</p>
                            </TooltipContent>
                        </UITooltip>
                    )}
                </div>

                <Card className="lg:col-span-4 border-2 shadow-md">
                    <Tabs defaultValue="price">
                        <CardHeader className="flex flex-col items-start justify-between gap-3 sm:gap-2 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent border-b">
                            <div className='w-full'>
                                <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-grid">
                                    <TabsTrigger value="price" className="text-xs sm:text-sm">Price Chart</TabsTrigger>
                                    <TabsTrigger value="candlestick" className="text-xs sm:text-sm">Candlestick</TabsTrigger>
                                </TabsList>
                                <CardDescription className="mt-2 text-xs sm:text-sm">
                                    Price data by{' '}
                                    <a
                                        href="https://www.coingecko.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-primary cursor-pointer"
                                    >
                                        CoinGecko
                                    </a>
                                </CardDescription>
                            </div>
                            <div className="flex gap-1 rounded-md bg-muted p-1 w-full sm:w-auto overflow-x-auto">
                                {timeRanges.map(r => (
                                    <Button
                                        key={r.value}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setRange(r.value)}
                                        className={cn(
                                            "h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm flex-shrink-0",
                                            range === r.value
                                                ? "bg-background text-foreground shadow-sm hover:bg-background/90"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {r.label}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-6">
                            <TabsContent value="price">
                                <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px] w-full">
                                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-Price)" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="var(--color-Price)" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        {!isMobile && (
                                            <XAxis
                                                dataKey="date"
                                                type="number"
                                                domain={['dataMin', 'dataMax']}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickCount={isMobile ? 3 : 5}
                                                tickFormatter={(value) => {
                                                    const date = new Date(value);
                                                    switch(range) {
                                                        case '1': return date.toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit', hour12: false });
                                                        case '7': return date.toLocaleDateString(undefined, { weekday: 'short' });
                                                        default: return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                    }
                                                }}
                                                height={30}
                                            />
                                        )}
                                        <YAxis
                                            orientation="right"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => formatCompact(value as number)}
                                            domain={['dataMin * 0.99', 'dataMax * 1.01']}
                                            width={isMobile ? 35 : 50}
                                            fontSize={12}
                                        />
                                        <Tooltip
                                            cursor={true}
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(value, name, props) => (
                                                        <div className="space-y-1 text-sm">
                                                            <div className="font-medium">{new Date(props.payload.date).toLocaleString()}</div>
                                                            <div>Price: {formatCurrency(Number(value))}</div>
                                                        </div>
                                                    )}
                                                    itemStyle={{ display: 'none' }}
                                                />
                                            }
                                        />
                                        <Area
                                            dataKey="Price"
                                            type="monotone"
                                            fill="url(#fillPrice)"
                                            stroke="var(--color-Price)"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </TabsContent>
                            <TabsContent value="candlestick">
                                <ChartContainer config={{}} className="h-[300px] sm:h-[400px] w-full">
                                    <ComposedChart data={candlestickChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="time"
                                            type="number"
                                            domain={['dataMin', 'dataMax']}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            hide={isMobile}
                                        />
                                        <YAxis
                                            orientation="right"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            domain={['dataMin * 0.98', 'dataMax * 1.02']}
                                            tickFormatter={(value) => formatCompact(value as number)}
                                            width={isMobile ? 35 : 50}
                                            fontSize={12}
                                        />
                                        <Tooltip content={<CustomCandlestickTooltip formatCurrency={formatCurrency} formatCompact={formatCompact} />} />
                                        <Bar dataKey="ohlc" barSize={Number(range) > 90 ? 1 : 5}>
                                            {candlestickChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.close > entry.open ? 'hsl(var(--chart-positive))' : 'hsl(var(--chart-negative))'} />
                                            ))}
                                        </Bar>
                                    </ComposedChart>
                                </ChartContainer>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </div>
        </TooltipProvider>
    );
}
