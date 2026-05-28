'use client';

import { cn } from '@/lib/utils';
import { OrbitalLoader } from './orbital-loader';
import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ConnectionType = 'xpub' | 'nostr';

interface ConnectionStep {
  id: string;
  label: string;
  humorousLabel: string;
}

const XPUB_STEPS: ConnectionStep[] = [
  { id: 'validate', label: 'Validating key', humorousLabel: 'Inspecting your cryptographic credentials...' },
  { id: 'handshake', label: 'Establishing connection', humorousLabel: 'Teaching your wallet our secret handshake...' },
  { id: 'discover', label: 'Discovering addresses', humorousLabel: 'Searching every nook and cranny of the blockchain...' },
  { id: 'prepare', label: 'Preparing dashboard', humorousLabel: 'Rolling out the orange carpet...' },
];

const NOSTR_STEPS: ConnectionStep[] = [
  { id: 'validate', label: 'Validating key', humorousLabel: 'Verifying your ostrich credentials...' },
  { id: 'relay', label: 'Connecting to relays', humorousLabel: 'Sending carrier pigeons to Nostr relays...' },
  { id: 'decrypt', label: 'Decrypting wallet data', humorousLabel: 'Cracking open your encrypted treasure chest...' },
  { id: 'sync', label: 'Syncing wallets', humorousLabel: 'Rounding up your scattered sats...' },
  { id: 'prepare', label: 'Preparing dashboard', humorousLabel: 'Rolling out the orange carpet...' },
];

const FOOTER_FACTS = [
  "Fun fact: There are only 21 million Bitcoin that will ever exist.",
  "Did you know? The first Bitcoin transaction was for two pizzas.",
  "Pro tip: Never share your private keys with anyone. Ever.",
  "Patience is a virtue, and so are your sats.",
  "Meanwhile, somewhere a miner just found a block...",
  "Your Bitcoin doesn't care about market sentiment.",
  "HODL was born from a typo. Now it's a lifestyle.",
  "Satoshi would be proud of your patience right now.",
];

interface WalletConnectionProgressProps {
  type: ConnectionType;
  isOpen: boolean;
  className?: string;
}

export function WalletConnectionProgress({
  type,
  isOpen,
  className,
}: WalletConnectionProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [footerFact, setFooterFact] = useState('');

  const steps = type === 'nostr' ? NOSTR_STEPS : XPUB_STEPS;

  // Reset and animate through steps when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
      return;
    }

    // Pick a random footer fact
    setFooterFact(FOOTER_FACTS[Math.floor(Math.random() * FOOTER_FACTS.length)]);

    // Animate through steps with realistic timing
    const stepDurations = type === 'nostr'
      ? [400, 800, 600, 700, 500]  // Nostr takes a bit longer for relay connections
      : [300, 500, 700, 400];       // XPUB is faster

    let totalDelay = 0;
    const timeouts: NodeJS.Timeout[] = [];

    steps.forEach((_, index) => {
      // Start this step
      const startTimeout = setTimeout(() => {
        setCurrentStepIndex(index);
      }, totalDelay);
      timeouts.push(startTimeout);

      // Complete this step
      const duration = stepDurations[index] || 500;
      totalDelay += duration;

      const completeTimeout = setTimeout(() => {
        setCompletedSteps(prev => new Set([...prev, index]));
      }, totalDelay - 100); // Complete slightly before next step starts
      timeouts.push(completeTimeout);
    });

    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [isOpen, type, steps]);

  const currentStep = steps[currentStepIndex];

  return (
    <div className={cn('flex flex-col items-center gap-6 py-6', className)}>
      {/* Orbital Loader */}
      <div className="relative">
        <OrbitalLoader size="lg" stage="CONNECTING" />
      </div>

      {/* Main Status */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-lg text-foreground">
          {type === 'nostr' ? 'Connecting via Nostr' : 'Connecting Wallet'}
        </h3>
        <p className="text-sm text-primary font-medium animate-pulse">
          {currentStep?.humorousLabel}
        </p>
      </div>

      {/* Step Progress */}
      <div className="w-full max-w-xs space-y-3">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = currentStepIndex === index && !isCompleted;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 transition-all duration-300',
                isPending && 'opacity-40'
              )}
            >
              {/* Step Indicator */}
              <div
                className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-primary/20 border-2 border-primary',
                  isPending && 'bg-muted border border-muted-foreground/20'
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <LoaderCircle className="w-3.5 h-3.5 text-primary animate-spin" />
                ) : (
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  'text-sm transition-colors duration-300',
                  isCompleted && 'text-green-600 dark:text-green-400',
                  isCurrent && 'text-foreground font-medium',
                  isPending && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Fact */}
      <div className="text-center pt-2 border-t border-border/50 w-full">
        <p className="text-xs text-muted-foreground italic px-4">
          {footerFact}
        </p>
      </div>
    </div>
  );
}
