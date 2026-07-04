'use client';

import { cn } from '@/lib/utils';
import { Bitcoin } from 'lucide-react';

export type LoadStage =
  | 'CONNECTING'
  | 'NOSTR_SYNCING'
  | 'DISCOVERING'
  | 'BALANCES'
  | 'TRANSACTIONS'
  | 'ENRICHING'
  | 'COMPLETE';

interface OrbitalLoaderProps {
  stage?: LoadStage;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Premium orbital loader animation with Bitcoin-themed nodes.
 * Nodes orbit and connect, representing the decentralized network.
 */
export function OrbitalLoader({
  stage = 'CONNECTING',
  size = 'md',
  className
}: OrbitalLoaderProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const nodeSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const isComplete = stage === 'COMPLETE';
  const isDiscovering = stage === 'DISCOVERING' || stage === 'BALANCES' || stage === 'TRANSACTIONS';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      {/* Outer orbit ring */}
      <svg
        className={cn(
          'absolute inset-0 w-full h-full',
          !isComplete && 'animate-[spin_20s_linear_infinite]'
        )}
        viewBox="0 0 100 100"
      >
        {/* Orbit path */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="text-primary/20"
        />

        {/* Connection lines (appear during discovery) */}
        {isDiscovering && (
          <>
            <line
              x1="50" y1="5"
              x2="95" y2="50"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary/30 animate-[draw_0.5s_ease-out_forwards]"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: 'draw 0.5s ease-out forwards'
              }}
            />
            <line
              x1="95" y1="50"
              x2="50" y2="95"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary/30"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: 'draw 0.5s ease-out 0.2s forwards'
              }}
            />
            <line
              x1="50" y1="95"
              x2="5" y2="50"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary/30"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: 'draw 0.5s ease-out 0.4s forwards'
              }}
            />
            <line
              x1="5" y1="50"
              x2="50" y2="5"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary/30"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: 'draw 0.5s ease-out 0.6s forwards'
              }}
            />
          </>
        )}
      </svg>

      {/* Orbital nodes */}
      <div
        className={cn(
          'absolute inset-0',
          !isComplete && 'animate-[spin_8s_linear_infinite_reverse]'
        )}
      >
        {/* Top node */}
        <div
          className={cn(
            'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
            nodeSizes[size],
            'rounded-full',
            'bg-gradient-to-br from-primary to-primary/70',
            'shadow-[0_0_12px_hsl(var(--brand)/0.5)]',
            'animate-[pulse_2s_ease-in-out_infinite]',
            isComplete && 'animate-none opacity-0 transition-opacity duration-500'
          )}
          style={{ animationDelay: '0s' }}
        />

        {/* Right node */}
        <div
          className={cn(
            'absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
            nodeSizes[size],
            'rounded-full',
            'bg-gradient-to-br from-primary to-primary/70',
            'shadow-[0_0_12px_hsl(var(--brand)/0.5)]',
            'animate-[pulse_2s_ease-in-out_infinite]',
            isComplete && 'animate-none opacity-0 transition-opacity duration-500'
          )}
          style={{ animationDelay: '0.5s' }}
        />

        {/* Bottom node */}
        <div
          className={cn(
            'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
            nodeSizes[size],
            'rounded-full',
            'bg-gradient-to-br from-primary to-primary/70',
            'shadow-[0_0_12px_hsl(var(--brand)/0.5)]',
            'animate-[pulse_2s_ease-in-out_infinite]',
            isComplete && 'animate-none opacity-0 transition-opacity duration-500'
          )}
          style={{ animationDelay: '1s' }}
        />

        {/* Left node */}
        <div
          className={cn(
            'absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
            nodeSizes[size],
            'rounded-full',
            'bg-gradient-to-br from-primary to-primary/70',
            'shadow-[0_0_12px_hsl(var(--brand)/0.5)]',
            'animate-[pulse_2s_ease-in-out_infinite]',
            isComplete && 'animate-none opacity-0 transition-opacity duration-500'
          )}
          style={{ animationDelay: '1.5s' }}
        />
      </div>

      {/* Inner orbit (faster, smaller) */}
      <div
        className={cn(
          'absolute inset-[25%]',
          !isComplete && 'animate-[spin_4s_linear_infinite]'
        )}
      >
        {/* Diagonal nodes */}
        <div
          className={cn(
            'absolute top-0 right-0 translate-x-1/4 -translate-y-1/4',
            size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5',
            'rounded-full',
            'bg-gradient-to-br from-warning to-primary',
            'shadow-[0_0_8px_hsl(var(--brand)/0.4)]',
            'animate-[pulse_1.5s_ease-in-out_infinite]',
            isComplete && 'animate-none opacity-0 transition-opacity duration-500'
          )}
          style={{ animationDelay: '0.25s' }}
        />
        <div
          className={cn(
            'absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4',
            size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5',
            'rounded-full',
            'bg-gradient-to-br from-warning to-primary',
            'shadow-[0_0_8px_hsl(var(--brand)/0.4)]',
            'animate-[pulse_1.5s_ease-in-out_infinite]',
            isComplete && 'animate-none opacity-0 transition-opacity duration-500'
          )}
          style={{ animationDelay: '0.75s' }}
        />
      </div>

      {/* Center Bitcoin icon */}
      <div
        className={cn(
          'relative z-10 rounded-full p-2',
          'bg-gradient-to-br from-primary/20 to-primary/5',
          'border border-primary/30',
          isComplete
            ? 'scale-110 shadow-[0_0_20px_hsl(var(--brand)/0.6)]'
            : 'shadow-[0_0_12px_hsl(var(--brand)/0.3)]',
          'transition-all duration-500'
        )}
      >
        <Bitcoin
          className={cn(
            size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8',
            'text-primary',
            isComplete && 'animate-none',
            !isComplete && 'animate-[pulse_3s_ease-in-out_infinite]'
          )}
        />
      </div>

      {/* Keyframes for draw animation */}
      <style jsx>{`
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact inline loader for use in cards and smaller spaces.
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1">
        <div
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '0.15s' }}
        />
        <div
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '0.3s' }}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton card with shimmer effect for loading states.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3',
        'relative overflow-hidden',
        className
      )}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
      />

      {/* Content placeholders */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="h-8 w-32 rounded bg-muted animate-pulse" />
      <div className="h-4 w-20 rounded bg-muted animate-pulse" />

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Transaction row skeleton for loading states.
 */
export function SkeletonTransactionRow() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
