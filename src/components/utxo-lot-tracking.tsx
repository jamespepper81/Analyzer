'use client';

import React, { useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { TaxLotDetail, DisposalDetail } from '@/lib/types';

interface UTXOLotTrackingProps {
  lots: TaxLotDetail[];
  disposals: DisposalDetail[];
  formatCurrency: (value: number) => string;
  currentPrice: number;
  jurisdictionRules: {
    longTermHoldingPeriodDays: number;
  };
}

export function UTXOLotTracking({
  lots,
  disposals,
  formatCurrency,
  currentPrice,
  jurisdictionRules,
}: UTXOLotTrackingProps) {
  // Calculate lot utilization
  const lotUtilization = useMemo(() => {
    const utilizationMap = new Map<string, { original: number; remaining: number; disposalCount: number }>();
    
    // Initialize with current lots
    lots.forEach((lot) => {
      utilizationMap.set(lot.id, {
        original: lot.amount,
        remaining: lot.remaining,
        disposalCount: 0,
      });
    });

    // Count disposals per lot
    disposals.forEach((disposal) => {
      disposal.lots.forEach((usedLot) => {
        const existing = utilizationMap.get(usedLot.lotId);
        if (existing) {
          existing.disposalCount += 1;
        } else {
          // Lot is fully used - calculate original amount from disposal
          const lotData = lots.find((l) => l.id === usedLot.lotId);
          utilizationMap.set(usedLot.lotId, {
            original: lotData?.amount || usedLot.amount,
            remaining: 0,
            disposalCount: 1,
          });
        }
      });
    });

    return utilizationMap;
  }, [lots, disposals]);

  // Separate active and depleted lots
  const activeLots = lots.filter((lot) => lot.remaining > 0);
  const depletedLots = lots.filter((lot) => lot.remaining === 0);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalActiveLots = activeLots.length;
    const totalDepletedLots = depletedLots.length;
    const totalBTC = activeLots.reduce((sum, lot) => sum + lot.remaining, 0);
    const totalCostBasis = activeLots.reduce((sum, lot) => sum + (lot.costPerUnit * lot.remaining), 0);
    const totalCurrentValue = totalBTC * currentPrice;
    const totalUnrealizedGain = totalCurrentValue - totalCostBasis;
    
    return {
      totalActiveLots,
      totalDepletedLots,
      totalBTC,
      totalCostBasis,
      totalCurrentValue,
      totalUnrealizedGain,
    };
  }, [activeLots, depletedLots, currentPrice]);

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground font-medium">Active Lots</p>
            <p className="text-2xl font-bold">{stats.totalActiveLots}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalBTC.toFixed(8)} BTC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground font-medium">Depleted Lots</p>
            <p className="text-2xl font-bold">{stats.totalDepletedLots}</p>
            <p className="text-xs text-muted-foreground mt-1">Fully sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground font-medium">Total Cost Basis</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalCostBasis)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active lots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground font-medium">Unrealized Gain</p>
            <p className={cn(
              "text-2xl font-bold",
              stats.totalUnrealizedGain >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {formatCurrency(stats.totalUnrealizedGain)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCostBasis > 0 
                ? `${((stats.totalUnrealizedGain / stats.totalCostBasis) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Lots Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Tax Lots</CardTitle>
              <CardDescription>Lots with remaining Bitcoin balance</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Each tax lot represents a specific acquisition of Bitcoin. The utilization bar shows
                    how much of the original lot has been sold.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot ID</TableHead>
                  <TableHead>Acquired</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Unrealized Gain</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No active tax lots found.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeLots.map((lot) => {
                    const utilization = lotUtilization.get(lot.id);
                    const utilizationPercent = utilization 
                      ? ((utilization.original - utilization.remaining) / utilization.original) * 100
                      : 0;
                    const isLongTerm = lot.holdingPeriodDays >= jurisdictionRules.longTermHoldingPeriodDays;
                    
                    return (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono text-xs">
                          {lot.id.substring(0, 12)}...
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(lot.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {utilization ? utilization.original.toFixed(8) : lot.amount.toFixed(8)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {lot.remaining.toFixed(8)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(lot.costPerUnit * lot.remaining)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold",
                          lot.unrealizedGain >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {formatCurrency(lot.unrealizedGain)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isLongTerm ? "default" : "secondary"}>
                            {isLongTerm ? 'Long' : 'Short'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24 space-y-1">
                            <Progress value={utilizationPercent} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {utilizationPercent.toFixed(0)}% used
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Depleted Lots (if any) */}
      {depletedLots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Depleted Tax Lots</CardTitle>
            <CardDescription>Lots that have been fully sold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot ID</TableHead>
                    <TableHead>Acquired</TableHead>
                    <TableHead className="text-right">Original Amount</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Disposals</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depletedLots.map((lot) => {
                    const utilization = lotUtilization.get(lot.id);
                    
                    return (
                      <TableRow key={lot.id} className="opacity-60">
                        <TableCell className="font-mono text-xs">
                          {lot.id.substring(0, 12)}...
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(lot.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {lot.amount.toFixed(8)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(lot.costBasis)}
                        </TableCell>
                        <TableCell className="text-right">
                          {utilization?.disposalCount || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Depleted</Badge>
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
    </div>
  );
}
