'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type DisposalType = 'SALE' | 'TRADE' | 'SPEND' | 'GIFT';
type IncomeType = 'MINING' | 'STAKING' | 'AIRDROP' | 'GIFT' | 'FORK' | 'INTEREST' | 'OTHER';

export interface TransactionCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    txid: string;
    date: string;
    amount: number;
    type: 'disposal' | 'income';
    currentCategory?: DisposalType | IncomeType;
  } | null;
  onSave: (txid: string, newCategory: DisposalType | IncomeType) => void;
}

const DISPOSAL_TYPES: { value: DisposalType; label: string; description: string }[] = [
  { value: 'SALE', label: 'Sale', description: 'Sold for fiat currency' },
  { value: 'TRADE', label: 'Trade', description: 'Traded for another cryptocurrency' },
  { value: 'SPEND', label: 'Spend', description: 'Used to purchase goods or services' },
  { value: 'GIFT', label: 'Gift', description: 'Given as a gift to another person' },
];

const INCOME_TYPES: { value: IncomeType; label: string; description: string }[] = [
  { value: 'MINING', label: 'Mining', description: 'Bitcoin mined' },
  { value: 'STAKING', label: 'Staking', description: 'Staking rewards (not typical for Bitcoin)' },
  { value: 'AIRDROP', label: 'Airdrop', description: 'Free tokens received' },
  { value: 'GIFT', label: 'Gift', description: 'Received as a gift' },
  { value: 'FORK', label: 'Fork', description: 'From a blockchain fork' },
  { value: 'INTEREST', label: 'Interest', description: 'Interest from lending' },
  { value: 'OTHER', label: 'Other', description: 'Other income type' },
];

export function TransactionCategoryDialog({
  open,
  onOpenChange,
  transaction,
  onSave,
}: TransactionCategoryDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<DisposalType | IncomeType | undefined>(
    transaction?.currentCategory
  );

  React.useEffect(() => {
    if (transaction) {
      setSelectedCategory(transaction.currentCategory);
    }
  }, [transaction]);

  const handleSave = () => {
    if (transaction && selectedCategory) {
      onSave(transaction.txid, selectedCategory);
      onOpenChange(false);
    }
  };

  if (!transaction) return null;

  const categories = transaction.type === 'disposal' ? DISPOSAL_TYPES : INCOME_TYPES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction Category</DialogTitle>
          <DialogDescription>
            Change how this transaction is classified for tax purposes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Transaction Details</Label>
            <div className="rounded-lg border p-3 space-y-1.5 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{Math.abs(transaction.amount).toFixed(8)} BTC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono text-xs truncate max-w-[200px]">{transaction.txid}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{transaction.type === 'disposal' ? 'Disposal' : 'Income'}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as DisposalType | IncomeType)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex flex-col py-1">
                      <span className="font-medium">{cat.label}</span>
                      <span className="text-xs text-muted-foreground">{cat.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
            <p className="text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> Changing the category affects how this transaction is reported for tax purposes.
              Make sure the new category accurately reflects the nature of the transaction.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedCategory}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
