'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency } from '@/lib/types';
import { useWalletData, useWalletActions } from '@/contexts/wallet-context';

export function CurrencySwitcher() {
    const { currency, supportedCurrencies } = useWalletData();
    const { setCurrency } = useWalletActions();

    if (!currency) return null;

    return (
        <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
            <SelectTrigger className="w-[80px] h-10">
                <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
                {supportedCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>
                        {c}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
