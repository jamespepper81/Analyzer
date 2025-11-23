
'use client';

import React from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, Download, Building } from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const TransactionRow = React.memo(({ tx, fiatPrice, currency }: { tx: Transaction, fiatPrice: number, currency: string }) => {
  const isReceived = tx.type === 'Received';
  const addressToShow = isReceived 
    ? tx.fromAddress[0] 
    : tx.toAddress[0];
  const fiatAmount = Math.abs(tx.btc * fiatPrice);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
  }

  // Ensure unique labels are displayed (e.g., if multiple addresses belong to the same exchange)
  const uniqueLabels = tx.labels ? [...new Map(tx.labels.map(item => [item.label, item])).values()] : [];

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell className="pl-4 sm:pl-0">
        <Link href={`/transactions/${tx.id}`} className="hover:underline cursor-pointer">
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
              <div className="font-medium flex items-center gap-1.5 flex-wrap text-sm sm:text-base">
                <span className="whitespace-nowrap">{isReceived ? 'Received from' : 'Sent to'}</span>
                <span className="font-mono text-sm truncate max-w-[80px] sm:max-w-none">{addressToShow && addressToShow.length > 10 ? `${addressToShow.substring(0, 10)}...` : addressToShow}</span>
                {uniqueLabels.map(label => (
                  <Badge key={label.address} variant="secondary" className="font-sans text-xs">
                    <Building className="mr-1 h-3 w-3 text-muted-foreground"/>
                    {label.label}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(tx.date).toLocaleString()}
              </div>
            </div>
          </div>
        </Link>
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
  );
});
TransactionRow.displayName = 'TransactionRow';


const TRANSACTIONS_PER_PAGE = 20;

export default function TransactionsPage() {
  const { data, isLoading, error, activeXpub: xpub, fiatPrice, currency } = useWallet();
  const [visibleCount, setVisibleCount] = useState(TRANSACTIONS_PER_PAGE);
  const { toast } = useToast();

  if (!xpub) return <FullPageLoader />;
  if (isLoading) return <FullPageLoader />;
  if (error) return <ErrorDisplay message={error} />;
  if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;

  const handleExportCSV = () => {
    if (!data || data.transactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'No transactions available to export.',
      });
      return;
    }

    const headers = ['Transaction ID', 'Date', 'Type', 'Amount (BTC)', 'Status', 'Fee (SATS)'];
    
    // Function to escape commas in values
    const escapeCsvValue = (value: any) => {
        const stringValue = String(value);
        if (stringValue.includes(',')) {
            return `"${stringValue}"`;
        }
        return stringValue;
    };

    const rows = data.transactions.map(tx => [
      escapeCsvValue(tx.id),
      escapeCsvValue(new Date(tx.date).toLocaleString()),
      escapeCsvValue(tx.type),
      escapeCsvValue(tx.btc.toFixed(8)),
      escapeCsvValue(tx.status),
      escapeCsvValue(tx.fee)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `bitsleuth_transactions_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
        title: "Export Successful",
        description: "Your transactions have been exported to CSV."
    })
  };
  
  const handleLoadMore = () => {
    setVisibleCount((prevCount) => prevCount + TRANSACTIONS_PER_PAGE);
  };
  
  const transactionsToShow = data.transactions.slice(0, visibleCount);

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
                <CardTitle className="flex items-center gap-2">
                  <IconContainer variant="primary">
                    <ArrowUpRight className="h-5 w-5" />
                  </IconContainer>
                  Transaction History
                </CardTitle>
                <CardDescription className="mt-2">
                A complete list of all your wallet's transactions.
                </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV} size="sm" className="w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow">
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="border-b-2 hover:bg-transparent">
              <TableHead className="pl-4 sm:pl-0">Details</TableHead>
              <TableHead className="text-right">Amount (BTC)</TableHead>
              <TableHead className="hidden text-right md:table-cell">Amount (Fiat)</TableHead>
              <TableHead className="text-right pr-4 sm:pr-0">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionsToShow.length > 0 ? (
              transactionsToShow.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} fiatPrice={fiatPrice} currency={currency} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        {visibleCount < data.transactions.length && (
            <div className="mt-4 sm:mt-6 flex justify-center px-4 sm:px-0">
                <Button onClick={handleLoadMore} variant="outline" size="sm" className="w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow">
                    <Download className="mr-2 h-4 w-4" />
                    Load More
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
