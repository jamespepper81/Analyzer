

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo, OstrichIcon } from "@/components/icons";
import {
  ArrowRight,
  Lock,
  AlertTriangle,
  ArrowLeft,
  SearchX,
  Loader2,
  ShieldCheck,
  Activity,
  BarChart3,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { cn } from "@/lib/utils";
import { 
  DISCOVERY_TIMEOUT_SECONDS, 
  DISCOVERY_TIMEOUT_MINUTES, 
  STAGE_TRANSITION_TIMEOUT_MS,
  SECOND_WARNING_THRESHOLD,
  FINAL_WARNING_THRESHOLD 
} from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";


// Add state to force remount of DialogContent on dialog open
const formSchema = z.object({
  xpub: z.string().min(1, {
    message: "xpub key is required.",
  }),
});

export default function ConnectWalletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState(0);

  const { addXpub, activeXpub, isLoading: isWalletLoading, loginWithNostr, isDiscovering, discoveryProgress } = useWallet();

  const [isNostrLoginOpen, setNostrLoginOpen] = useState(false);
  const [isNostrSubmitting, setIsNostrSubmitting] = useState(false);
  const [nostrDialogKey, setNostrDialogKey] = useState(Date.now());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      xpub: "",
    },
  });

  const nostrFormSchema = z.object({
    nsec: z.string().startsWith('nsec1', { message: 'Nostr private key must start with "nsec1"' }),
  });

  const nostrForm = useForm<z.infer<typeof nostrFormSchema>>({
    resolver: zodResolver(nostrFormSchema),
    defaultValues: { nsec: "" },
  });

  // If a wallet is already connected, redirect to the dashboard.
  useEffect(() => {
    if (!isWalletLoading && activeXpub) {
      router.push('/dashboard');
    }
  }, [activeXpub, isWalletLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setError(null);
    setElapsedTime(0);
    setLoadingStage('Validating XPUB format...');

    // Start timer for elapsed time tracking
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      // Update stage after initial validation
      setTimeout(() => {
        if (isSubmitting) {
          setLoadingStage('Discovering wallet addresses...');
        }
      }, 2000);

      setTimeout(() => {
        if (isSubmitting) {
          setLoadingStage('Fetching transaction history...');
        }
      }, 15000);

      setTimeout(() => {
        if (isSubmitting) {
          setLoadingStage('Processing transactions and UTXOs...');
        }
      }, 35000);

      setTimeout(() => {
        if (isSubmitting) {
          setLoadingStage('Finalizing wallet analysis...');
        }
      }, STAGE_TRANSITION_TIMEOUT_MS);

      const result = await addXpub(values.xpub);

      if (result.error) {
        setError(result.error);
      } else {
        setLoadingStage('Connection successful!');
        toast({
          title: "Connection Successful",
          description: "Redirecting to your dashboard.",
        });
        // The redirect is now handled by the useEffect hook above,
        // which waits for the activeXpub state to update.
      }
    } catch (error) {
      // Handle any unexpected errors that might occur
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      clearInterval(timerInterval);
      setIsSubmitting(false);
      setLoadingStage('');
    }
  }

  async function onNostrSubmit(values: z.infer<typeof nostrFormSchema>) {
    setIsNostrSubmitting(true);
    setError(null);

    const result = await loginWithNostr(values.nsec);

    if (result.error) {
      setError(result.error);
      setNostrLoginOpen(false);
    } else {
      toast({
        title: "Login Successful",
        description: "Found your saved wallets. Redirecting to your dashboard.",
      });
      setNostrLoginOpen(false);
      // The useEffect will handle the redirect
    }
    setIsNostrSubmitting(false);
  }

  const handleTryAgain = () => {
    setError(null);
    setIsSubmitting(false);
    form.reset();
  };

  if (isWalletLoading && !activeXpub) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  if (error) {
    const isNoTxError = error.includes('no transaction history');
    const isBadNsecError = error.includes('invalid or malformed');
    const isNoNostrWalletsError = error.includes('No saved wallets were found');
    const isTimeoutError = error.includes('timed out');
    const isFriendlyError = isNoTxError || isBadNsecError || isNoNostrWalletsError || isTimeoutError;

    let icon, title;

    if (isNoTxError) {
      icon = <SearchX className="h-12 w-12 text-primary" />;
      title = "No Transactions Found";
    } else if (isBadNsecError) {
      icon = <AlertTriangle className="h-12 w-12 text-primary" />;
      title = "Invalid Nostr Key";
    } else if (isNoNostrWalletsError) {
      icon = <SearchX className="h-12 w-12 text-primary" />;
      title = "No Wallets Found";
    } else if (isTimeoutError) {
      icon = <AlertTriangle className="h-12 w-12 text-amber-500" />;
      title = "Connection Timeout";
    } else {
      icon = <AlertTriangle className="h-12 w-12 text-destructive" />;
      title = "Connection Failed";
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        {/* Header with Theme Toggle */}
        <header className="absolute top-0 right-0 p-4 z-50">
          <ThemeToggle />
        </header>

        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center justify-center gap-4 sm:gap-6 rounded-2xl border-2 bg-card p-6 sm:p-8 text-center shadow-2xl",
            isFriendlyError
              ? "border-primary/20 shadow-primary/10"
              : "border-destructive/50 shadow-destructive/10"
          )}
        >
          {icon}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-card-foreground">
              {title}
            </h1>
            <p className="text-muted-foreground font-normal text-sm sm:text-base">
              {error}
            </p>
            {isTimeoutError && (
              <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-100 text-left">
                <p className="font-semibold mb-2">Tips to resolve this:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your internet connection is stable</li>
                  <li>Try again when the network is less congested</li>
                  <li>For wallets with many transactions, this may take longer</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleTryAgain} className="mt-2 sm:mt-4 w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      {/* Header with Theme Toggle */}
      <header className="absolute top-0 right-0 p-4 z-50">
        <ThemeToggle />
      </header>

      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 sm:gap-6 rounded-2xl border-2 bg-card p-6 sm:p-8 shadow-2xl shadow-primary/10 hover:shadow-primary/20 transition-shadow duration-300">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="mb-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full grid place-items-center bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 shadow-md">
            <Logo className="h-10 w-10 sm:h-12 sm:w-12" style={{ color: 'hsl(var(--brand))' }} />
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tighter bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text">
            BitSleuth - AI Bitcoin Wallet Analyzer
          </h1>
          <p className="text-muted-foreground font-normal max-w-md text-sm sm:text-base">
            The most advanced AI-powered Bitcoin wallet security analyzer. Get comprehensive insights into your Bitcoin wallet's security, privacy, and transaction patterns instantly.
          </p>
          <p className="text-muted-foreground font-normal max-w-md text-sm sm:text-base">
            Enter a Bitcoin xpub key to get AI-powered insights.
          </p>
        </div>

        <div className="w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
              <FormField
                control={form.control}
                name="xpub"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>XPUB Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your xpub key..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full font-bold shadow-md hover:shadow-lg transition-shadow" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Connect Wallet
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              
              {/* Progress Dialog */}
              <Dialog open={isSubmitting} onOpenChange={(open) => !open && setIsSubmitting(false)}>
                <DialogContent 
                  className="sm:max-w-md" 
                  hideCloseButton
                  onPointerDownOutside={(e) => e.preventDefault()}
                  onEscapeKeyDown={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      {discoveryProgress && discoveryProgress.addressesWithActivity > 0 
                        ? `Discovering Wallet - ${discoveryProgress.addressesWithActivity} Addresses Found`
                        : 'Connecting Your Wallet'}
                    </DialogTitle>
                    <DialogDescription className="font-normal">
                      {discoveryProgress 
                        ? `${discoveryProgress.addressesChecked} addresses checked, ${discoveryProgress.addressesWithActivity} with activity`
                        : 'Please wait while we analyze your Bitcoin wallet...'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {discoveryProgress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {discoveryProgress.isComplete 
                              ? '✅ Discovery complete!' 
                              : `🔍 Batch ${discoveryProgress.currentBatch} - scanning addresses...`}
                          </span>
                          <span className="text-primary font-mono font-semibold">
                            {discoveryProgress.addressesWithActivity} found
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-primary to-primary/70 h-full transition-all duration-500 ease-out"
                            style={{ 
                              width: discoveryProgress.isComplete 
                                ? '100%' 
                                : `${Math.min((discoveryProgress.addressesChecked / (discoveryProgress.addressesChecked + 20)) * 100, 95)}%` 
                            }}
                          />
                        </div>
                        {!discoveryProgress.isComplete && (
                          <p className="text-xs text-muted-foreground text-center">
                            Discovery continues until no more active addresses are found (BIP44 gap limit)
                          </p>
                        )}
                      </div>
                    )}
                    {!discoveryProgress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{loadingStage || 'Validating XPUB...'}</span>
                          <span className="text-muted-foreground">{elapsedTime}s</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${Math.min((elapsedTime / DISCOVERY_TIMEOUT_SECONDS) * 100, 95)}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg bg-muted p-3 text-xs space-y-1 text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3 text-primary" />
                        {discoveryProgress 
                          ? `Found ${discoveryProgress.addressesWithActivity} addresses with ${discoveryProgress.addressesChecked} checked`
                          : 'Discovering wallet addresses (no timeout - continues until complete)'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-primary" />
                        {discoveryProgress && discoveryProgress.addressesWithActivity > 0
                          ? 'Transactions are being fetched in real-time'
                          : 'Fetching transaction history from blockchain'}
                      </p>
                      <p className="flex items-center gap-2">
                        <BarChart3 className="h-3 w-3 text-primary" />
                        {discoveryProgress && discoveryProgress.addressesWithActivity > 0
                          ? 'You can view your wallet while discovery continues!'
                          : 'Calculating security and performance metrics'}
                      </p>
                    </div>
                    {discoveryProgress && discoveryProgress.addressesChecked > 40 && !discoveryProgress.isComplete && (
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-xs text-green-900 dark:text-green-100">
                        <p className="font-semibold mb-1">🎉 Large wallet detected!</p>
                        <p>Found {discoveryProgress.addressesWithActivity} addresses so far. Discovery will continue until no more active addresses are found (no timeout!).</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Dialog open={isNostrLoginOpen} onOpenChange={(isOpen) => {
              setNostrLoginOpen(isOpen);
              if (isOpen) {
                setNostrDialogKey(Date.now());
              } else {
                nostrForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full shadow-sm hover:shadow-md transition-shadow" size="lg">
                  <OstrichIcon className="mr-2 h-5 w-5 text-primary" />
                  Login with Nostr
                </Button>
              </DialogTrigger>
              {isNostrLoginOpen && (
                <DialogContent key={`nostr-dialog-${nostrDialogKey}`} aria-describedby="nostr-login-description">
                  <DialogHeader>
                    <DialogTitle>Login with Nostr</DialogTitle>
                    <DialogDescription id="nostr-login-description" className="font-normal">
                      Enter your Nostr private key (nsec) to securely log in and load your saved XPUB keys.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...nostrForm}>
                    <form onSubmit={nostrForm.handleSubmit(onNostrSubmit)} className="space-y-4">
                      <FormField
                        control={nostrForm.control}
                        name="nsec"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Private Key (nsec)</FormLabel>
                            <FormControl>
                              <Input placeholder="nsec1..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={isNostrSubmitting}>
                          {isNostrSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isNostrSubmitting ? 'Connecting...' : 'Login'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              )}
            </Dialog>

            <Button variant="link" size="lg" className="w-full text-muted-foreground" asChild>
              <Link href="/market">Continue without a wallet &rarr;</Link>
            </Button>
          </div>
        </div>

        <p className="px-8 text-center text-xs text-muted-foreground font-normal italic">
          By analyzing an xpub, you agree to our{" "}
          <Link href="https://www.bitsleuth.ai/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="https://www.bitsleuth.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          . Only public blockchain data is analyzed - your private keys are never accessed.
        </p>
      </div>

      {/* SEO-friendly features section - Moved Out of Card */}
      <div className="w-full max-w-6xl space-y-8 text-center mt-12 sm:mt-16 px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Why BitSleuth?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground">Security Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered assessment of your wallet's privacy and security practices.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground">Transaction Patterns</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Visualize inflow, outflow, and activity trends over time.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground">Market Data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real-time Bitcoin price, fees, and mempool status updates.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground">Deep Search</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explore any address or transaction with our block explorer.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
