
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DialogDescription } from '@/components/ui/dialog';
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
    <TableRow>
      <TableCell>
        <Link href={`/transactions/${tx.id}`} className="hover:underline cursor-pointer">
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
              <div className="font-medium flex items-center gap-1.5">
                <span>{isReceived ? 'Received from' : 'Sent to'}</span>
                <span className="font-mono text-xs">{addressToShow && addressToShow.length > 10 ? `${addressToShow.substring(0, 10)}...` : addressToShow}</span>
                {uniqueLabels.map(label => (
                  <Badge key={label.address} variant="secondary" className="font-sans">
                    <Building className="mr-1.5 h-3 w-3 text-muted-foreground"/>
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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                A complete list of all your wallet's transactions.
                </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Amount (BTC)</TableHead>
              <TableHead className="hidden text-right md:table-cell">Amount (Fiat)</TableHead>
              <TableHead className="text-right">Status</TableHead>
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
        {visibleCount < data.transactions.length && (
            <div className="mt-6 flex justify-center">
                <Button onClick={handleLoadMore} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Load More
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
