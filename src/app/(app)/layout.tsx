
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, LayoutDashboard, MessageCircle, Shield, Bitcoin, LineChart, Star, Terminal, Pencil, ChevronsUpDown, PlusCircle, Check, X, Loader2, Compass, Layers, CandlestickChart, FileSpreadsheet, Coins } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo, OstrichIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/contexts/wallet-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency } from '@/lib/types';
import { ToastAction } from '@/components/ui/toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { logger } from '@/lib/logger';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', description: "Get a high-level overview of your wallet's balance, security, and recent activity." },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions', description: "View a complete list of all your incoming and outgoing transactions." },
  { href: '/analysis', icon: LineChart, label: 'Analysis', description: "Visualize your wallet's data with charts for balance history, transaction volume, and more." },
  { href: '/security', icon: Shield, label: 'Security', description: "Analyze your wallet's privacy practices, see security recommendations, and check for address reuse." },
  { href: '/report', icon: FileSpreadsheet, label: 'Report', description: "Generate financial reports for tax summary, profit & loss, and performance analysis." },
  { href: '/coin-control', icon: Coins, label: 'Coin Control', description: "Manage your UTXOs to optimize transaction fees and privacy." },
  { href: '/discover', icon: Compass, label: 'Discover', description: "Explore any Bitcoin address or transaction on the blockchain with an interactive graph." },
  { href: '/mempool', icon: Layers, label: 'Mempool', description: "See real-time data from the Bitcoin mempool, including fees and pending blocks." },
  { href: '/market', icon: CandlestickChart, label: 'Market', description: "Track the latest Bitcoin price, market stats, and the Fear & Greed Index." },
  { href: '/chat', icon: MessageCircle, label: 'AI Chat', description: "Ask our AI assistant anything about your wallet or Bitcoin in general." },
  { href: '/feedback', icon: Star, label: 'Feedback', description: "Share your thoughts and suggestions to help us improve BitSleuth." },
];

function AnalyticsWarning() {
  const [isConfigured, setIsConfigured] = React.useState(true);

  // We check on mount to avoid hydration errors
  React.useEffect(() => {
    setIsConfigured(!!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);
  }, []);

  if (isConfigured) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Analytics Not Configured</AlertTitle>
        <AlertDescription className="font-normal">
            Your Firebase environment variables are missing. To enable analytics, add <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> and <code>NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID</code> to the <code>.env</code> file, then restart the development server.
        </AlertDescription>
    </Alert>
  )
}

const AddAccountFormSchema = z.object({
    xpub: z.string().min(1, { message: "XPUB key is required." }),
});

function AddAccountDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { addXpub } = useWallet();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const form = useForm<z.infer<typeof AddAccountFormSchema>>({
        resolver: zodResolver(AddAccountFormSchema),
        defaultValues: { xpub: "" },
    });

    async function onSubmit(values: z.infer<typeof AddAccountFormSchema>) {
        setIsSubmitting(true);
        form.clearErrors('xpub');
        const result = await addXpub(values.xpub);
        if (result.error) {
            form.setError("xpub", { type: "manual", message: result.error });
        } else {
            toast({ title: "XPUB Key Added", description: "Successfully connected the new xpub." });
            onOpenChange(false);
            form.reset();
        }
        setIsSubmitting(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) form.reset(); }}>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New XPUB Key</DialogTitle>
                    <DialogDescription className="font-normal">
                        Enter a Bitcoin xpub key to add it to your list of wallets.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="xpub"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>XPUB Key</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter your xpub key..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Connecting...' : 'Add XPUB Key'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function AccountSwitcher() {
    const { activeXpub, xpubs, setActiveXpub, removeXpub, refetch } = useWallet();
    const { isMobile, setOpenMobile } = useSidebar();
    const [isAddAccountDialogOpen, setAddAccountDialogOpen] = React.useState(false);
    const [isPopoverOpen, setPopoverOpen] = React.useState(false);

    if (!activeXpub) return null;

    const handleSelectWallet = (xpub: string) => {
        if (xpub === activeXpub) {
            refetch();
        } else {
            setActiveXpub(xpub);
        }
        setPopoverOpen(false);
        if (isMobile) {
            setOpenMobile(false);
        }
    }

    const handleAddWalletClick = () => {
        setPopoverOpen(false);
        setAddAccountDialogOpen(true);
    }

    const handleTriggerClick = (e: React.MouseEvent) => {
        if (isMobile) {
            e.stopPropagation();
        }
        setPopoverOpen((v) => !v);
    }

    return (
        <>
            <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <div
                        role="button"
                        aria-label="Switch wallet"
                        onClick={handleTriggerClick}
                        className="grid w-full cursor-pointer grid-cols-[var(--sidebar-width-icon)_minmax(0,1fr)] items-center rounded-md py-2 transition-colors hover:bg-primary/20"
                    >
                        <div className="flex h-10 w-full items-center justify-center">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className='flex items-center justify-center bg-transparent'>
                                    <Bitcoin className="h-5 w-5 text-primary" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="min-w-0 overflow-hidden pr-2 transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0">
                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1 text-left">
                                    <span className='block truncate font-semibold text-sm'>Active XPUB Key</span>
                                    <span className='block truncate font-mono text-xs text-muted-foreground'>{`${activeXpub.substring(0, 12)}...`}</span>
                                </div>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </div>
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverPortal>
                    <PopoverContent
                        className="w-[250px] p-0 mb-1"
                        side="top"
                        align="start"
                        sideOffset={8}
                        onOpenAutoFocus={(e) => {
                             if (isMobile) {
                                e.preventDefault();
                             }
                        }}
                    >
                        <div className="space-y-1 p-2">
                            {xpubs.map((xpub) => (
                            <div
                                key={xpub}
                                onClick={() => handleSelectWallet(xpub)}
                                className={cn(
                                    "group flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent/50",
                                    activeXpub === xpub && "bg-primary text-primary-foreground"
                                )}
                                role="button"
                            >
                                <Check className={cn("h-4 w-4 shrink-0", activeXpub === xpub ? "opacity-100" : "opacity-0")} />
                                <span className="flex-1 truncate font-mono text-xs">{xpub}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100",
                                        activeXpub === xpub ? "hover:bg-primary/80" : "hover:bg-accent"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeXpub(xpub);
                                    }}
                                    disabled={xpubs.length <= 1}
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                            ))}
                        </div>
                        <Separator />
                        <div className="p-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleAddWalletClick}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add XPUB Key
                            </Button>
                        </div>
                    </PopoverContent>
                </PopoverPortal>
            </Popover>
            <AddAccountDialog open={isAddAccountDialogOpen} onOpenChange={setAddAccountDialogOpen} />
        </>
    )
}

function CurrencySwitcher() {
    const { currency, setCurrency, supportedCurrencies } = useWallet();

    if (!currency) return null;

    return (
        <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
            <SelectTrigger className="w-[80px] h-10">
                <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
                <SelectContent>
                    {supportedCurrencies.map((c) => (
                        <SelectItem key={c} value={c}>
                            {c}
                        </SelectItem>
                    ))}
                </SelectContent>
            </SelectContent>
        </Select>
    );
}


function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeXpub, isLoading, disconnect, nostrNpub, nostrProfile, isNostrReady, connectNostr, updateNostrProfile, showSaveXpubsPrompt, setShowSaveXpubsPrompt, saveXpubsToNostr } = useWallet();
  const { setOpenMobile, isMobile } = useSidebar();
  const { toast } = useToast();
  const [isNostrDialogOpen, setNostrDialogOpen] = React.useState(false);
  const [isEditProfileOpen, setEditProfileOpen] = React.useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = React.useState(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = React.useState(false);

  // Define public paths that do not require a wallet to be connected.
  const publicPaths = ['/market', '/mempool', '/discover', '/block/', '/transactions/', '/address/'];
  const isPublicPage = publicPaths.some(p => pathname.startsWith(p));
  
  // The root '/transactions' page (the list) is always protected.
  const isTransactionsListPage = pathname === '/transactions';

  // A page is protected if it's not public, or if it is the transaction list page.
  const isProtectedRoute = !isPublicPage || isTransactionsListPage;

  React.useEffect(() => {
    // If on a protected route without an active xpub, redirect to the connect page.
    if (isProtectedRoute && !isLoading && !activeXpub) {
      router.push('/');
    }
  }, [activeXpub, isLoading, router, isProtectedRoute, pathname]);

  const NostrFormSchema = z.object({
    nsec: z.string().startsWith('nsec1', { message: 'Nostr private key must start with "nsec1"' }),
  });

  const nostrForm = useForm<z.infer<typeof NostrFormSchema>>({
      resolver: zodResolver(NostrFormSchema),
      defaultValues: { nsec: "" },
  });

  const EditProfileSchema = z.object({
    display_name: z.string().max(50).optional(),
    name: z.string().max(50).optional(),
    about: z.string().max(1024).optional(),
    website: z.string().url({ message: 'Please enter a valid website URL.' }).optional().or(z.literal('')),
    picture: z.string().url({ message: 'Please enter a valid avatar URL.' }).optional().or(z.literal('')),
    banner: z.string().url({ message: 'Please enter a valid banner URL.' }).optional().or(z.literal('')),
    nip05: z.string().optional(),
    lud16: z.string().optional(),
  });

  const editProfileForm = useForm<z.infer<typeof EditProfileSchema>>({
    resolver: zodResolver(EditProfileSchema),
    defaultValues: {
      display_name: "",
      name: "",
      about: "",
      website: "",
      picture: "",
      banner: "",
      nip05: "",
      lud16: "",
    }
  });

  // Effect for checking for new version
  React.useEffect(() => {
    // This check should only run on the client.
    if (typeof window === 'undefined') {
      return;
    }
    
    // For development: pop up the alert after 1 minute to make it testable.
    if (process.env.NODE_ENV === 'development') {
      const devTimeout = setTimeout(() => {
        setIsUpdateAvailable(true);
      }, 60000); // 1 minute
      return () => clearTimeout(devTimeout);
    }

    // For production: check against the build ID.
    if (process.env.NODE_ENV === 'production' && window.__NEXT_DATA__) {
        const currentBuildId = window.__NEXT_DATA__.buildId;

        const intervalId = setInterval(async () => {
          try {
            const res = await fetch(window.location.href, {
              cache: 'no-store',
            });
            
            if (!res.ok) {
                console.warn(`Update check failed with status: ${res.status}`);
                return;
            }

            const html = await res.text();
            const match = html.match(/<script id="__NEXT_DATA__"[^>]*>({.*?})<\/script>/);

            if (match && match[1]) {
              const serverData = JSON.parse(match[1]);
              const serverBuildId = serverData.buildId;

              if (serverBuildId && currentBuildId && serverBuildId !== currentBuildId) {
                setIsUpdateAvailable(true);
                clearInterval(intervalId); // Stop checking once an update is found.
              }
            }
          } catch (err) {
            console.warn('Failed to check for app update:', err);
          }
        }, 60000); // Check every 60 seconds.

        return () => clearInterval(intervalId);
    }

  }, []);

  // Effect for showing the support toast
  React.useEffect(() => {
    const APP_OPEN_COUNT_KEY = 'bitsleuth_app_open_count';
    const SUPPORT_TOAST_SHOWN_KEY = 'bitsleuth_support_toast_shown';

    try {
        const openCount = parseInt(localStorage.getItem(APP_OPEN_COUNT_KEY) || '0', 10) + 1;
        localStorage.setItem(APP_OPEN_COUNT_KEY, openCount.toString());

        const toastShown = localStorage.getItem(SUPPORT_TOAST_SHOWN_KEY) === 'true';

        if (openCount >= 3 && !toastShown) {
            const supportTimeout = setTimeout(() => {
                toast({
                    title: "Enjoying BitSleuth?",
                    description: "If you find this tool helpful, consider sending a few sats to support its development.",
                    duration: Infinity,
                    action: (
                        <ToastAction altText="Support" asChild>
                            <Link href="/feedback">Support</Link>
                        </ToastAction>
                    ),
                });
                localStorage.setItem(SUPPORT_TOAST_SHOWN_KEY, 'true');
            }, 120000); // 2 minutes

            return () => clearTimeout(supportTimeout);
        }
    } catch (e) {
        logger.warn("Could not access local storage for usage tracking.", e);
    }
  }, [toast]);


  React.useEffect(() => {
    if (isEditProfileOpen && nostrProfile) {
      editProfileForm.reset({
        display_name: nostrProfile.display_name || '',
        name: nostrProfile.name || '',
        about: nostrProfile.about || '',
        website: nostrProfile.website || '',
        picture: nostrProfile.picture || '',
        banner: nostrProfile.banner || '',
        nip05: nostrProfile.nip05 || '',
        lud16: nostrProfile.lud16 || '',
      });
    }
  }, [isEditProfileOpen, nostrProfile, editProfileForm]);


  async function onNostrSubmit(values: z.infer<typeof NostrFormSchema>) {
      const result = await connectNostr(values.nsec);
      if (result.success) {
          toast({ title: 'Nostr Connected', description: 'Your Nostr account has been associated.' });
          setNostrDialogOpen(false);
          nostrForm.reset();
      } else {
          nostrForm.setError('nsec', { type: 'manual', message: result.error });
      }
  }

  async function onEditProfileSubmit(values: z.infer<typeof EditProfileSchema>) {
      const result = await updateNostrProfile(values);
      if (result.success) {
          toast({ title: 'Profile Updated', description: 'Your Nostr profile has been published.' });
          setEditProfileOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
      }
  }

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  const handleDisconnect = () => {
      disconnect();
      router.push('/');
      setOpenMobile(false);
  };

  const handleSaveXpubs = async () => {
    const result = await saveXpubsToNostr();
    if (result.success) {
        toast({ title: "XPUBs Saved", description: "Your xpub keys have been securely saved to your Nostr account." });
    } else {
        toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
    }
    setShowSaveXpubsPrompt(false);
  };

  let pageTitle = 'BitSleuth';
  const currentPage = navItems.find(item => pathname.startsWith(item.href));
  const showLayoutDebug = process.env.NEXT_PUBLIC_LAYOUT_DEBUG === 'true';
  const layoutHeaderPadding = 'px-4 md:px-6 lg:px-8';
  const layoutContentPadding = 'p-4 md:p-6 lg:p-8';
  
  if (currentPage) {
      const titles: { [key: string]: string } = {
          '/dashboard': 'BitTracker',
          '/transactions': 'BitTracker',
          '/analysis': 'BitInsight',
          '/security': 'BitWatch',
          '/report': 'BitTally',
          '/discover': 'BitSeek',
          '/mempool': 'BitQueue',
          '/market': 'BitSignal',
          '/chat': 'BitAI',
          '/feedback': 'BitVoice',
          '/coin-control': 'BitCompose',
      };
      pageTitle = titles[currentPage.href] || 'BitSleuth';
  }


  return (
    <>
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        data-debug={showLayoutDebug}
        className={cn(showLayoutDebug && 'border-r border-dashed border-emerald-400')}
      >
        <SidebarHeader className="px-0 pb-3">
          <div className="grid grid-cols-[var(--sidebar-width-icon)_minmax(0,1fr)] items-center">
            <div className="flex h-10 w-full items-center justify-center">
              <Logo className="h-8 w-8" style={{ color: 'hsl(var(--brand))' }} />
            </div>
            <div className="min-w-0 overflow-hidden pr-2">
              <span className="block truncate font-headline text-2xl font-bold tracking-tighter text-sidebar-foreground transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0">
                BitSleuth
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 pb-2 md:px-0">
          <SidebarMenu className="gap-2 md:gap-1">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  size={isMobile ? "lg" : "default"}
                  tooltip={{
                    children: item.description,
                    className: "max-w-xs",
                  }}
                  onClick={handleLinkClick}
                  className={cn(isMobile && "rounded-xl")}
                >
                  <Link href={item.href}>
                    <span className="flex h-full w-full items-center justify-center">
                      <item.icon className={cn("h-5 w-5", isMobile && "h-6 w-6")} />
                    </span>
                    <span className="min-w-0 overflow-hidden pr-2">
                      <span className={cn(
                        "block truncate transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0",
                        isMobile && "text-base"
                      )}>
                        {item.label}
                      </span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <div className="flex flex-col gap-2 px-0 py-2">
                <AccountSwitcher />
                <SidebarSeparator className="my-0 w-auto" />
                <div className="grid grid-cols-[var(--sidebar-width-icon)_minmax(0,1fr)] items-center rounded-md py-2">
                  <div className="flex h-10 w-full items-center justify-center">
                    {nostrNpub ? (
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={nostrProfile?.picture} alt={nostrProfile?.display_name || nostrProfile?.name || 'Nostr User'} />
                          <AvatarFallback>
                              <OstrichIcon className="h-5 w-5 text-primary" />
                          </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="flex items-center justify-center bg-transparent">
                          <OstrichIcon className="h-5 w-5 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="min-w-0 overflow-hidden pr-2 transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0">
                    {nostrNpub ? (
                      <div className="flex items-start gap-2">
                        <div className='min-w-0 flex-1'>
                          <span className='block truncate font-semibold text-sm'>{nostrProfile?.display_name || nostrProfile?.name || 'Nostr User'}</span>
                          <span className='block truncate text-xs text-muted-foreground font-mono' title={nostrNpub}>{`${nostrNpub.substring(0, 12)}...`}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditProfileOpen(true)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className='flex flex-col'>
                          <span className='font-semibold text-sm truncate'>Nostr Account</span>
                          <Button variant="link" size="sm" className="p-0 h-auto text-primary justify-start text-xs hover:no-underline" onClick={() => setNostrDialogOpen(true)} disabled={!isNostrReady}>
                            {isNostrReady ? 'Connect Account' : <Loader2 className="h-3 w-3 animate-spin"/>}
                          </Button>
                      </div>
                    )}
                  </div>
                </div>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset data-debug={showLayoutDebug} className={cn(showLayoutDebug && 'border-l border-dashed border-emerald-400')}>
        <header className={cn(
          "sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm gap-2",
          layoutHeaderPadding,
          showLayoutDebug && 'outline outline-1 outline-emerald-400'
        )}>
            <div className="flex items-center justify-start gap-2 sm:gap-4 min-w-0">
              <SidebarTrigger />
              <div className="hidden sm:block">
                <CurrencySwitcher />
              </div>
            </div>
            <div className="text-center flex-shrink px-2">
              <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tighter">{pageTitle}</h1>
            </div>
            <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
              <div className="block sm:hidden">
                <CurrencySwitcher />
              </div>
              <ThemeToggle />
              {activeXpub ? (
                 <Button variant="outline" size="sm" onClick={handleDisconnect} className="hidden sm:inline-flex">Disconnect</Button>
              ) : (
                <Button asChild size="sm" className="hidden sm:inline-flex">
                    <Link href="/">Connect Wallet</Link>
                </Button>
              )}
            </div>
        </header>
        <div className={cn(
          "relative flex min-h-svh flex-1 flex-col bg-background overflow-x-hidden transition-[padding] duration-200 ease-linear",
          layoutContentPadding,
          showLayoutDebug && 'outline outline-1 outline-sky-400'
        )}>
          <AnalyticsWarning />
          {children}
        </div>
      </SidebarInset>

      <AlertDialog open={isUpdateAvailable && !isUpdateDismissed}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>A New Version is Available</AlertDialogTitle>
            <AlertDialogDescription className="font-normal">
              Please refresh the page to get the latest features and fixes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsUpdateDismissed(true)}>
              Dismiss
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => window.location.reload()}>
              Refresh Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isNostrDialogOpen} onOpenChange={setNostrDialogOpen}>

          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Connect Nostr Account</DialogTitle>
                  <DialogDescription className="font-normal">
                      Enter your Nostr private key (nsec) to associate your account. Your key is stored locally in your browser and never sent to our servers.
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
                          <Button type="submit" disabled={nostrForm.formState.isSubmitting}>
                            {nostrForm.formState.isSubmitting ? 'Connecting...' : 'Connect'}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={isEditProfileOpen} onOpenChange={setEditProfileOpen}>

          <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                  <DialogTitle>Edit Nostr Profile</DialogTitle>
                  <DialogDescription className="font-normal">
                      Update your public profile information. This will be published to the Nostr network.
                  </DialogDescription>
              </DialogHeader>
              <Form {...editProfileForm}>
                  <form onSubmit={editProfileForm.handleSubmit(onEditProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={editProfileForm.control}
                            name="display_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl><Input placeholder="Your public display name" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editProfileForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl><Input placeholder="Your @username" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={editProfileForm.control}
                            name="picture"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Avatar URL</FormLabel>
                                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editProfileForm.control}
                            name="banner"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Banner URL</FormLabel>
                                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <FormField
                          control={editProfileForm.control}
                          name="website"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Website</FormLabel>
                                  <FormControl><Input placeholder="https://your-website.com" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={editProfileForm.control}
                          name="about"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>About</FormLabel>
                                  <FormControl><Textarea placeholder="Tell everyone a bit about yourself." className="resize-y" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={editProfileForm.control}
                            name="lud16"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lightning Address</FormLabel>
                                    <FormControl><Input placeholder="user@domain.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editProfileForm.control}
                            name="nip05"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>NIP-05 Identifier</FormLabel>
                                    <FormControl><Input placeholder="user@domain.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <DialogFooter>
                          <Button type="submit" disabled={editProfileForm.formState.isSubmitting}>
                            {editProfileForm.formState.isSubmitting ? 'Publishing...' : 'Save and Publish'}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      <AlertDialog open={showSaveXpubsPrompt} onOpenChange={setShowSaveXpubsPrompt}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Save XPUB Keys to Nostr?</AlertDialogTitle>
                    <AlertDialogDescription className="font-normal">
                        Would you like to save your current list of xpub keys to your Nostr account? They will be encrypted so only you can access them. This allows you to sync your wallets across different devices. You can always manage your list of keys from within BitSleuth's account switcher.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>No, Thanks</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSaveXpubs}>Yes, Save</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const pathname = usePathname();
  const isConnectPage = pathname === '/';

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (isConnectPage) {
    return <>{children}</>;
  }
  
  return (
    <SidebarProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppLayoutContent>{children}</AppLayoutContent>
    )
}

    

    





