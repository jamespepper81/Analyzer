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
  Zap,
} from "lucide-react";
import { useState, useEffect, useRef, useTransition } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { cn } from "@/lib/utils";
import {
  DISCOVERY_TIMEOUT_SECONDS,
  STAGE_TRANSITION_TIMEOUT_MS,
} from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WalletConnectionProgress } from "@/components/ui/wallet-connection-progress";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";
import { LoginFlowTimer } from "@/lib/logger";
import { validateAuthInput, measureAuthValidation } from "@/lib/fast-auth";


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
  
  // Timer for tracking login flow performance
  const loginTimer = useRef(new LoginFlowTimer());
  
  // Track if we've already navigated to prevent duplicate navigation
  const hasNavigated = useRef(false);

  const { addXpub, activeXpub, isLoading: isWalletLoading, loginWithNostr, discoveryProgress, testXpub } = useWallet();

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
  // This handles both initial page load and when activeXpub changes
  useEffect(() => {
    if (activeXpub && !hasNavigated.current) {
      loginTimer.current.mark('activeXpubDetected', { activeXpub: activeXpub.substring(0, 20) + '...' });
      hasNavigated.current = true;
      loginTimer.current.mark('navigationTriggered');
      router.push('/dashboard');
      loginTimer.current.mark('routerPushCalled');
    }
  }, [activeXpub, router]);

  useEffect(() => {
    if (!testXpub) {
      return;
    }
    const currentValue = form.getValues('xpub');
    if (!currentValue) {
      form.setValue('xpub', testXpub, { shouldDirty: true });
    }
  }, [form, testXpub]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Reset navigation flag for new submission
    hasNavigated.current = false;

    // Start timing the login flow
    loginTimer.current.start('connectStart');

    setIsSubmitting(true);
    setError(null);

    try {
      // FAST PATH: Validate synchronously (<50ms target)
      loginTimer.current.mark('validationStart');
      const { result: validation, durationMs } = measureAuthValidation(values.xpub);
      loginTimer.current.mark('validationComplete', { durationMs, success: validation.success });

      if (!validation.success) {
        setError(validation.error || 'Invalid XPUB format');
        setIsSubmitting(false);
        return;
      }

      // INSTANT ROUTE: Navigate immediately, don't wait for data
      loginTimer.current.mark('instantRouteStart');

      // Add XPUB to context (this triggers background loading)
      // The navigation will happen via useEffect, but we call addXpub
      // which sets activeXpub synchronously
      loginTimer.current.mark('addXpubStart');
      const result = await addXpub(values.xpub);
      loginTimer.current.mark('addXpubComplete', { success: !result.error });

      if (result.error) {
        loginTimer.current.mark('addXpubError', { error: result.error });
        setError(result.error);
        setIsSubmitting(false);
      } else {
        // Success - navigation will happen via useEffect when activeXpub updates
        loginTimer.current.mark('connectionSuccessful');

        // Log timing summary in dev mode
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_LOGIN_FLOW === 'true') {
          setTimeout(() => {
            console.log(loginTimer.current.getSummary());
          }, 100);
        }
        // Keep isSubmitting true - user will see brief loading then navigate
      }
    } catch (error) {
      loginTimer.current.mark('unexpectedError', { error: error instanceof Error ? error.message : String(error) });
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  async function onNostrSubmit(values: z.infer<typeof nostrFormSchema>) {
    // Reset navigation flag
    hasNavigated.current = false;
    loginTimer.current.start('nostrLoginStart');

    setIsNostrSubmitting(true);
    setError(null);

    // FAST PATH: Validate nsec format locally first
    loginTimer.current.mark('nsecValidationStart');
    const validation = validateAuthInput(values.nsec);
    loginTimer.current.mark('nsecValidationComplete', { success: validation.success });

    if (!validation.success) {
      setError(validation.error || 'Invalid Nostr key format');
      setIsNostrSubmitting(false);
      setNostrLoginOpen(false);
      return;
    }

    // Close the input dialog immediately so the progress modal can show
    setNostrLoginOpen(false);

    loginTimer.current.mark('loginWithNostrStart');
    const result = await loginWithNostr(values.nsec);
    loginTimer.current.mark('loginWithNostrComplete', { success: !result.error });

    if (result.error) {
      loginTimer.current.mark('nostrLoginError', { error: result.error });
      setError(result.error);
      setIsNostrSubmitting(false);
    } else {
      loginTimer.current.mark('nostrLoginSuccessful');
      // Navigation happens via useEffect when activeXpub updates

      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_LOGIN_FLOW === 'true') {
        setTimeout(() => {
          console.log(loginTimer.current.getSummary());
        }, 100);
      }
      // Keep isNostrSubmitting true - user will navigate shortly
    }
  }

  const handleTryAgain = () => {
    setError(null);
    setIsSubmitting(false);
    form.reset();
    hasNavigated.current = false;
    loginTimer.current.reset();
  };

  if (isWalletLoading && !activeXpub) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
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
      <main className="grid min-h-screen lg:grid-cols-2 relative overflow-hidden">
        {/* Header with Theme Toggle - Absolute for layout */}
        <header className="absolute top-0 right-0 p-4 z-50">
          <ThemeToggle />
        </header>

        {/* Left Column - Error View */}
        <div className="flex flex-col justify-center items-center p-8 lg:p-12 relative z-10 bg-background/95 backdrop-blur-sm lg:bg-background">
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
        </div>

        {/* Right Column - Visual */}
        <div className="hidden lg:block relative bg-muted h-full w-full">
          <Image
            src="/images/login-background.png"
            alt="BitSleuth Analytics"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent lg:hidden" />
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Absolute Header with Theme Toggle */}
      <header className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </header>

      {/* Left Column: Form & Content */}
      <div className="flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-24 bg-background z-20">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Brand Header */}
          <div className="space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl grid place-items-center bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 shadow-sm border border-primary/10">
                <Logo className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: 'hsl(var(--brand))' }} />
              </div>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              BitSleuth Analyzer
            </h1>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Welcome back to the most advanced AI-powered Bitcoin wallet security analyzer.
              </h2>
              <p className="text-muted-foreground text-base">
                Enter your Bitcoin xpub to get instant insights into security, privacy, and transactions.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="xpub"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">XPUB Key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="xpub..."
                          className="h-12 bg-muted/50 border-input/60 focus:bg-background transition-colors"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-5 w-5" />
                        Connect Wallet
                      </>
                    )}
                  </Button>

                  {/* Enhanced connecting progress modal */}
                  <Dialog open={isSubmitting} onOpenChange={(open) => !open && setIsSubmitting(false)}>
                    <DialogContent
                      className="sm:max-w-md"
                      hideCloseButton
                      onPointerDownOutside={(e) => e.preventDefault()}
                      onEscapeKeyDown={(e) => e.preventDefault()}
                    >
                      <WalletConnectionProgress type="xpub" isOpen={isSubmitting} />
                    </DialogContent>
                  </Dialog>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-muted-foreground/20" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or login with
                      </span>
                    </div>
                  </div>

                  <Dialog open={isNostrLoginOpen} onOpenChange={(isOpen) => {
                    setNostrLoginOpen(isOpen);
                    if (isOpen) {
                      setNostrDialogKey(Date.now());
                    } else {
                      nostrForm.reset();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full h-11 border-muted-foreground/30 hover:bg-muted/50" type="button">
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

                  {/* Enhanced Nostr connection progress modal */}
                  <Dialog open={isNostrSubmitting && !isNostrLoginOpen} onOpenChange={() => {}}>
                    <DialogContent
                      className="sm:max-w-md"
                      hideCloseButton
                      onPointerDownOutside={(e) => e.preventDefault()}
                      onEscapeKeyDown={(e) => e.preventDefault()}
                    >
                      <WalletConnectionProgress type="nostr" isOpen={isNostrSubmitting && !isNostrLoginOpen} />
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            </Form>

            <div className="text-center pt-2">
              <Link href="/market" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 group">
                Continue without a wallet
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="pt-8 text-center text-xs text-muted-foreground">
            <p className="max-w-[280px] mx-auto leading-relaxed">
              By analyzing an xpub, you agree to our{" "}
              <Link href="https://www.bitsleuth.ai/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="https://www.bitsleuth.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary font-medium">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Features */}
      <div className="hidden lg:block relative h-full w-full bg-slate-950 overflow-hidden">
        <Image
          src="/images/login-background.png"
          alt="BitSleuth Analytical Background"
          fill
          className="object-cover opacity-90"
          priority
        />
        {/* Gradients for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Feature Overlay */}
        <div className="absolute top-1/2 -translate-y-1/2 right-12 xl:right-24 max-w-[500px] space-y-8 z-10 p-8 rounded-2xl bg-black/10 backdrop-blur-md border border-white/10 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6">Why BitSleuth?</h3>

          <div className="space-y-6">
            <div className="flex gap-4 items-start group">
              <div className="mt-1 h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/30 transition-colors">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-lg">Security Analysis</h4>
                <p className="text-slate-300 text-sm leading-relaxed">AI-powered assessment of your wallet's privacy and security practices.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start group">
              <div className="mt-1 h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/30 transition-colors">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-lg">Transaction Patterns</h4>
                <p className="text-slate-300 text-sm leading-relaxed">Visualize inflow, outflow, and activity trends over time.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start group">
              <div className="mt-1 h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/30 transition-colors">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-lg">Market Data</h4>
                <p className="text-slate-300 text-sm leading-relaxed">Real-time Bitcoin price, fees, and mempool status updates.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start group">
              <div className="mt-1 h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/30 transition-colors">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-lg">Deep Search</h4>
                <p className="text-slate-300 text-sm leading-relaxed">Explore any address or transaction with our block explorer.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
