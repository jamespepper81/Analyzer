'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IconContainer } from '@/components/ui/icon-container';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { getMempoolData } from '@/lib/mempool';
import type { MempoolData, MempoolBlock } from '@/lib/types';
import { Cpu, Hourglass, Layers, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWallet } from '@/contexts/wallet-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const FeeCard = ({ title, fee, description }: { title: string; fee: number; description: string }) => (
  <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg bg-card-foreground/5 text-center">
    <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
    <p className="text-xl sm:text-2xl font-bold">{Math.round(fee)}</p>
    <p className="text-xs text-muted-foreground">sat/vB</p>
    <p className="text-xs text-muted-foreground mt-1">{description}</p>
  </div>
);

const getFeeColorStyle = (feeRate: number, minFee: number, maxFee: number): React.CSSProperties => {
    // Clamp the fee rate to the min/max to handle outliers
    const clampedFee = Math.max(minFee, Math.min(feeRate, maxFee));
    
    const range = maxFee > minFee ? Math.log(maxFee) - Math.log(minFee) : 1;
    const value = maxFee > minFee ? Math.log(clampedFee) - Math.log(minFee) : 0;
    
    // Normalize to a 0-1 scale
    const percent = range > 0 ? value / range : 0;
    
    // Interpolate hue from blue (240, low fee) to red (0, high fee)
    const hue = 240 - (percent * 240);
    return { backgroundColor: `hsl(${hue}, 80%, 60%)` };
};

const MempoolVisualizer = ({ blocks }: { blocks: MempoolBlock[] }) => {
    const { minFee, maxFee } = useMemo(() => {
        if (!blocks || blocks.length === 0) return { minFee: 1, maxFee: 100 };
        const allFees = blocks.flatMap(b => b.feeRange);
        return {
            minFee: Math.min(...allFees),
            maxFee: Math.max(...allFees),
        };
    }, [blocks]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col-reverse gap-1">
                {blocks.map((block, index) => (
                    <TooltipProvider key={index}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-full h-8 bg-muted rounded flex overflow-hidden border border-border/50 cursor-help">
                                    {block.feeRange.map((fee, i, arr) => {
                                        const nextFee = arr[i + 1] || fee;
                                        const weight = (nextFee - fee) / (arr[arr.length - 1] - arr[0] || 1);
                                        return (
                                            <div
                                                key={i}
                                                className="h-full"
                                                style={{
                                                    ...getFeeColorStyle(fee, minFee, maxFee),
                                                    width: `${block.blockVSize / 10000}%`,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-sm space-y-1">
                                    <p><span className="font-bold">Block {index + 1}</span> (in mempool)</p>
                                    <p><span className="text-muted-foreground">Size:</span> {(block.blockVSize / 1_000_000).toFixed(2)} vMB</p>
                                    <p><span className="text-muted-foreground">Transactions:</span> {block.nTx.toLocaleString()}</p>
                                    <p><span className="text-muted-foreground">Fee Range:</span> {block.feeRange[0].toFixed(1)} - {block.feeRange[block.feeRange.length - 1].toFixed(1)} sat/vB</p>
                                    <p><span className="text-muted-foreground">Median Fee:</span> {block.medianFee.toFixed(2)} sat/vB</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low fees</span>
                <span>High fees</span>
            </div>
        </div>
    );
};

export default function MempoolPage() {
    const [data, setData] = useState<MempoolData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { data: walletData, activeXpub } = useWallet();

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            const { data, error } = await getMempoolData();
            if (error) {
                setError(error);
            } else {
                setData(data);
            }
            setIsLoading(false);
        }
        loadData();
    }, []);

    const userFeeComparisonColor = useMemo(() => {
        if (!walletData || !data || walletData.averageFeeRate === 0) {
            return 'bg-muted-foreground'; // Neutral color if no user data
        }
        const difference = walletData.averageFeeRate - data.networkFeeRate;
        if (difference > 10) return 'bg-rose-500'; // User paying much more
        if (difference > 2) return 'bg-amber-500'; // User paying more
        return 'bg-emerald-500'; // User paying less or similar
    }, [walletData, data]);

    if (isLoading) return <FullPageLoader />;
    if (error) return <ErrorDisplay message={error} />;
    if (!data) return <ErrorDisplay message="No mempool data found." />;

    const { recommendedFees, mempoolInfo, latestBlocks, mempoolBlocks, networkFeeRate, networkFeeLevel } = data;

    return (
        <div className="space-y-4 sm:space-y-6">
            <Card className="border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <IconContainer variant="primary">
                            <Zap className="h-5 w-5" />
                        </IconContainer>
                        Recommended Fees
                    </CardTitle>
                    <CardDescription className="text-sm mt-2">Live fee estimates for your transactions.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <FeeCard title="High Priority" fee={recommendedFees.fastestFee} description="~10 minutes" />
                    <FeeCard title="Medium Priority" fee={recommendedFees.halfHourFee} description="~30 minutes" />
                    <FeeCard title="Low Priority" fee={recommendedFees.hourFee} description="~1 hour" />
                    <FeeCard title="No Priority" fee={recommendedFees.economyFee} description="> 1 hour" />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <Card className="border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-blue-500/5 via-transparent to-transparent border-b">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <IconContainer variant="blue">
                                <Layers className="h-5 w-5" />
                            </IconContainer>
                            Mempool Summary
                        </CardTitle>
                        <CardDescription className="mt-2">A snapshot of unconfirmed transactions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 text-muted-foreground"><Hourglass className="h-5 w-5" />Unconfirmed Txs</div>
                            <div className="text-xl font-bold">{mempoolInfo.count.toLocaleString()}</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 text-muted-foreground"><Layers className="h-5 w-5" />Total Fees</div>
                            <div className="text-xl font-bold">{(mempoolInfo.total_fee / 1e8).toFixed(4)} BTC</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 text-muted-foreground"><Cpu className="h-5 w-5" />Mempool Size</div>
                            <div className="text-xl font-bold">{(mempoolInfo.vsize / 1_000_000).toFixed(2)} vMB</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
                        <CardTitle className="text-sm font-medium">Network Activity</CardTitle>
                        <IconContainer variant="emerald">
                            <Zap className="h-4 w-4" />
                        </IconContainer>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{networkFeeRate.toFixed(0)} <span className="text-xl text-muted-foreground font-normal">sat/vB</span></div>
                        <p className="text-xs text-muted-foreground">Current high-priority fee rate.</p>

                        <div className="mt-4 flex items-center gap-4">
                            <Badge
                                className={cn(
                                    networkFeeLevel === 'Low' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
                                    networkFeeLevel === 'Medium' && 'border-amber-500/40 bg-amber-500/10 text-amber-400',
                                    networkFeeLevel === 'High' && 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                                )}
                                variant="outline"
                            >
                                {networkFeeLevel}
                            </Badge>
                            {activeXpub && walletData && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                                                <span>Your Avg Fee: {walletData.averageFeeRate.toFixed(0)}</span>
                                                <div className={cn('h-2.5 w-2.5 rounded-full', userFeeComparisonColor)} />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs text-xs">
                                                This compares your wallet's average fee rate for sent transactions to the current high-priority network fee.
                                                <br />
                                                <span className="font-bold text-emerald-500">Green:</span> Your average fee is lower.
                                                <br />
                                                <span className="font-bold text-amber-500">Yellow:</span> Your average fee is slightly higher.
                                                <br />
                                                <span className="font-bold text-rose-500">Red:</span> Your average fee is much higher.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-purple-500/5 via-transparent to-transparent border-b">
                        <CardTitle className="flex items-center gap-2">
                            <IconContainer variant="purple">
                                <Hourglass className="h-5 w-5" />
                            </IconContainer>
                            Mempool Blocks
                        </CardTitle>
                        <CardDescription className="mt-2">Visualizing transactions waiting for confirmation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MempoolVisualizer blocks={mempoolBlocks} />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-orange-500/5 via-transparent to-transparent border-b">
                    <CardTitle className="flex items-center gap-2">
                        <IconContainer variant="orange">
                            <Cpu className="h-5 w-5" />
                        </IconContainer>
                        Latest Blocks
                    </CardTitle>
                    <CardDescription className="mt-2">The most recently mined blocks on the Bitcoin network.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 hover:bg-transparent">
                                <TableHead>Height</TableHead>
                                <TableHead className="hidden md:table-cell">Timestamp</TableHead>
                                <TableHead className="text-center">Transactions</TableHead>
                                <TableHead className="text-right">Size</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {latestBlocks.map((block) => (
                                <TableRow key={block.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <Link href={`/block/${block.id}`} className="text-primary hover:underline font-bold cursor-pointer">
                                            {block.height.toLocaleString()}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {formatDistanceToNow(new Date(block.timestamp * 1000), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-center">{block.tx_count.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{(block.size / 1_000_000).toFixed(2)} MB</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
