
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
import { ArrowUpRight, ArrowDownLeft, Download, Building, LoaderCircle } from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

// Shared per-transaction derived values, computed once per renderer.
function getTxDerived(tx: Transaction, fiatPrice: number, currency: string) {
  const isReceived = tx.type === 'Received';
  const addressToShow = isReceived ? tx.fromAddress[0] : tx.toAddress[0];
  const fiatAmount = Math.abs(tx.btc * fiatPrice);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);

  // Ensure unique labels are displayed (e.g., if multiple addresses belong to the same exchange)
  const uniqueLabels = tx.labels ? [...new Map(tx.labels.map(item => [item.label, item])).values()] : [];

  const shortAddress =
    addressToShow && addressToShow.length > 10
      ? `${addressToShow.substring(0, 10)}...`
      : addressToShow;

  return { isReceived, addressToShow, shortAddress, fiatAmount, formatCurrency, uniqueLabels };
}

type TxDerived = ReturnType<typeof getTxDerived>;

// Status pill, shared by the desktop table row and the mobile card.
function StatusBadge({ status }: { status: Transaction['status'] }) {
  return (
    <Badge
      variant={status === 'Confirmed' ? 'outline' : 'secondary'}
      className={cn(
        'text-xs sm:text-sm',
        status === 'Confirmed' && 'border-chart-positive/40 text-chart-positive',
        status === 'Pending' && 'border-yellow-500/40 text-yellow-500'
      )}
    >
      {status}
    </Badge>
  );
}

// Icon + "Sent to/Received from" + truncated address + labels + date.
// Truncation uses min-w-0 + truncate so the address yields width gracefully
// instead of overlapping adjacent content on small screens.
function TxIdentity({ tx, d }: { tx: Transaction; d: TxDerived }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <span
        className={cn(
          "flex items-center justify-center rounded-full p-1.5 sm:p-2 w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0",
          d.isReceived
            ? "bg-chart-positive/10 text-chart-positive"
            : "bg-chart-negative/10 text-chart-negative"
        )}
      >
        {d.isReceived ? <ArrowDownLeft className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />}
      </span>
      <div className="min-w-0">
        <div className="font-medium flex items-center gap-1.5 text-sm sm:text-base min-w-0">
          <span className="whitespace-nowrap">{d.isReceived ? 'Received from' : 'Sent to'}</span>
          <span className="font-mono text-sm truncate min-w-0" title={d.addressToShow ?? undefined}>{d.shortAddress}</span>
          {d.uniqueLabels.map(label => (
            <Badge key={label.address} variant="secondary" className="font-sans text-xs flex-shrink-0">
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
  );
}

// Desktop layout (sm+): a table row.
const TransactionRow = React.memo(({ tx, fiatPrice, currency }: { tx: Transaction, fiatPrice: number, currency: string }) => {
  const d = getTxDerived(tx, fiatPrice, currency);

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell>
        <Link href={`/transactions/${tx.id}`} className="hover:underline cursor-pointer">
          <TxIdentity tx={tx} d={d} />
        </Link>
      </TableCell>
      <TableCell
        className={cn(
          'text-right font-mono text-sm whitespace-nowrap',
          d.isReceived ? 'text-chart-positive' : 'text-chart-negative'
        )}
      >
        {tx.btc > 0 ? '+' : ''}{tx.btc.toFixed(6)} BTC
      </TableCell>
      <TableCell
        className={cn(
          'hidden text-right md:table-cell whitespace-nowrap',
          d.isReceived ? 'text-chart-positive' : 'text-chart-negative'
        )}
      >
        {d.isReceived ? '+' : '-'}{d.formatCurrency(d.fiatAmount)}
      </TableCell>
      <TableCell className="text-right">
        <StatusBadge status={tx.status} />
      </TableCell>
    </TableRow>
  );
});
TransactionRow.displayName = 'TransactionRow';

// Mobile layout (below sm): a stacked card so columns never overlap.
const TransactionCard = React.memo(({ tx, fiatPrice, currency }: { tx: Transaction, fiatPrice: number, currency: string }) => {
  const d = getTxDerived(tx, fiatPrice, currency);

  return (
    <Link
      href={`/transactions/${tx.id}`}
      className="flex flex-col gap-2 border-b px-2 py-3 last:border-0 transition-colors active:bg-muted/50"
    >
      <TxIdentity tx={tx} d={d} />
      <div className="flex items-center justify-between gap-2 pl-9">
        <span
          className={cn(
            'font-mono text-sm whitespace-nowrap',
            d.isReceived ? 'text-chart-positive' : 'text-chart-negative'
          )}
        >
          {tx.btc > 0 ? '+' : ''}{tx.btc.toFixed(6)} BTC
        </span>
        <StatusBadge status={tx.status} />
      </div>
    </Link>
  );
});
TransactionCard.displayName = 'TransactionCard';


const TRANSACTIONS_PER_PAGE = 20;

export default function TransactionsPage() {
  const { data, isLoading, error, activeXpub: xpub, fiatPrice, currency, isDiscovering, discoveryProgress } = useWallet();
  const [visibleCount, setVisibleCount] = useState(TRANSACTIONS_PER_PAGE);
  const { toast } = useToast();
  const hasBlockingError = !!error && !data;

  if (!xpub) return <FullPageLoader />;
  if (isLoading && !data) return <FullPageLoader />;
  if (hasBlockingError) return <ErrorDisplay message={error ?? 'Unable to load wallet data.'} />;
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
    });
  };
  
  const handleLoadMore = () => {
    setVisibleCount((prevCount) => prevCount + TRANSACTIONS_PER_PAGE);
  };
  
  const transactionsToShow = data.transactions.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Progressive Discovery Status */}
      {isDiscovering && discoveryProgress && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 shadow-md">
          <div className="flex items-start gap-3">
            <LoaderCircle className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  🔍 Discovering addresses... Transactions updating in real-time
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-mono">
                  {discoveryProgress.addressesWithActivity} addresses
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(discoveryProgress.addressesChecked / (discoveryProgress.addressesChecked + 20)) * 100} className="h-1.5" />
                <span className="text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap">
                  {discoveryProgress.addressesChecked} checked
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
      <CardContent className="px-2 sm:px-6">
        {/* Mobile: stacked cards so columns never overlap on small screens */}
        <div className="sm:hidden" role="list">
          {transactionsToShow.length > 0 ? (
            transactionsToShow.map((tx) => (
              <div role="listitem" key={tx.id}>
                <TransactionCard tx={tx} fiatPrice={fiatPrice} currency={currency} />
              </div>
            ))
          ) : (
            <p className="flex h-24 items-center justify-center text-center text-muted-foreground">
              No transactions found.
            </p>
          )}
        </div>

        {/* Desktop (sm+): table layout */}
        <div className="hidden sm:block">
          <Table>
          <TableHeader>
            <TableRow className="border-b-2 hover:bg-transparent">
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
    </div>
  );
}
