
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconContainer } from '@/components/ui/icon-container';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowUpRight, CheckCircle, Clock, Copy } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, TransactionInput, TransactionOutput } from '@/lib/types';
import { getTransactionData } from '@/lib/blockchain-api';

function DetailItem({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline text-xs sm:text-sm py-1 gap-2">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <div className="font-mono text-right break-all flex items-center gap-2 min-w-0">
        {value ?? children}
      </div>
    </div>
  );
}

function AddressCard({ title, items, btcPrice, currency, type }: { title: string; items: Array<{address: string | null, value: number}>; btcPrice: number, currency: string, type: 'input' | 'output' }) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    }
    
    const isInput = type === 'input';
    
    return (
        <Card className="border-2 shadow-md">
            <CardHeader className={`bg-gradient-to-br ${isInput ? 'from-rose-500/5' : 'from-emerald-500/5'} via-transparent to-transparent border-b`}>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <IconContainer variant={isInput ? 'rose' : 'emerald'}>
                        {isInput ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                    </IconContainer>
                    {title} ({items.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 sm:space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                            {item.address ? (
                                <Link href={`/address/${item.address}`} className="font-mono text-xs hover:underline truncate block cursor-pointer">
                                    {item.address}
                                </Link>
                            ) : (
                                <span className="text-xs text-muted-foreground">Coinbase (New Coins)</span>
                            )}
                        </div>
                        <div className="text-right flex-shrink-0 pl-2 sm:pl-4">
                            <div className="font-semibold text-sm sm:text-base">{(item.value / 1e8).toFixed(8)} BTC</div>
                            <div className="text-xs text-muted-foreground">{formatCurrency((item.value / 1e8) * btcPrice)}</div>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">No {title.toLowerCase()} found.</p>
                )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function TransactionDetailsPage() {
  const params = useParams();
  const txid = params.id as string;
  const router = useRouter();
  const { data: walletData, isLoading: isWalletLoading, error: walletError, fiatPrice, currency } = useWallet();
  const { toast } = useToast();

  const [pageData, setPageData] = useState<Transaction | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setPageIsLoading(true);
    setPageError(null);
    setPageData(null);

    if (isWalletLoading) {
        return;
    }

    const txInWallet = walletData?.transactions.find((t) => t.id === txid);

    if (txInWallet) {
        setPageData(txInWallet);
        setPageIsLoading(false);
    } else {
        // Transaction is not in the user's wallet, fetch its data externally
        const { data: externalData, error } = await getTransactionData(txid);
        if (error) {
            setPageError(error);
        } else if (externalData) {
            setPageData(externalData);
        } else {
            setPageError("Could not find data for this transaction.");
        }
        setPageIsLoading(false);
    }
  }, [txid, walletData, isWalletLoading]);

  useEffect(() => {
    loadData();
  }, [txid, loadData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: text,
    });
  };

  if (isWalletLoading || pageIsLoading) return <FullPageLoader />;
  if (walletError && !pageData) return <ErrorDisplay message={walletError} />;
  
  if (pageError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center px-4">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive" />
            <h1 className="text-xl sm:text-2xl font-bold">Transaction Not Found</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{pageError}</p>
            <Button onClick={() => router.back()} size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
      );
  }

  if (!pageData) return <ErrorDisplay message="No data found for this transaction." />;

  const tx = pageData;
  const btcPrice = fiatPrice || 0; 
  const feeInBtc = tx.fee / 1e8;
  const feeInFiat = feeInBtc * btcPrice;
  const netAmountFiat = Math.abs(tx.btc * btcPrice);
  const inputValue = tx.inputs.reduce((sum, i) => sum + (i.value || 0), 0) / 1e8;
  const outputValue = tx.outputs.reduce((sum, o) => sum + o.value, 0) / 1e8;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div>
            <Button variant="ghost" onClick={() => router.back()} className='text-muted-foreground' size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>

        <Card className="border-2 shadow-md">
            <CardHeader className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-b">
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconContainer variant="primary">
                        <ArrowLeftRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    </IconContainer>
                    <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg md:text-xl">Bitcoin Transaction</CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-1">
                            Broadcasted on {new Date(tx.date).toLocaleString()}
                        </CardDescription>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono break-all mt-4 flex items-start gap-2">
                    <span className="flex-1">{tx.id}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleCopy(tx.id)} aria-label="Copy transaction ID">
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4"/>
                    </Button>
                </div>
            </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                 <Card className="border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-blue-500/5 via-transparent to-transparent border-b">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <IconContainer variant="blue">
                                <ArrowLeftRight className="h-5 w-5" />
                            </IconContainer>
                            Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <DetailItem label="Net Amount">
                            <div className="text-right">
                                <div className="font-bold">{tx.btc.toFixed(8)} BTC</div>
                                <div className="text-muted-foreground">{formatCurrency(netAmountFiat)}</div>
                            </div>
                        </DetailItem>
                         <DetailItem label="Fee">
                             <div className="text-right">
                                <div>{tx.fee} SATS</div>
                                <div className="text-muted-foreground">{formatCurrency(feeInFiat)}</div>
                            </div>
                        </DetailItem>
                    </CardContent>
                 </Card>
                 <Card className="border-2 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-b">
                        <CardTitle className="text-base sm:text-lg">Status</CardTitle>
                        <Badge variant={tx.status === 'Confirmed' ? 'outline' : 'secondary'} className="text-xs">{tx.status}</Badge>
                    </CardHeader>
                    <CardContent className="flex items-start gap-3 sm:gap-4">
                        {tx.status === 'Confirmed' ? <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 mt-1 flex-shrink-0"/> : <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 mt-1 flex-shrink-0"/>}
                        <div className="min-w-0">
                            <p className="font-semibold text-sm sm:text-base">This transaction has {tx.confirmations.toLocaleString()} confirmations.</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                {tx.blockHeight ? `It was mined in Block ${tx.blockHeight}.` : 'Waiting to be mined.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card className="border-2 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-purple-500/5 via-transparent to-transparent border-b">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <IconContainer variant="purple">
                                <AlertCircle className="h-5 w-5" />
                            </IconContainer>
                            Advanced Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1">
                        <DetailItem label="Input Value" value={`${inputValue.toFixed(8)} BTC`} />
                        <DetailItem label="Output Value" value={`${outputValue.toFixed(8)} BTC`} />
                        <DetailItem label="Fee/vB" value={`${tx.size > 0 ? (tx.fee / tx.size).toFixed(2) : 0} sat/vB`} />
                        <DetailItem label="Size" value={`${tx.size} Bytes`} />
                        <DetailItem label="Weight" value={`${tx.weight} WU`} />
                        <DetailItem label="Version" value={tx.version} />
                        <DetailItem label="Locktime" value={tx.locktime} />
                        <DetailItem label="RBF" value={tx.rbf ? 'Enabled' : 'Disabled'} />
                    </CardContent>
                </Card>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <AddressCard title="From (Inputs)" items={tx.inputs} btcPrice={btcPrice} currency={currency} type="input" />
            <AddressCard title="To (Outputs)" items={tx.outputs} btcPrice={btcPrice} currency={currency} type="output" />
        </div>
    </div>
  );
}
