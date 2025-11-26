

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
import { format, startOfYear, endOfYear, getYear, isSameDay, subDays, subMonths, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Info, ChevronsUpDown, Bitcoin as BitcoinIcon, X, ArrowUp, ArrowDown } from 'lucide-react';

import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip as RechartsTooltip, Bar } from 'recharts';
import type { TaxReportOutput as TaxReportData, Holding } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type PortfolioHistoryPoint = {
    date: number; // as timestamp
    totalValue: number;
    costBasis: number;
} | null;

type SortKey = 'address' | 'balance' | 'cost' | 'marketValue' | 'roi' | 'potentialGain';
type TaxSortKey = 'address' | 'balance' | 'marketValue' | 'cost' | 'potentialGain' | 'rate' | 'amountToSell';


const StatCard = ({ title, value, change, changeColor, tooltip, large = false }: { title: string, value: string, change?: string, changeColor?: string, tooltip: string, large?: boolean }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="group cursor-help transition-all duration-200 hover:scale-[1.02]">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium mb-2">
                        {title} <Info className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <div className={cn("font-bold tracking-tighter transition-colors", large ? "text-3xl" : "text-2xl")}>{value}</div>
                    {change && <p className={cn("text-sm font-bold mt-2", changeColor)}>{change}</p>}
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs"><p className="font-normal">{tooltip}</p></TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const SummaryCard = ({ title, value }: { title: string, value: string }) => (
    <div className="p-4 rounded-lg bg-card-foreground/5 text-center border hover:shadow-md hover:bg-card-foreground/10 transition-all duration-200">
        <p className="text-sm text-muted-foreground font-medium mb-2">{title}</p>
        <p className="text-lg font-bold">{value}</p>
    </div>
);

const chartConfig = {
    totalValue: { label: 'Total Value', color: 'hsl(var(--chart-1))' },
    costBasis: { label: 'Cost Basis', color: 'hsl(var(--muted-foreground))' },
};
  
const CustomPortfolioTooltip = ({ active, payload, label, formatCurrencyFull }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as PortfolioHistoryPoint;
        if (!data) return null;
        const unrealizedGains = data.totalValue - data.costBasis;
        const unrealizedPercent = data.costBasis > 0 ? (unrealizedGains / data.costBasis) * 100 : 0;
        return (
            <div className="rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur-sm text-sm">
                <p className="font-medium mb-1">{format(new Date(data.date), 'dd MMM yyyy')}</p>
                <p>Worth: <span className="font-bold">{formatCurrencyFull(data.totalValue)}</span></p>
                <p>Cost basis: <span className="font-bold">{formatCurrencyFull(data.costBasis)}</span></p>
                <p>Unrealized: <span className={cn("font-bold", unrealizedGains >= 0 ? "text-emerald-500" : "text-rose-500")}>{formatCurrencyFull(unrealizedGains)} ({unrealizedPercent.toFixed(1)}%)</span></p>
            </div>
        );
    }
    return null;
};

// Generic sortable header component
const SortableHeader = <T extends string>({ sortKey, label, sortConfig, requestSort, isTaxTable = false }: { sortKey: T, label: React.ReactNode, sortConfig: { key: T | null; direction: 'ascending' | 'descending' }, requestSort: (key: T) => void, isTaxTable?: boolean}) => {
    const isSorting = sortConfig.key === sortKey;
    const buttonClasses = cn(
        "p-1",
        isTaxTable ? "flex-col items-start whitespace-normal h-auto text-left" : "items-center"
    );

    return (
        <TableHead>
            <Button variant="ghost" onClick={() => requestSort(sortKey)} className={buttonClasses}>
                <span>{label}</span>
                {isSorting ? (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4 inline-block" /> : <ArrowDown className="ml-2 h-4 w-4 inline-block" />
                ) : (
                    <ChevronsUpDown className="ml-2 h-4 w-4 inline-block" />
                )}
            </Button>
        </TableHead>
    );
};

const ValueCostBar = ({ marketValue, cost }: { marketValue: number, cost: number }) => {
    if (marketValue <= 0 && cost <= 0) return <div className="h-2 w-full bg-muted rounded-full" />;
  
    const total = marketValue + cost;
    const marketValuePercent = total > 0 ? (marketValue / total) * 100 : 0;
    const costPercent = total > 0 ? (cost / total) * 100 : 100;
  
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-full h-2 bg-rose-500/30 rounded-full flex cursor-help">
                        <div style={{ width: `${costPercent}%` }} className="h-full bg-rose-500/80 rounded-l-full" />
                        <div style={{ width: `${marketValuePercent}%` }} className="h-full bg-emerald-500/80 rounded-r-full" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-normal">Cost Basis vs. Market Value</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  };


export default function BasicReportPage() {
    const { data: walletData, isLoading: isWalletLoading, error: walletError, activeXpub: xpub, currency, currencySymbol } = useWallet();
    const [reportData, setReportData] = useState<TaxReportData | null>(null);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [selectedAssets, setSelectedAssets] = useState<Record<string, boolean>>({});
    
    const [activeChartDataPoint, setActiveChartDataPoint] = useState<PortfolioHistoryPoint>(null);

    const [date, setDate] = useState<DateRange | undefined>(() => {
        const endDate = new Date();
        const startDate = subMonths(endDate, 12);
        return { from: startDate, to: endDate };
    });
    
    const [isDateRangePopoverOpen, setIsDateRangePopoverOpen] = useState(false);
    const [holdingsDate, setHoldingsDate] = useState<Date>(date?.to || new Date());
    const [isHoldingsPopoverOpen, setIsHoldingsPopoverOpen] = useState(false);
    
    // State for Tax Optimization filters
    const [searchQuery, setSearchQuery] = useState('');
    const [showZeroBalance, setShowZeroBalance] = useState(false);
    const [showPositiveGains, setShowPositiveGains] = useState(true);

    // State for holdings table sorting
    const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'ascending' | 'descending' }>({ key: 'marketValue', direction: 'descending' });
    const [taxSortConfig, setTaxSortConfig] = useState<{ key: TaxSortKey | null; direction: 'ascending' | 'descending' }>({ key: 'potentialGain', direction: 'ascending' });

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
            const response = await fetch('/api/tax-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletData: JSON.stringify(walletData),
                    startDate: date.from.toISOString(),
                    endDate: date.to.toISOString(),
                    currency: currency,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate report');
            }

            const result = await response.json();
            setReportData(result);
            setHoldingsDate(date.to);
            setSelectedAssets({});
        } catch (e: any) {
            setReportError(e.message || "An error occurred while generating the report.");
        } finally {
            setIsReportLoading(false);
        }
    }, [walletData, date, currency]);

    // Generate report only on initial load when wallet data becomes available
    // Note: generateReport is intentionally NOT in dependencies to prevent auto-refresh
    // Users must click "Generate Report" button to regenerate with new date/currency values
    useEffect(() => {
        if (walletData && !reportData && !isReportLoading && !reportError) {
            generateReport();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletData]);
    
    const afterSummary = useMemo(() => {
        if (!reportData) return null;

        const initialGains = reportData.summary.realizedGains;
        const selectedGains = Object.keys(selectedAssets).reduce((total, assetName) => {
            if (selectedAssets[assetName]) {
                const asset = reportData.holdings.find(h => h.address === assetName);
                if (asset) {
                    const potentialGain = asset.marketValue - asset.cost;
                    return total + potentialGain;
                }
            }
            return total;
        }, 0);

        const newRealizedGains = initialGains + selectedGains;
        const totalProfit = Math.max(0, newRealizedGains);
        const totalLosses = Math.abs(Math.min(0, newRealizedGains));

        return {
            netGains: newRealizedGains,
            totalProfit,
            totalLosses,
        }

    }, [reportData, selectedAssets]);


    const chartData = useMemo(() => {
        if (!reportData?.portfolioHistory) return [];
        return reportData.portfolioHistory.map(item => ({
            date: new Date(item.date).getTime(),
            totalValue: item.totalValue,
            costBasis: item.costBasis,
        }));
    }, [reportData]);

    const holdingsForSelectedDate = useMemo(() => {
        if (!reportData || !holdingsDate || !walletData) return [];

        const historyEntry = reportData.portfolioHistory.find(h => 
            isSameDay(new Date(h.date), startOfDay(holdingsDate))
        );

        if (!historyEntry) return reportData.holdings; // Fallback to end-of-period holdings

        const dayTotalValue = historyEntry.totalValue;
        const dayCostBasis = historyEntry.costBasis;

        const totalBtc = walletData.balanceBTC;
        if (totalBtc === 0) return [];
        
        return reportData.holdings.map(holding => {
            const proportion = holding.balance / totalBtc;
            const marketValue = dayTotalValue * proportion;
            const cost = dayCostBasis * proportion;
            const roi = cost > 0 ? ((marketValue - cost) / cost) * 100 : 0;
            const potentialGain = marketValue - cost;
            return {
                ...holding,
                marketValue,
                cost,
                roi,
                potentialGain
            };
        });
    }, [reportData, holdingsDate, walletData]);
    
    const sortedHoldings = useMemo(() => {
        let sortableItems = [...holdingsForSelectedDate];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [holdingsForSelectedDate, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const requestTaxSort = (key: TaxSortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (taxSortConfig.key === key && taxSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setTaxSortConfig({ key, direction });
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

    const filteredHoldings = useMemo(() => {
        if (!reportData) return [];
        return reportData.holdings.map(asset => ({
            ...asset,
            potentialGain: asset.marketValue - asset.cost,
        })).filter(asset => {
            const matchesSearch = searchQuery ? asset.address.toLowerCase().includes(searchQuery.toLowerCase()) : true;
            const hasBalance = showZeroBalance ? true : asset.balance > 0;
            const matchesPositiveGains = showPositiveGains ? true : (asset.potentialGain || 0) <= 0;

            return matchesSearch && hasBalance && matchesPositiveGains;
        });
    }, [reportData, searchQuery, showZeroBalance, showPositiveGains]);

    const sortedTaxHoldings = useMemo(() => {
        let sortableItems: Holding[] = [...filteredHoldings];
        if (taxSortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue, bValue;
                if (taxSortConfig.key === 'rate') {
                    aValue = a.balance > 0 ? a.marketValue / a.balance : 0;
                    bValue = b.balance > 0 ? b.marketValue / b.balance : 0;
                } else if (taxSortConfig.key === 'amountToSell') {
                    // This column is not implemented yet, so sorting does nothing
                    aValue = 0;
                    bValue = 0;
                } else {
                    aValue = a[taxSortConfig.key!];
                    bValue = b[taxSortConfig.key!];
                }

                if (aValue === undefined || aValue === null || bValue === undefined || bValue === null) return 0;
                
                if (aValue < bValue) {
                    return taxSortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return taxSortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredHoldings, taxSortConfig]);

    const handleSelectAll = (checked: boolean | string) => {
        const newSelected: Record<string, boolean> = {};
        if (checked === true) {
            filteredHoldings.forEach(asset => {
                newSelected[asset.address] = true;
            });
        }
        setSelectedAssets(newSelected);
    };
    
    const numSelected = Object.values(selectedAssets).filter(Boolean).length;
    const numFiltered = filteredHoldings.length;
    const selectAllCheckedState = numFiltered > 0 && numSelected === numFiltered ? true : numSelected > 0 ? 'indeterminate' : false;
    
    const isHistoricalView = useMemo(() => {
        if (!date?.to) return false;
        return !isSameDay(holdingsDate, date.to);
    }, [holdingsDate, date]);
    
    const displayStats = useMemo(() => {
        if (activeChartDataPoint) return {
            endValue: activeChartDataPoint.totalValue,
            costBasis: activeChartDataPoint.costBasis,
            unrealizedGains: activeChartDataPoint.totalValue - activeChartDataPoint.costBasis
        }
        if (isHistoricalView) {
            const historicalPoint = chartData.find(d => d && isSameDay(new Date(d.date), holdingsDate));
            if (historicalPoint) {
                return {
                    endValue: historicalPoint.totalValue,
                    costBasis: historicalPoint.costBasis,
                    unrealizedGains: historicalPoint.totalValue - historicalPoint.costBasis,
                };
            }
        }
        return reportData?.summary;
    }, [isHistoricalView, holdingsDate, chartData, reportData, activeChartDataPoint]);


    if (!xpub || isWalletLoading) return <FullPageLoader />;
    if (walletError) return <ErrorDisplay message={walletError} />;
    
    if (isReportLoading && !reportData) {
        return (
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Generating Report...</CardTitle>
                        <CardDescription className="font-normal">Our AI is analyzing your transactions to build your financial report. This may take a moment...</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FullPageLoader />
                    </CardContent>
                 </Card>
            </div>
        );
    }

    if (reportError) return <ErrorDisplay message={reportError} />;
    if (!reportData || !displayStats) return <ErrorDisplay message="Could not generate the report." />;

    const { summary } = reportData;
    const isGain = summary.totalValueChangePercentage >= 0;

    return (
        <div className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <TabsList className="shadow-sm">
                        <TabsTrigger value="overview" className="data-[state=active]:shadow-sm">Overview</TabsTrigger>
                        <TabsTrigger value="tax" className="data-[state=active]:shadow-sm">Tax Optimization</TabsTrigger>
                    </TabsList>
                    <div className="w-full sm:w-auto flex gap-2">
                        <Button 
                            onClick={async () => {
                                setIsReportLoading(true);
                                try {
                                  await generateReport();
                                } finally {
                                  setIsReportLoading(false);
                                }
                            }}
                            disabled={isReportLoading}
                            variant="outline"
                            className="whitespace-nowrap shadow-sm hover:shadow-md transition-shadow"
                        >
                            {isReportLoading ? 'Generating...' : 'Generate Report'}
                        </Button>
                        <Popover open={isDateRangePopoverOpen} onOpenChange={setIsDateRangePopoverOpen}>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-auto justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                date.to ? (
                                    <>
                                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
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
                </div>
                
                <TabsContent value="overview" className="mt-6 space-y-6">
                        <Card className="border-2 shadow-lg">
                            {isHistoricalView && (
                                <div className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Info className="h-4 w-4" />
                                        You are viewing a historical snapshot of your portfolio as at {format(holdingsDate, 'dd MMM yyyy')}.
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-auto p-1 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20" onClick={() => setHoldingsDate(date?.to || new Date())}>
                                        <X className="mr-1 h-3 w-3" />
                                        Reset
                                    </Button>
                                </div>
                            )}
                            <CardContent className="p-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <StatCard 
                                        large 
                                        title={activeChartDataPoint ? format(new Date(activeChartDataPoint.date), 'dd MMM yyyy') : "Total Value"} 
                                        value={formatCurrencyFull(displayStats.endValue)} 
                                        change={`${isGain ? '▲' : '▼'} ${summary.totalValueChangePercentage.toFixed(2)}%`}
                                        changeColor={isGain ? 'text-emerald-500' : 'text-rose-500'}
                                        tooltip="The total market value of your Bitcoin balance."
                                    />
                                    <div className="col-span-1 md:col-span-1" />
                                    <StatCard 
                                        title="Cost Basis" 
                                        value={formatCurrencyFull(displayStats.costBasis)} 
                                        tooltip="The total amount of money you've invested to acquire your current Bitcoin holdings."
                                    />
                                    <StatCard 
                                        title="Unrealized Gains" 
                                        value={formatCurrencyFull(displayStats.unrealizedGains)}
                                        changeColor={(displayStats.unrealizedGains || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                        tooltip="The potential profit or loss if you sold all your Bitcoin holdings today. This is not taxed until you sell."
                                    />
                                </div>
                            </CardContent>
                            <CardContent className="px-2 sm:px-6 pt-0 pb-6 h-[300px] sm:h-[400px] w-full">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                    <AreaChart 
                                        data={chartData}
                                        onMouseMove={(e) => {
                                            if (e.activePayload && e.activePayload.length > 0) {
                                                setActiveChartDataPoint(e.activePayload[0].payload);
                                            } else {
                                                setActiveChartDataPoint(null);
                                            }
                                        }}
                                        onMouseLeave={() => setActiveChartDataPoint(null)}
                                    >
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
                                        <RechartsTooltip
                                            cursor={false}
                                            content={<CustomPortfolioTooltip formatCurrencyFull={formatCurrencyFull} />}
                                        />
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
                                        {activeChartDataPoint && (
                                            <ReferenceLine x={activeChartDataPoint.date} stroke="hsl(var(--destructive))" strokeWidth={1.5} />
                                        )}
                                        {isHistoricalView && (
                                            <ReferenceLine x={holdingsDate.getTime()} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="3 3"/>
                                        )}
                                    </AreaChart>
                            </ChartContainer>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <SummaryCard title="Inflow" value={formatCurrencyFull(summary.inflow)} />
                            <SummaryCard title="Outflow" value={formatCurrencyFull(summary.outflow)} />
                            <SummaryCard title="Trading Fees" value={formatCurrencyFull(summary.tradingFees)} />
                            <SummaryCard title="Realized Gains" value={formatCurrencyFull(summary.realizedGains)} />
                        </div>
                        <Card className="border-2 shadow-md">
                        <CardHeader className="flex flex-row items-center gap-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <BitcoinIcon className="h-5 w-5 text-amber-500" />
                                Holdings
                            </CardTitle>
                            <Popover open={isHoldingsPopoverOpen} onOpenChange={setIsHoldingsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-8 text-sm">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(holdingsDate, "dd MMM yyyy")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={holdingsDate}
                                        onSelect={(day) => {
                                            if (day) setHoldingsDate(day);
                                            setIsHoldingsPopoverOpen(false);
                                        }}
                                        disabled={{ after: new Date() }}
                                        initialFocus
                                    />
                                    <div className="p-2 border-t border-border flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-center"
                                            onClick={() => {
                                                setHoldingsDate(date?.to || new Date());
                                                setIsHoldingsPopoverOpen(false);
                                            }}
                                        >
                                            Today
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-center"
                                            onClick={() => {
                                                const yesterday = subDays(date?.to || new Date(), 1);
                                                if (date?.from && yesterday >= date.from) {
                                                    setHoldingsDate(yesterday);
                                                }
                                                setIsHoldingsPopoverOpen(false);
                                            }}
                                        >
                                            Yesterday
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                       <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs font-normal">This shows the value breakdown for each address based on the overall portfolio value on {format(holdingsDate, "dd MMM yyyy")}.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardHeader>
                        <CardContent className="px-0 sm:px-6 pt-6">
                            <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b-2">
                                        <SortableHeader<SortKey> sortKey="address" label="Address" sortConfig={sortConfig} requestSort={requestSort} />
                                        <SortableHeader<SortKey> sortKey="balance" label="Balance" sortConfig={sortConfig} requestSort={requestSort} />
                                        <SortableHeader<SortKey> sortKey="marketValue" label="Market Value" sortConfig={sortConfig} requestSort={requestSort} />
                                        <TableHead className="hidden md:table-cell">
                                            <Button variant="ghost" onClick={() => requestSort('cost')} className="p-1 items-center">
                                                <span>Cost ({currency})</span>
                                                {sortConfig.key === 'cost' ? (
                                                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4 inline-block" /> : <ArrowDown className="ml-2 h-4 w-4 inline-block" />
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 inline-block" />
                                                )}
                                            </Button>
                                        </TableHead>
                                        <SortableHeader<SortKey> sortKey="potentialGain" label="Potential Gain" sortConfig={sortConfig} requestSort={requestSort} />
                                        <TableHead className="hidden lg:table-cell">
                                            <Button variant="ghost" onClick={() => requestSort('roi')} className="p-1 items-center">
                                                <span>ROI</span>
                                                {sortConfig.key === 'roi' ? (
                                                    sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4 inline-block" /> : <ArrowDown className="ml-2 h-4 w-4 inline-block" />
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 inline-block" />
                                                )}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="hidden lg:table-cell text-right pr-4 sm:pr-0">Performance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedHoldings.map(asset => {
                                        return (
                                        <TableRow key={asset.address} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="pl-4 sm:pl-0">
                                                <div className="flex items-center gap-2 font-mono text-xs min-w-[120px] max-w-[200px]">
                                                    <BitcoinIcon className="h-4 w-4 text-amber-500 shrink-0" />
                                                    <span className="truncate">{asset.address}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <p className="font-normal text-xs sm:text-sm">{asset.balance.toFixed(8)}</p>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <p className="font-normal text-xs sm:text-sm">{formatCurrencyFull(asset.marketValue)}</p>
                                                <p className="text-xs text-muted-foreground font-normal hidden sm:block">{asset.balance > 0 ? formatCurrencyFull(asset.marketValue / asset.balance) : formatCurrencyFull(0)} / unit</p>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell whitespace-nowrap">
                                                <p className="font-normal">{formatCurrencyFull(asset.cost)}</p>
                                                <p className="text-xs text-muted-foreground font-normal">{asset.balance > 0 ? formatCurrencyFull(asset.cost / asset.balance) : formatCurrencyFull(0)} / unit</p>
                                            </TableCell>
                                            <TableCell className={cn("font-bold whitespace-nowrap text-xs sm:text-sm", (asset.potentialGain || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {formatCurrencyFull(asset.potentialGain)}
                                            </TableCell>
                                            <TableCell className={cn("hidden lg:table-cell font-bold whitespace-nowrap", asset.roi >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {asset.roi.toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-right pr-4 sm:pr-0">
                                                <div className="h-8 w-20 ml-auto flex items-center">
                                                    <ValueCostBar marketValue={asset.marketValue} cost={asset.cost} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                            </div>
                        </CardContent>
                        </Card>
                </TabsContent>
                <TabsContent value="tax" className="mt-6 space-y-6">
                    <Alert className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 text-foreground shadow-sm">
                        <AlertTitle className="font-bold text-lg">A Guide to Realizing Profit and Losses</AlertTitle>
                        <AlertDescription className="font-normal leading-relaxed">
                            This tool helps you visualize the potential impact of selling the Bitcoin held at specific addresses on your capital gains for the selected period. This practice is often called "tax-loss harvesting" when used to offset gains with losses. By selecting addresses below, you can simulate selling the Bitcoin from those addresses and see how it affects the "After" calculation.
                            <br/>
                            <span className="text-xs italic">Disclaimer: This is for informational purposes only and does not constitute financial or tax advice for your jurisdiction. Consult with a qualified professional for advice specific to your situation.</span>
                        </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
                            <CardHeader className="flex-row items-center justify-between pb-2 bg-gradient-to-br from-muted/30 to-transparent border-b">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <CardTitle className="text-lg flex items-center gap-2 cursor-help font-bold">
                                                Before <Info className="h-4 w-4 text-muted-foreground" />
                                            </CardTitle>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs font-normal">These are your total capital gains from all your Bitcoin transactions for the selected period.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <div className="text-right text-xs text-muted-foreground font-normal">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="cursor-help flex items-center gap-1.5">Total profit <Info className="h-3 w-3" />: {formatCurrencyFull(Math.max(0, summary.realizedGains))}</p>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-normal">Total amount of profit realized for the selected period.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="cursor-help flex items-center gap-1.5">Total losses <Info className="h-3 w-3" />: {formatCurrencyFull(Math.abs(Math.min(0, summary.realizedGains)))}</p>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-normal">Total amount of losses realized for the selected period.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className={cn("text-4xl font-bold tracking-tighter", summary.realizedGains >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{formatCurrencyFull(summary.realizedGains)}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
                            <CardHeader className="flex-row items-center justify-between pb-2 bg-gradient-to-br from-primary/10 to-transparent border-b">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <CardTitle className="text-lg flex items-center gap-2 cursor-help font-bold">
                                                After <Info className="h-4 w-4 text-muted-foreground" />
                                            </CardTitle>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs font-normal">This is your potential capital gains after simulating the sale of the Bitcoin at the selected addresses below. Check the relevant boxes to see how selling would impact your overall gains.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {afterSummary && (
                                    <div className="text-right text-xs text-muted-foreground font-normal">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="cursor-help flex items-center gap-1.5">Total profit <Info className="h-3 w-3" />: {formatCurrencyFull(afterSummary.totalProfit)}</p>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-normal">Total amount of profit realized, after factoring in any selected addresses.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="cursor-help flex items-center gap-1.5">Total losses <Info className="h-3 w-3" />: {formatCurrencyFull(afterSummary.totalLosses)}</p>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-normal">Total amount of losses realized, after factoring in any selected addresses.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                    {afterSummary && <p className={cn("text-4xl font-bold tracking-tighter", afterSummary.netGains >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{formatCurrencyFull(afterSummary.netGains)}</p>}
                            </CardContent>
                        </Card>
                    </div>
                    <Card className="border-2 shadow-md">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                            <div className="flex flex-col gap-4">
                                <Input 
                                    placeholder="Find address" 
                                    className="w-full sm:max-w-xs shadow-sm" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch id="unknown-price" checked={showZeroBalance} onCheckedChange={setShowZeroBalance} />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Label htmlFor="unknown-price" className="text-xs sm:text-sm flex items-center gap-1.5 cursor-help">
                                                        Zero Balance <Info className="h-3 w-3 text-muted-foreground"/>
                                                    </Label>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs font-normal">Show or hide addresses that currently have a zero balance. This can help you focus on addresses with holdings to potentially sell.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch id="positive-gains" checked={showPositiveGains} onCheckedChange={setShowPositiveGains} />
                                         <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Label htmlFor="positive-gains" className="text-xs sm:text-sm flex items-center gap-1.5 cursor-help">
                                                        Positive Gains <Info className="h-3 w-3 text-muted-foreground"/>
                                                    </Label>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs font-normal">You can hide any address with no harvestable losses (i.e., only unrealized gains) by turning this toggle off.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 sm:px-6 pt-6">
                            <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b-2">
                                        <TableHead className="w-[50px] font-semibold">
                                            <Checkbox
                                                checked={selectAllCheckedState}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <SortableHeader<TaxSortKey> isTaxTable sortKey="address" label="Address" sortConfig={taxSortConfig} requestSort={requestTaxSort} />
                                        <SortableHeader<TaxSortKey> isTaxTable sortKey="balance" label="Amount held" sortConfig={taxSortConfig} requestSort={requestTaxSort} />
                                        <TableHead className="hidden md:table-cell">
                                            <Button variant="ghost" onClick={() => requestTaxSort('rate')} className="p-1 flex-col items-start whitespace-normal h-auto text-left">
                                                <span>{currency} rate</span>
                                                {taxSortConfig.key === 'rate' ? (
                                                    taxSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4 inline-block" /> : <ArrowDown className="ml-2 h-4 w-4 inline-block" />
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 inline-block" />
                                                )}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="hidden sm:table-cell">
                                            <Button variant="ghost" onClick={() => requestTaxSort('marketValue')} className="p-1 flex-col items-start whitespace-normal h-auto text-left">
                                                <span>Market value</span>
                                                {taxSortConfig.key === 'marketValue' ? (
                                                    taxSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4 inline-block" /> : <ArrowDown className="ml-2 h-4 w-4 inline-block" />
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 inline-block" />
                                                )}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="hidden lg:table-cell">
                                            <Button variant="ghost" onClick={() => requestTaxSort('cost')} className="p-1 flex-col items-start whitespace-normal h-auto text-left">
                                                <span>Cost basis</span>
                                                {taxSortConfig.key === 'cost' ? (
                                                    taxSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4 inline-block" /> : <ArrowDown className="ml-2 h-4 w-4 inline-block" />
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 inline-block" />
                                                )}
                                            </Button>
                                        </TableHead>
                                        <SortableHeader<TaxSortKey> isTaxTable sortKey="potentialGain" label={
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-1.5 cursor-help">
                                                            Potential gains <Info className="h-3 w-3" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-normal">This is the unrealized capital gain or loss for the Bitcoin at this address. It's the difference between its current market value and its original cost basis.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        } sortConfig={taxSortConfig} requestSort={requestTaxSort} />
                                        <TableHead className="hidden xl:table-cell">
                                            <Button variant="ghost" onClick={() => requestTaxSort('amountToSell')} className="p-1 flex-col items-start whitespace-normal h-auto text-left">
                                                <span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-1.5 cursor-help">
                                                                    Amount to sell <Info className="h-3 w-3" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="font-normal">This column shows how much Bitcoin you are simulating selling from this address. Currently, it defaults to the full balance.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </span>
                                                {taxSortConfig.key === 'amountToSell' ? (
                                                    taxSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4 inline-block" /> : <ArrowDown className="ml-2 h-4 w-4 inline-block" />
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 inline-block" />
                                                )}
                                            </Button>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedTaxHoldings.map(asset => {
                                        return (
                                            <TableRow key={asset.address} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="pl-4 sm:pl-0">
                                                    <Checkbox 
                                                        checked={selectedAssets[asset.address] || false}
                                                        onCheckedChange={(checked) => {
                                                            setSelectedAssets(prev => ({...prev, [asset.address]: !!checked}));
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 min-w-[120px] max-w-[200px]">
                                                        <BitcoinIcon className="h-4 w-4 text-amber-500 shrink-0" />
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="font-mono text-xs truncate" title={asset.address}>{asset.address}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-normal whitespace-nowrap text-xs sm:text-sm">{asset.balance.toFixed(8)}</TableCell>
                                                <TableCell className="hidden md:table-cell font-normal whitespace-nowrap">{asset.balance > 0 ? formatCurrencyFull(asset.marketValue / asset.balance) : '-'}</TableCell>
                                                <TableCell className="hidden sm:table-cell font-normal whitespace-nowrap text-xs sm:text-sm">{formatCurrencyFull(asset.marketValue)}</TableCell>
                                                <TableCell className="hidden lg:table-cell font-normal whitespace-nowrap">{formatCurrencyFull(asset.cost)}</TableCell>
                                                <TableCell className={cn("font-bold whitespace-nowrap text-xs sm:text-sm", (asset.potentialGain || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                    {formatCurrencyFull(asset.potentialGain)}
                                                </TableCell>
                                                <TableCell className="hidden xl:table-cell font-normal whitespace-nowrap pr-4 sm:pr-0">
                                                    {selectedAssets[asset.address] ? `${asset.balance.toFixed(8)} BTC` : '-'}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4 px-4 sm:px-0 italic">Cost basis method: Shared Pool (UK) / Average Cost (US) - This is a simplified model.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
