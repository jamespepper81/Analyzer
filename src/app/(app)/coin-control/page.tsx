
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { AlertTriangle, Bitcoin, Coins, Info, Link as LinkIcon, Puzzle } from 'lucide-react';
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';
import type { UTXO } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';

const DUST_THRESHOLD = 546; // satoshis
const TRANSACTION_OVERHEAD = 10; // bytes
const INPUT_SIZE = 68; // bytes, a conservative estimate for a P2WPKH input
const OUTPUT_SIZE = 31; // bytes, for a P2WPKH output

const CustomTreemapTooltip = ({ active, payload, currency, fiatPrice }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const valueBtc = data.value / 1e8;
      const valueFiat = valueBtc * fiatPrice;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
          <p className="font-bold mb-1">UTXO Details</p>
          <p className="font-mono text-muted-foreground">{data.id.slice(0, 10)}...:{data.vout}</p>
          <div className="mt-2 pt-2 border-t">
            <p>Value: <span className="font-semibold">{data.value.toLocaleString()} sats</span></p>
            <p className="text-muted-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valueFiat)}</p>
          </div>
        </div>
      );
    }
    return null;
};

export default function CoinControlPage() {
    const { data, isLoading, error, activeXpub, fiatPrice, currency, recommendations } = useWallet();
    const { state: sidebarState } = useSidebar(); // Force responsive widgets to remount when the sidebar width changes
    const [selectedUtxos, setSelectedUtxos] = useState<Record<string, boolean>>({});
    
    // Using recommended fee from wallet context if available, otherwise fallback
    const recommendedFeeRate = recommendations.find(r => r.title.includes('fastestFee'))?.level ? parseFloat(recommendations.find(r => r.title.includes('fastestFee'))!.level) : (data?.averageFeeRate || 50);

    const treemapData = useMemo(() => {
        if (!data?.utxos) return [];
        return data.utxos.map(utxo => ({
          ...utxo,
          id: `${utxo.txid}:${utxo.vout}`, // Create a stable, unique ID for each UTXO
        }));
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
    }

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            <Card className="min-w-0">
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">UTXO Distribution</CardTitle>
                    <CardDescription className="text-sm">
                        This treemap visualizes all the Unspent Transaction Outputs (UTXOs) in your wallet. Each rectangle represents a single UTXO, and its size corresponds to its value in satoshis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 min-w-0">
                    <div className="w-full min-w-0">
                        <ResponsiveContainer key={`treemap-${sidebarState}`} width="100%" height={300}>
                              <Treemap
                                data={treemapData}
                                dataKey="value"
                                nameKey="id"
                                stroke="hsl(var(--background))"
                                fill="hsl(var(--treemap))"
                                isAnimationActive={false}
                             >
                                <RechartsTooltip content={<CustomTreemapTooltip currency={currency} fiatPrice={fiatPrice} />} />
                             </Treemap>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
                <Card className="lg:col-span-2 min-w-0">
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Coins className="h-4 w-4 sm:h-5 sm:w-5" /> All Wallet UTXOs ({utxos.length})</CardTitle>
                         <CardDescription className="text-sm">
                            A list of all individual "coins" in your wallet. Select UTXOs to simulate a consolidation transaction.
                         </CardDescription>
                    </CardHeader>
                    <CardContent className="min-w-0 px-0 sm:px-6">
                        <div key={`utxo-table-${sidebarState}`} className="overflow-x-auto rounded-md border">
                            <Table className="min-w-[540px] table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 px-3">
                                            <Checkbox
                                                checked={selectAllCheckedState}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead className="px-3 text-right w-32">Value</TableHead>
                                        <TableHead className="hidden xl:table-cell px-3 w-64">Address</TableHead>
                                        <TableHead className="px-3 w-40">Tx Origin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {utxos.length > 0 ? (
                                        utxos.map(utxo => (
                                            <TableRow key={`${utxo.txid}:${utxo.vout}`}>
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
                <div className="space-y-6 min-w-0">
                    <Card className="min-w-0">
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
                     <Card className="min-w-0">
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

