'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { ArrowLeft, Bitcoin, AlertCircle, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import type { Transaction, AddressInfo } from '@/lib/types';
import { getAddressData } from '@/lib/blockchain-api';

const TransactionRow = React.memo(({ tx, fiatPrice, currency }: { tx: Transaction, fiatPrice: number, currency: string }) => {
  const isReceived = tx.type === 'Received';
  const fiatAmount = Math.abs(tx.btc * fiatPrice);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
  }

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell>
        <Link href={`/transactions/${tx.id}`} className="hover:underline cursor-pointer">
          <div className="flex items-center gap-3">
            <span className={cn("flex items-center justify-center rounded-full p-2 w-8 h-8", isReceived ? "bg-chart-positive/10 text-chart-positive" : "bg-chart-negative/10 text-chart-negative")}>
              {isReceived ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </span>
            <div>
              <div className="font-medium text-base">
                {tx.type}
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
          'text-right font-mono text-sm',
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
            'text-sm',
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

type AddressPageData = {
    addressInfo: AddressInfo;
    transactions: Transaction[];
    btcPrice: number;
}

export default function AddressDetailsPage() {
  const params = useParams();
  const address = params.address as string;
  const router = useRouter();
  const { data: walletData, isLoading: isWalletLoading, error: walletError, fiatPrice, currency } = useWallet();
  
  const [pageData, setPageData] = useState<AddressPageData | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setPageIsLoading(true);
    setPageError(null);
    setPageData(null);

    // Wait for the main wallet context to finish loading before proceeding
    if (isWalletLoading) {
        return;
    }

    const addressInWallet = walletData?.addresses.find((a) => a.address === address);

    if (addressInWallet) {
        // Address is part of the user's wallet
        const txsForAddress = (walletData?.transactions || []).filter(tx => 
            tx.fromAddress.includes(address) || tx.toAddress.includes(address)
        );
        setPageData({
            addressInfo: addressInWallet,
            transactions: txsForAddress,
            btcPrice: fiatPrice || 0,
        });
        setPageIsLoading(false);
    } else {
        // Address is external, so we need to fetch its data
        const { data: externalData, error } = await getAddressData(address);
        if (error) {
            setPageError(error);
        } else if (externalData) {
            setPageData({
                addressInfo: externalData.addressInfo,
                transactions: externalData.transactions,
                btcPrice: externalData.btcPrice,
            });
        } else {
            setPageError("Could not find data for this address.");
        }
        setPageIsLoading(false);
    }
  }, [address, walletData, isWalletLoading, fiatPrice]);

  useEffect(() => {
    loadData();
  }, [address, loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
  }

  if (isWalletLoading || pageIsLoading) return <FullPageLoader />;
  if (walletError && !pageData) return <ErrorDisplay message={walletError} />;
  
  if (pageError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold">Address Not Found</h1>
            <p className="text-muted-foreground">{pageError}</p>
            <Button asChild onClick={() => router.back()}>
              <Link href="/security">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
        </div>
      );
  }

  if (!pageData) return <ErrorDisplay message="No data found for this address." />;

  const { addressInfo, transactions: addressTxs, btcPrice } = pageData;
  const balanceBtc = addressInfo.balance / 1e8;
  const balanceFiat = balanceBtc * btcPrice;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild onClick={() => router.back()}>
          <Link href="/security" className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card className="border-2 shadow-md">
          <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
              <div className="flex items-center gap-4">
                  <IconContainer variant="orange">
                      <Bitcoin className="h-5 w-5" />
                  </IconContainer>
                  <div>
                      <CardTitle className="font-mono break-all">{address}</CardTitle>
                      <CardDescription className="mt-1">Bitcoin Address ({addressInfo.n_tx} transactions)</CardDescription>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
              <Card className="border-2 shadow-sm">
                  <CardHeader className="bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
                      <CardTitle className="text-base font-medium">Address Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="text-3xl font-bold tracking-tighter">
                          {formatCurrency(balanceFiat)}
                      </div>
                      <p className="text-md text-muted-foreground">
                          {balanceBtc.toFixed(8)} BTC
                      </p>
                  </CardContent>
              </Card>
          </CardContent>
      </Card>

      <Card className="border-2 shadow-md">
        <CardHeader className="bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <IconContainer variant="emerald">
              <ArrowLeftRight className="h-5 w-5" />
            </IconContainer>
            Address Transactions ({addressTxs.length})
          </CardTitle>
          <CardDescription className="mt-2">
            A list of all transactions involving this specific address.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {addressTxs.length > 0 ? (
                addressTxs.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} fiatPrice={btcPrice} currency={currency} />
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No transactions found for this address.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
