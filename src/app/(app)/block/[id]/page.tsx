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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, Copy, Box, Download, Loader2 } from 'lucide-react';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import type { BlockDetails, BlockTransaction } from '@/lib/types';
import { getBlockDetails } from '@/lib/mempool';

function DetailItem({ label, value, children, isMono = true }: { label: string; value?: React.ReactNode; children?: React.ReactNode, isMono?: boolean }) {
  return (
    <div className="flex justify-between items-start text-sm py-1.5 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <div className={`text-right break-all flex items-center gap-2 ${isMono ? 'font-mono' : ''}`}>
        {value ?? children}
      </div>
    </div>
  );
}

const TXS_PER_PAGE = 25;

export default function BlockDetailsPage() {
  const params = useParams();
  const blockHash = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [pageData, setPageData] = useState<BlockDetails | null>(null);
  const [transactions, setTransactions] = useState<BlockTransaction[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [txsStartIndex, setTxsStartIndex] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreTxs, setHasMoreTxs] = useState(true);

  const loadData = useCallback(async (hash: string) => {
    setPageIsLoading(true);
    setPageError(null);

    const { data: blockData, error } = await getBlockDetails(hash, 0);
    
    if (error) {
        setPageError(error);
    } else if (blockData) {
        setPageData(blockData);
        setTransactions(blockData.transactions);
        setTxsStartIndex(blockData.transactions.length);
        setHasMoreTxs(blockData.tx_count > blockData.transactions.length);
    } else {
        setPageError("Could not find data for this block.");
    }
    setPageIsLoading(false);
  }, []);

  useEffect(() => {
    if (blockHash) {
        loadData(blockHash);
    }
  }, [blockHash, loadData]);

  const loadMoreTxs = async () => {
    if (!pageData || isLoadingMore) return;

    setIsLoadingMore(true);
    const { data: moreData, error } = await getBlockDetails(pageData.id, txsStartIndex);

    if (error) {
        toast({
            variant: 'destructive',
            title: 'Failed to load more transactions',
            description: error,
        });
    } else if (moreData) {
        setTransactions(prev => [...prev, ...moreData.transactions]);
        const newIndex = txsStartIndex + moreData.transactions.length;
        setTxsStartIndex(newIndex);
        setHasMoreTxs(pageData.tx_count > newIndex);
    }
    setIsLoadingMore(false);
  };


  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: text,
    });
  };

  if (pageIsLoading) return <FullPageLoader />;
  
  if (pageError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold">Block Not Found</h1>
            <p className="text-muted-foreground">{pageError}</p>
            <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
      );
  }

  if (!pageData) return <ErrorDisplay message="No data found for this block." />;
  
  const block = pageData;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
        <div>
            <Button variant="ghost" onClick={() => router.back()} className='text-muted-foreground'>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Mempool
            </Button>
        </div>

        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Box className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Bitcoin Block #{block.height.toLocaleString()}</CardTitle>
                        <CardDescription>
                            Mined on {new Date(block.timestamp * 1000).toLocaleString()}
                        </CardDescription>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono break-all mt-4 flex items-center gap-2">
                    <span>{block.id}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(block.id)}>
                        <Copy className="h-4 w-4"/>
                    </Button>
                </div>
            </CardHeader>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Block Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <DetailItem label="Transactions" value={block.tx_count.toLocaleString()} isMono={false} />
                <DetailItem label="Size" value={`${(block.size / 1_000_000).toFixed(2)} MB`} />
                <DetailItem label="Weight" value={`${(block.weight / 1_000_000).toFixed(2)} MWU`} />
                <DetailItem label="Difficulty" value={block.difficulty.toLocaleString()} isMono={false} />
                <DetailItem label="Nonce" value={block.nonce.toLocaleString()} isMono={false} />
                <DetailItem label="Bits" value={block.bits.toString(16)} />
                <DetailItem label="Version" value={`0x${block.version.toString(16)}`} />
                <DetailItem label="Merkle Root" value={`${block.merkle_root.slice(0,10)}...`} />
                <DetailItem label="Previous Block" isMono={false}>
                    <Link href={`/block/${block.previousblockhash}`} className="text-primary hover:underline cursor-pointer">
                        {(block.height - 1).toLocaleString()}
                    </Link>
                </DetailItem>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>List of transactions included in this block.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right hidden md:table-cell">Fee (sats)</TableHead>
                            <TableHead className="text-right hidden md:table-cell">Size (bytes)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map(tx => (
                            <TableRow key={tx.txid}>
                                <TableCell className="font-mono">
                                    <Link href={`/transactions/${tx.txid}`} className="hover:underline text-primary text-xs cursor-pointer" title={tx.txid}>
                                        {`${tx.txid.slice(0, 10)}...${tx.txid.slice(-10)}`}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right font-mono">{(tx.value / 1e8).toFixed(4)} BTC</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{tx.fee.toLocaleString()}</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{tx.size.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {hasMoreTxs && (
                    <div className="mt-6 flex justify-center">
                        <Button onClick={loadMoreTxs} variant="outline" disabled={isLoadingMore}>
                            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Load More Transactions
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
