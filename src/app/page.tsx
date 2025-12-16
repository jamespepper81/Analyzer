

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

  const { addXpub, activeXpub, isLoading: isWalletLoading, loginWithNostr } = useWallet();

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

    const result = await addXpub(values.xpub);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      toast({
        title: "Connection Successful",
        description: "Redirecting to your dashboard.",
      });
      // The redirect is now handled by the useEffect hook above,
      // which waits for the activeXpub state to update.
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
    const isFriendlyError = isNoTxError || isBadNsecError || isNoNostrWalletsError;

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
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Connect Wallet
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
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
