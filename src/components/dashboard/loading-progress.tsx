'use client';

import { cn } from '@/lib/utils';
import { OrbitalLoader, type LoadStage } from '@/components/ui/orbital-loader';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface LoadingProgressProps {
  stage: LoadStage;
  stageNumber: number;
  message: string;
  secondaryMessage?: string;
  addressesFound?: number;
  transactionsLoaded?: number;
  isLongWait?: boolean;
  onContinue?: () => void;
  className?: string;
}

/**
 * Stage messages - confident and friendly, never vague.
 */
const STAGE_MESSAGES: Record<LoadStage, { primary: string; secondary?: string }> = {
  CONNECTING: {
    primary: 'Connecting to your wallet...',
  },
  NOSTR_SYNCING: {
    primary: 'Connecting to Nostr relays...',
    secondary: 'Fetching your saved wallets',
  },
  DISCOVERING: {
    primary: 'Discovering your addresses...',
  },
  BALANCES: {
    primary: 'Calculating your balance...',
  },
  TRANSACTIONS: {
    primary: 'Loading transaction history...',
  },
  ENRICHING: {
    primary: 'Analyzing your wallet...',
    secondary: 'Almost there',
  },
  COMPLETE: {
    primary: 'Ready',
  },
};

/**
 * Long-wait messages shown after 30+ seconds.
 */
const LONG_WAIT_MESSAGES = [
  'This wallet has lots of history – we\'re being thorough.',
  'Large wallets take a moment. You can explore while we finish.',
  'Still working on it. Your data will appear as it\'s ready.',
];

export function LoadingProgress({
  stage,
  stageNumber,
  message,
  secondaryMessage,
  addressesFound = 0,
  transactionsLoaded = 0,
  isLongWait = false,
  onContinue,
  className,
}: LoadingProgressProps) {
  const stageConfig = STAGE_MESSAGES[stage] || STAGE_MESSAGES.CONNECTING;
  const displayMessage = message || stageConfig.primary;
  const displaySecondary = secondaryMessage || stageConfig.secondary;

  // Build dynamic secondary message based on counts
  let dynamicSecondary = displaySecondary;
  if (addressesFound > 0 && !displaySecondary) {
    dynamicSecondary = `Found ${addressesFound} addresses`;
    if (transactionsLoaded > 0) {
      dynamicSecondary += ` · ${transactionsLoaded} transactions`;
    }
  }

  const longWaitMessage = isLongWait
    ? LONG_WAIT_MESSAGES[Math.floor(Math.random() * LONG_WAIT_MESSAGES.length)]
    : null;

  return (
    <div
      className={cn(
        'bg-card rounded-xl border-2 p-6 shadow-lg',
        'bg-gradient-to-br from-card via-card to-primary/5',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Orbital loader */}
        <div className="flex-shrink-0">
          <OrbitalLoader stage={stage} size="lg" />
        </div>

        {/* Progress info */}
        <div className="flex-1 text-center sm:text-left space-y-3">
          {/* Primary message */}
          <p className="font-semibold text-lg text-foreground">
            {displayMessage}
          </p>

          {/* Secondary message / counts */}
          {dynamicSecondary && (
            <p className="text-sm text-muted-foreground">
              {dynamicSecondary}
            </p>
          )}

          {/* Long wait message */}
          {longWaitMessage && (
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              {longWaitMessage}
            </p>
          )}

          {/* Stage progress bar */}
          <div className="space-y-1.5">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  stage === 'COMPLETE'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-primary to-primary/70'
                )}
                style={{ width: `${(stageNumber / 4) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Stage {stageNumber} of 4
            </p>
          </div>

          {/* Continue button for long waits */}
          {isLongWait && onContinue && (
            <Button
              variant="outline"
              size="sm"
              onClick={onContinue}
              className="mt-2"
            >
              Continue exploring while we finish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact progress indicator for when data is already showing.
 */
export function CompactProgress({
  stage,
  message,
  addressesFound,
  transactionsLoaded,
  isRefreshing,
  className,
}: {
  stage: LoadStage;
  message: string;
  addressesFound?: number;
  transactionsLoaded?: number;
  isRefreshing?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30',
        'border-2 border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3',
        'flex items-center gap-3',
        className
      )}
    >
      {/* Inline spinner */}
      <div className="flex-shrink-0">
        {isRefreshing ? (
          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
        ) : (
          <OrbitalLoader stage={stage} size="sm" />
        )}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {message}
        </p>
        {(addressesFound !== undefined || transactionsLoaded !== undefined) && (
          <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
            {addressesFound !== undefined && `${addressesFound} addresses`}
            {addressesFound !== undefined && transactionsLoaded !== undefined && ' · '}
            {transactionsLoaded !== undefined && `${transactionsLoaded} transactions`}
          </p>
        )}
      </div>

      {/* Stage indicator */}
      <div className="text-xs text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap">
        {stage === 'COMPLETE' ? '✓' : '...'}
      </div>
    </div>
  );
}

/**
 * Full page loading state with premium animation.
 */
export function FullPageLoadingState({
  stage = 'CONNECTING',
  message,
}: {
  stage?: LoadStage;
  message?: string;
}) {
  const stageConfig = STAGE_MESSAGES[stage] || STAGE_MESSAGES.CONNECTING;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <OrbitalLoader stage={stage} size="lg" />

      <div className="text-center space-y-2">
        <p className="font-semibold text-lg">
          {message || stageConfig.primary}
        </p>
        {stageConfig.secondary && (
          <p className="text-sm text-muted-foreground">
            {stageConfig.secondary}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton dashboard layout for instant perceived loading.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Loading progress placeholder */}
      <div className="h-32 rounded-xl bg-muted/50 border-2 border-dashed" />

      {/* Metric cards grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-muted/50 border"
          />
        ))}
      </div>

      {/* Transactions table placeholder */}
      <div className="rounded-lg border bg-card">
        <div className="h-14 border-b bg-muted/30" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 border-b last:border-0" />
        ))}
      </div>
    </div>
  );
}
