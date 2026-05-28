
'use client';

import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { getAddressData, getTransactionData, getAddressStats } from '@/lib/blockchain-api';
import type { AddressInfo, Transaction } from '@/lib/types';
import { ChevronsRight, LoaderCircle, CircleAlert, Bitcoin, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { useWallet } from '@/contexts/wallet-context';

interface ExplorerNodeProps {
  type: 'address' | 'transaction';
  identifier: string;
  depth: number;
  label?: string; // Optional label, e.g., "Input" or "Output"
  value?: number; // Optional value for addresses
}

type InterestLevel = 'high' | 'medium' | 'low';

// Function to determine the forensic "interest level" of a node.
const getNodeInterestLevel = (
  type: 'address' | 'transaction',
  nodeInfo: any
): InterestLevel => {
  if (!nodeInfo) return 'low';

  if (type === 'address') {
    const txCount = (nodeInfo as AddressInfo).n_tx ?? 0;
    if (txCount >= 100) return 'high'; // Address with many transactions
    if (txCount >= 20) return 'medium';
    return 'low';
  }

  if (type === 'transaction') {
    const tx = nodeInfo as Transaction;
    const inputCount = tx.inputs?.length || 0;
    const outputCount = tx.outputs?.length || 0;
    // High fee rate could indicate urgency or complex script
    const feeRate = tx.fee > 0 && tx.size > 0 ? tx.fee / tx.size : 0;

    if (inputCount > 50 || outputCount > 50) return 'high'; // "Fan-out" or "consolidation" transaction
    if (feeRate > 200 && tx.fee > 100000) return 'high'; // Very high fee rate
    if (inputCount > 10 || outputCount > 10) return 'medium';
    if (feeRate > 100) return 'medium';
    return 'low';
  }

  return 'low';
};


const NodeDisplay = ({ type, identifier, value, fiatPrice, currency, label, interestLevel }: { type: 'address' | 'transaction', identifier: string, value?: number, fiatPrice?: number, currency: string, label?: string, interestLevel: InterestLevel }) => {
    
    const levelStyles = {
        high: {
          container: 'bg-destructive/10 border-destructive/20',
          iconContainer: 'bg-destructive/10',
          icon: 'text-destructive',
          badge: 'destructive',
          text: 'text-card-foreground',
        },
        medium: {
          container: 'bg-amber-500/10 border-amber-500/20',
          iconContainer: 'bg-amber-500/10',
          icon: 'text-amber-600 dark:text-amber-500',
          badge: 'outline',
          text: 'text-card-foreground',
        },
        low: {
          container: 'bg-card border-border',
          iconContainer: 'bg-primary/10',
          icon: 'text-primary',
          badge: 'outline',
          text: 'text-card-foreground',
        },
    };

    const styles = levelStyles[interestLevel];

    return (
        <div className={cn("flex items-center gap-4 w-full text-left p-2 rounded-lg border transition-colors", styles.container)}>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", styles.iconContainer)}>
                {type === 'address' ? <Bitcoin className={cn("h-5 w-5", styles.icon)} /> : <ArrowLeftRight className={cn("h-5 w-5", styles.icon)} />}
            </div>
            <div className="flex-grow overflow-hidden">
                <div className="flex items-center gap-2">
                    <Badge
                        variant={styles.badge as any}
                        className={cn(
                            "capitalize",
                            interestLevel === 'medium' && "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20"
                        )}
                    >
                        {type}
                    </Badge>
                    {label && <Badge variant="secondary">{label}</Badge>}
                </div>
                <p className={cn("font-mono text-sm truncate mt-1", styles.text)}>{identifier}</p>
            </div>
            {value !== undefined && fiatPrice !== undefined && fiatPrice > 0 && (
                <div className="text-right shrink-0 pl-4">
                    <p className="font-mono text-sm font-bold">{(value / 1e8).toFixed(8)} BTC</p>
                    <p className="text-xs text-muted-foreground">{new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((value / 1e8) * fiatPrice)}</p>
                </div>
            )}
        </div>
    )
}

export const ExplorerNode: React.FC<ExplorerNodeProps> = ({ type, identifier, depth, label, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null); // This is for children
  const [nodeInfo, setNodeInfo] = useState<any>(null); // This is for the node itself

  const { fiatPrice, currency } = useWallet();

  useEffect(() => {
    const fetchNodeMetadata = async () => {
        if (!identifier) return;
        try {
            let result;
            if (type === 'address') {
                result = await getAddressStats(identifier);
            } else {
                result = await getTransactionData(identifier);
            }
            if (!result.error && result.data) {
                setNodeInfo(result.data);
            }
        } catch (err: any) {
            // Fail silently, node just won't be colored
        }
    };
    fetchNodeMetadata();
  }, [type, identifier]);

  const fetchDataForChildren = async () => {
    if (data) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let result;
      if (type === 'address') {
        result = await getAddressData(identifier);
      } else {
        result = await getTransactionData(identifier);
      }

      if (result.error) {
        throw new Error(result.error);
      }
      setData(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerClick = () => {
      if (!isOpen && !data) {
          fetchDataForChildren();
      }
      setIsOpen(!isOpen);
  }

  const hasChildren = () => {
      if (nodeInfo) {
        if (type === 'address') return (nodeInfo as AddressInfo).n_tx > 0;
        if (type === 'transaction') return true; // Transactions always have inputs/outputs
      }
      return true; // Assume children until metadata loads
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 p-4 text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 p-4 text-destructive">
          <CircleAlert className="h-4 w-4" />
          <span>{error}</span>
        </div>
      );
    }

    if (!data) return null;

    if (type === 'address') {
        const addressData = data as { addressInfo: AddressInfo, transactions: Transaction[] };
        if (addressData.transactions.length === 0) {
            return <div className="p-4 text-muted-foreground text-sm">No transactions found for this address.</div>;
        }
      return addressData.transactions.slice(0, 10).map((tx: Transaction) => (
        <ExplorerNode key={tx.id} type="transaction" identifier={tx.id} depth={depth + 1} />
      ));
    }

    if (type === 'transaction') {
      const txData = data as Transaction;
      return (
        <>
          <div className="p-2">
            <h4 className="font-bold text-sm mb-2">Inputs ({txData.inputs.length})</h4>
            {txData.inputs.map((input, i) => (
                input.address ? 
                <ExplorerNode 
                    key={`${input.address}-${i}`} 
                    type="address" 
                    identifier={input.address} 
                    depth={depth + 1}
                    label="Input"
                    value={input.value}
                /> :
                <div key={`coinbase-${i}`} className="p-2 ml-12">
                    <NodeDisplay type="address" identifier="Coinbase (New Coins)" value={input.value} fiatPrice={fiatPrice} currency={currency} interestLevel="low" />
                </div>
            ))}
             {txData.inputs.length === 0 && <p className="text-muted-foreground text-xs pl-4">No inputs found.</p>}
          </div>
          <div className="p-2 mt-2">
            <h4 className="font-bold text-sm mb-2">Outputs ({txData.outputs.length})</h4>
            {txData.outputs.map((output, i) => (
              <ExplorerNode
                key={`${output.address}-${i}`}
                type="address"
                identifier={output.address}
                depth={depth + 1}
                label="Output"
                value={output.value}
              />
            ))}
          </div>
        </>
      );
    }
  };

  const canExpand = hasChildren();
  const interestLevel = getNodeInterestLevel(type, nodeInfo);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTriggerClick}
              disabled={isLoading}
              className={cn("h-10 w-10 transition-transform duration-200", isOpen && "rotate-90", !canExpand && "invisible")}
            >
              <ChevronsRight className="h-5 w-5" />
            </Button>
        </CollapsibleTrigger>
        <div className="flex-grow">
            <NodeDisplay type={type} identifier={identifier} value={value} fiatPrice={fiatPrice} currency={currency} label={label} interestLevel={interestLevel} />
        </div>
      </div>
      <CollapsibleContent>
        <div className="pl-8 border-l-2 border-dashed border-border ml-5 space-y-2">
            {isOpen && renderContent()}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
