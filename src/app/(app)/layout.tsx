
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, LayoutDashboard, MessageCircle, Shield, ChartLine, Star, Compass, Layers, ChartCandlestick, FileSpreadsheet, Coins } from 'lucide-react';

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
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useWalletData, useWalletActions } from '@/contexts/wallet-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { logger } from '@/lib/logger';
import { AnalyticsWarning } from '@/components/layout/analytics-warning';
import { AccountSwitcher } from '@/components/layout/account-switcher';
import { CurrencySwitcher } from '@/components/layout/currency-switcher';
import { NostrAccount } from '@/components/layout/nostr-account';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', description: "Get a high-level overview of your wallet's balance, security, and recent activity." },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions', description: "View a complete list of all your incoming and outgoing transactions." },
  { href: '/analysis', icon: ChartLine, label: 'Analysis', description: "Visualize your wallet's data with charts for balance history, transaction volume, and more." },
  { href: '/security', icon: Shield, label: 'Security', description: "Analyze your wallet's privacy practices, see security recommendations, and check for address reuse." },
  { href: '/report', icon: FileSpreadsheet, label: 'Report', description: "Generate financial reports for tax summary, profit & loss, and performance analysis." },
  { href: '/coin-control', icon: Coins, label: 'Coin Control', description: "Manage your UTXOs to optimize transaction fees and privacy." },
  { href: '/discover', icon: Compass, label: 'Discover', description: "Explore any Bitcoin address or transaction on the blockchain with an interactive graph." },
  { href: '/mempool', icon: Layers, label: 'Mempool', description: "See real-time data from the Bitcoin mempool, including fees and pending blocks." },
  { href: '/market', icon: ChartCandlestick, label: 'Market', description: "Track the latest Bitcoin price, market stats, and the Fear & Greed Index." },
  { href: '/chat', icon: MessageCircle, label: 'AI Chat', description: "Ask our AI assistant anything about your wallet or Bitcoin in general." },
  { href: '/feedback', icon: Star, label: 'Feedback', description: "Share your thoughts and suggestions to help us improve BitSleuth." },
];

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeXpub, isLoading } = useWalletData();
  const { disconnect } = useWalletActions();
  const { setOpenMobile, isMobile } = useSidebar();
  const { toast } = useToast();

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

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  const handleDisconnect = () => {
      disconnect();
      router.push('/');
      setOpenMobile(false);
  };

  const currentPage = navItems.find(item => pathname.startsWith(item.href));
  const showLayoutDebug = process.env.NEXT_PUBLIC_LAYOUT_DEBUG === 'true';
  const layoutHeaderPadding = 'px-4 md:px-6 lg:px-8';
  const layoutContentPadding = 'p-4 md:p-6 lg:p-8';
  // Plain section titles under the single BitSleuth brand (the previous
  // per-page sub-brands — BitTracker, BitInsight, … — read as different
  // products and never matched the sidebar labels).
  const pageTitle = currentPage?.label ?? 'BitSleuth';


  return (
    <>
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        data-debug={showLayoutDebug}
        className={cn(showLayoutDebug && 'border-r border-dashed border-success')}
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
                    <span
                      className={cn(
                        "min-w-0 overflow-hidden pr-2",
                        isMobile && "pr-0 text-center"
                      )}
                    >
                      <span
                        className={cn(
                          "block truncate transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0",
                          isMobile && "text-base text-center"
                        )}
                      >
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
                <NostrAccount />
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset data-debug={showLayoutDebug} className={cn(showLayoutDebug && 'border-l border-dashed border-success')}>
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
