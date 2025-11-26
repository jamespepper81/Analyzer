
'use client';

import React, { useMemo, useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IconContainer } from '@/components/ui/icon-container';
import { Checkbox } from '@/components/ui/checkbox';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { AlertTriangle, Coins, Info, Link as LinkIcon, Puzzle } from 'lucide-react';
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const DUST_THRESHOLD = 546; // satoshis
const TRANSACTION_OVERHEAD = 10; // bytes
const INPUT_SIZE = 68; // bytes, a conservative estimate for a P2WPKH input
const OUTPUT_SIZE = 31; // bytes, for a P2WPKH output

// UTXO size categories for visual differentiation
const UTXO_CATEGORIES = {
  DUST: { threshold: 546, label: 'Dust', color: 'hsl(var(--destructive))' },
  TINY: { threshold: 10000, label: 'Tiny', color: 'hsl(var(--chart-5))' }, // < 0.0001 BTC
  SMALL: { threshold: 100000, label: 'Small', color: 'hsl(var(--chart-4))' }, // < 0.001 BTC
  MEDIUM: { threshold: 1000000, label: 'Medium', color: 'hsl(var(--chart-3))' }, // < 0.01 BTC
  LARGE: { threshold: 10000000, label: 'Large', color: 'hsl(var(--chart-2))' }, // < 0.1 BTC
  WHALE: { threshold: Infinity, label: 'Whale', color: 'hsl(var(--chart-1))' }, // >= 0.1 BTC
};

const getUtxoCategory = (value: number) => {
  if (value < UTXO_CATEGORIES.DUST.threshold) return UTXO_CATEGORIES.DUST;
  if (value < UTXO_CATEGORIES.TINY.threshold) return UTXO_CATEGORIES.TINY;
  if (value < UTXO_CATEGORIES.SMALL.threshold) return UTXO_CATEGORIES.SMALL;
  if (value < UTXO_CATEGORIES.MEDIUM.threshold) return UTXO_CATEGORIES.MEDIUM;
  if (value < UTXO_CATEGORIES.LARGE.threshold) return UTXO_CATEGORIES.LARGE;
  return UTXO_CATEGORIES.WHALE;
};

const CustomTreemapTooltip = ({ active, payload, currency, fiatPrice }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const valueBtc = data.value / 1e8;
      const valueFiat = valueBtc * fiatPrice;
      const category = getUtxoCategory(data.value);
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg text-xs max-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold">UTXO Details</p>
            <Badge variant="outline" className="text-[10px] py-0" style={{ borderColor: category.color }}>
              {category.label}
            </Badge>
          </div>
          <p className="font-mono text-muted-foreground text-[10px] mb-2">{data.id.slice(0, 10)}...:{data.vout}</p>
          <div className="space-y-1 pt-2 border-t">
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Value:</span>
              <span className="font-semibold font-mono">{data.value.toLocaleString()} sats</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">BTC:</span>
              <span className="font-mono text-[10px]">{valueBtc.toFixed(8)} BTC</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Fiat:</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valueFiat)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
};

const CustomTreemapContent = (props: any, selectedUtxos: Record<string, boolean>) => {
    const { x, y, width, height, value, fill, depth, id } = props;
    // Only render if this is a leaf node (actual UTXO, not a parent container)
    if (depth !== 1) return null;
    
    const showLabel = width > 50 && height > 40;
    const isSelected = selectedUtxos[id];
    
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill,
                    stroke: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    strokeWidth: isSelected ? 4 : 2,
                    opacity: isSelected ? 1 : 0.9,
                    cursor: 'pointer',
                }}
                rx={4}
            />
            {/* Selection highlight overlay */}
            {isSelected && (
                <rect
                    x={x + 2}
                    y={y + 2}
                    width={width - 4}
                    height={height - 4}
                    style={{
                        fill: 'none',
                        stroke: 'hsl(var(--primary))',
                        strokeWidth: 2,
                        opacity: 0.6,
                        pointerEvents: 'none',
                    }}
                    rx={3}
                />
            )}
            {showLabel && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="hsl(var(--background))"
                    fontSize={13}
                    fontWeight="700"
                    style={{ 
                        pointerEvents: 'none', 
                        userSelect: 'none',
                        textRendering: 'geometricPrecision',
                        shapeRendering: 'crispEdges',
                    }}
                >
                    <tspan x={x + width / 2} dy="-0.3em">
                        {value.toLocaleString()}
                    </tspan>
                    <tspan x={x + width / 2} dy="1.3em" fontSize={11} fontWeight="600" opacity={0.95}>
                        sats
                    </tspan>
                </text>
            )}
        </g>
    );
};

export default function CoinControlPage() {
    const { data, isLoading, error, activeXpub, fiatPrice, currency, recommendations } = useWallet();
    const { state: sidebarState } = useSidebar(); // Force responsive widgets to remount when the sidebar width changes
    const [selectedUtxos, setSelectedUtxos] = useState<Record<string, boolean>>({});

    // Trigger a resize after sidebar transition to let ResponsiveContainer & tables recalc width.
    React.useEffect(() => {
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 250); // delay to allow layout animation to finish (sidebar has 200ms transition)
        return () => clearTimeout(timer);
    }, [sidebarState]);
    
    // Using recommended fee from wallet context if available, otherwise fallback
    const recommendedFeeRate = recommendations.find(r => r.title.includes('fastestFee'))?.level ? parseFloat(recommendations.find(r => r.title.includes('fastestFee'))!.level) : (data?.averageFeeRate || 50);

    const treemapData = useMemo(() => {
        if (!data?.utxos) return [];
        return data.utxos.map(utxo => {
          const category = getUtxoCategory(utxo.value);
          return {
            ...utxo,
            id: `${utxo.txid}:${utxo.vout}`, // Create a stable, unique ID for each UTXO
            category: category.label,
            fill: category.color,
          };
        });
    }, [data?.utxos]);

    const categoryStats = useMemo(() => {
        if (!data?.utxos) return [];
        const stats = new Map<string, { count: number; totalValue: number; color: string }>();
        
        data.utxos.forEach(utxo => {
            const category = getUtxoCategory(utxo.value);
            const existing = stats.get(category.label) || { count: 0, totalValue: 0, color: category.color };
            stats.set(category.label, {
                count: existing.count + 1,
                totalValue: existing.totalValue + utxo.value,
                color: category.color,
            });
        });
        
        return Array.from(stats.entries())
            .map(([label, data]) => ({ label, ...data }))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [data?.utxos]);

    const handleSelectAll = (checked: boolean | string) => {
        const newSelected: Record<string, boolean> = {};
        if (checked === true) {
            (data?.utxos || []).forEach(utxo => {
                newSelected[`${utxo.txid}:${utxo.vout}`] = true;
            });
        }
        setSelectedUtxos(newSelected);
    };

    const consolidationDetails = useMemo(() => {
        const utxosToConsolidate = (data?.utxos || []).filter(utxo => selectedUtxos[`${utxo.txid}:${utxo.vout}`]);

        if (utxosToConsolidate.length === 0) {
            return {
                size: 0,
                fee: 0,
                selectedCount: 0,
            };
        }

        const transactionSize = TRANSACTION_OVERHEAD + (utxosToConsolidate.length * INPUT_SIZE) + OUTPUT_SIZE;
        const estimatedFee = Math.ceil(transactionSize * recommendedFeeRate);

        return {
            size: transactionSize,
            fee: estimatedFee,
            selectedCount: utxosToConsolidate.length,
        };

    }, [selectedUtxos, data?.utxos, recommendedFeeRate]);


    if (!activeXpub) return <FullPageLoader />;
    if (isLoading) return <FullPageLoader />;
    if (error) return <ErrorDisplay message={error} />;
    if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;

    const { utxos } = data;
    const numSelected = Object.values(selectedUtxos).filter(Boolean).length;
    const selectAllCheckedState = utxos.length > 0 && numSelected === utxos.length ? true : numSelected > 0 ? 'indeterminate' : false;
    const dustCount = utxos.filter(u => u.value < DUST_THRESHOLD).length;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    return (
        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-full overflow-hidden">
            <Card className="min-w-0 w-full border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                        <IconContainer variant="primary">
                            <Puzzle className="h-5 w-5" />
                        </IconContainer>
                        UTXO Distribution
                    </CardTitle>
                    <CardDescription className="text-sm mt-2">
                        Visual representation of your wallet's UTXOs by size. Each block represents one UTXO, with size proportional to its value. Click to select UTXOs for consolidation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 min-w-0 w-full space-y-4">
                    {/* Category Legend */}
                    <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start text-xs">
                        {categoryStats.map(stat => (
                            <div key={stat.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card">
                                <div 
                                    className="w-3 h-3 rounded-sm" 
                                    style={{ backgroundColor: stat.color }}
                                />
                                <span className="font-medium">{stat.label}</span>
                                <span className="text-muted-foreground">({stat.count})</span>
                            </div>
                        ))}
                    </div>
                    
                    {/* Treemap Visualization */}
                    <div className="w-full min-w-0 max-w-full rounded-lg border bg-card/50 p-2">
                        <ResponsiveContainer key={`treemap-${sidebarState}`} width="100%" height={400}>
                              <Treemap
                                data={treemapData}
                                dataKey="value"
                                nameKey="id"
                                stroke="hsl(var(--border))"
                                fill="hsl(var(--primary))"
                                isAnimationActive={true}
                                animationDuration={300}
                                content={(props) => CustomTreemapContent(props, selectedUtxos)}
                                onClick={(data: any) => {
                                    if (data && data.id) {
                                        setSelectedUtxos(prev => ({ 
                                            ...prev, 
                                            [data.id]: !prev[data.id] 
                                        }));
                                    }
                                }}
                             >
                                <RechartsTooltip content={<CustomTreemapTooltip currency={currency} fiatPrice={fiatPrice} />} />
                             </Treemap>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-3 rounded-lg border bg-card text-center">
                            <div className="text-muted-foreground mb-1">Total UTXOs</div>
                            <div className="text-lg font-bold">{utxos.length}</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-card text-center">
                            <div className="text-muted-foreground mb-1">Selected</div>
                            <div className="text-lg font-bold text-primary">{numSelected}</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-card text-center">
                            <div className="text-muted-foreground mb-1">Total Value</div>
                            <div className="text-lg font-bold">{(data.balanceBTC || 0).toFixed(4)} BTC</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-card text-center">
                            <div className="text-muted-foreground mb-1">Avg UTXO</div>
                            <div className="text-lg font-bold">
                                {utxos.length > 0 ? ((data.balanceBTC || 0) / utxos.length * 100000000).toFixed(0) : '0'} sats
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0 w-full max-w-full">
                <Card className="lg:col-span-2 min-w-0 w-full border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-b">
                         <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <IconContainer variant="emerald">
                                <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
                            </IconContainer>
                            All Wallet UTXOs ({utxos.length})
                         </CardTitle>
                         <CardDescription className="text-sm mt-2">
                            A list of all individual "coins" in your wallet. Select UTXOs to simulate a consolidation transaction.
                         </CardDescription>
                    </CardHeader>
                    <CardContent className="min-w-0 w-full px-0 sm:px-6">
                        <div key={`utxo-table-${sidebarState}`} className="overflow-x-auto rounded-md border w-full">
                            <Table className="min-w-[540px] w-full table-auto">
                                <TableHeader>
                                    <TableRow className="border-b-2 hover:bg-transparent">
                                        <TableHead className="w-12 px-3">
                                            <Checkbox
                                                checked={selectAllCheckedState}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead className="px-3 text-right min-w-[140px]">Value</TableHead>
                                        <TableHead className="hidden xl:table-cell px-3 min-w-[180px]">Address</TableHead>
                                        <TableHead className="px-3 min-w-[120px]">Tx Origin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {utxos.length > 0 ? (
                                        utxos.map(utxo => (
                                            <TableRow key={`${utxo.txid}:${utxo.vout}`} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="px-3 py-3">
                                                    <Checkbox
                                                        checked={selectedUtxos[`${utxo.txid}:${utxo.vout}`] || false}
                                                        onCheckedChange={(checked) => {
                                                            setSelectedUtxos(prev => ({ ...prev, [`${utxo.txid}:${utxo.vout}`]: !!checked }));
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-3 py-3">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="font-mono text-sm">{(utxo.value / 1e8).toFixed(8)} BTC</span>
                                                        <span className="text-xs text-muted-foreground">{formatCurrency((utxo.value / 1e8) * fiatPrice)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden xl:table-cell px-3 py-3 font-mono text-xs">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger className="truncate block">{`${utxo.address.slice(0,10)}...${utxo.address.slice(-5)}`}</TooltipTrigger>
                                                            <TooltipContent>{utxo.address}</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                                <TableCell className="px-3 py-3 font-mono text-xs">
                                                     <a href={`/transactions/${utxo.txid}`} className="hover:underline truncate block" target="_blank" rel="noopener noreferrer">
                                                        {`${utxo.txid.slice(0, 10)}...`}
                                                    </a>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No UTXOs found in this wallet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-6 min-w-0 w-full">
                    <Card className="min-w-0 w-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Puzzle className="h-5 w-5" />Consolidation Simulator</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 rounded-lg border p-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Selected UTXOs:</span>
                                    <span className="font-bold">{consolidationDetails.selectedCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Est. Transaction Size:</span>
                                    <span className="font-bold">{consolidationDetails.size.toLocaleString()} bytes</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Est. Fee ({recommendedFeeRate.toFixed(0)} sat/vB):</span>
                                    <span className="font-bold">{consolidationDetails.fee.toLocaleString()} sats</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
                                <div className="flex items-center gap-2 font-bold">
                                    <AlertTriangle className="h-5 w-5"/>
                                    <LinkIcon className="h-4 w-4"/>
                                    <h3>Privacy Warning</h3>
                                </div>
                                <p className="text-xs mt-2">
                                    Consolidating UTXOs links their addresses together on the blockchain, which can significantly reduce your financial privacy. This action is irreversible.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Coming Soon!</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Transaction broadcasting is not yet implemented. This simulator is for estimation purposes only.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Close</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>


                        </CardContent>
                    </Card>
                     <Card className="min-w-0 w-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/>Wallet Health</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between items-center">
                                <p>Total UTXOs</p>
                                <p className="font-bold">{utxos.length}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p>"Dust" UTXOs (&lt; {DUST_THRESHOLD} sats)</p>
                                <p className="font-bold">{dustCount}</p>
                            </div>
                             <p className="text-xs text-muted-foreground pt-2 border-t">
                                A high number of "dust" UTXOs can increase future transaction fees. Consolidating them when network fees are low can be cost-effective.
                             </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

