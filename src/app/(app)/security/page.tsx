
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet, TestTube2, ShieldCheck, AlertTriangle, Lightbulb, ShieldAlert, Share2, Loader2, Search, CircleHelp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import type { SecurityRecommendation, Currency } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { screenAddress, type AddressScreeningResult } from '@/lib/chainabuse';

type SecurityMetricProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  level?: 'Low' | 'Medium' | 'High' | 'Good';
  levelText?: string;
  tooltipText?: string;
};

const addressScreeningFormSchema = z.object({
    address: z.string().min(26, { message: 'Please enter a valid Bitcoin address.'}),
});

function AddressScreener() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AddressScreeningResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof addressScreeningFormSchema>>({
        resolver: zodResolver(addressScreeningFormSchema),
        defaultValues: { address: "" },
    });

    async function onSubmit(values: z.infer<typeof addressScreeningFormSchema>) {
        setIsLoading(true);
        setError(null);
        setResult(null);

        const screeningResult = await screenAddress(values.address);

        if (screeningResult.error) {
            setError(screeningResult.error);
        } else if (screeningResult.data) {
            setResult(screeningResult.data);
        }
        setIsLoading(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base sm:text-lg">Address Screener</CardTitle>
                <CardDescription className="font-normal text-sm">
                    Check any Bitcoin address against the TRM Labs scam database.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-2">
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem className="flex-grow w-full">
                                    <FormLabel>Bitcoin Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter address to check..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading} size="default" className="w-full sm:w-auto">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Check
                        </Button>
                    </form>
                </Form>

                {error && (
                    <div className="mt-4 text-center text-red-500 bg-red-500/10 p-4 rounded-md" role="alert">
                        <p className="font-bold">Screening Failed</p>
                        <p className="text-sm font-normal">{error}</p>
                    </div>
                )}

                {result && (
                    <div className="mt-4 space-y-4" role="alert">
                        {result.isSanctioned ? (
                            <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
                                <p className="font-bold">Sanctioned Address</p>
                                <p className="text-sm font-normal">This address is on a sanctions list. Interacting with it is high risk.</p>
                            </div>
                        ) : (
                             <div className="text-center text-emerald-500 bg-emerald-500/10 p-4 rounded-md">
                                <p className="font-bold">Clean</p>
                                <p className="text-sm font-normal">This address was not found on any sanctions lists screened by TRM Labs.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SecurityMetric({ icon, title, value, description, level, levelText, tooltipText }: SecurityMetricProps) {
  const levelClasses = {
    Good: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    Low: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    Medium: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    High: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
  };

  const card = (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground font-normal">{description}</p>
        <div className="flex justify-start mt-3">
          {level && (
              <Badge variant="outline" className={cn('w-fit', levelClasses[level])}>{level} {levelText ?? 'Risk'}</Badge>
          )}
        </div>
        <div className="flex-1"></div>
      </CardContent>
    </Card>
  );

  if (tooltipText) {
      return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="cursor-help">{card}</div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs font-normal">{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      )
  }
  
  return card;
}

function RecommendationItem({ recommendation }: { recommendation: SecurityRecommendation }) {
    const { title, description, level } = recommendation;
  
    const ICONS = {
      'Good': <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      'Warning': <AlertTriangle className="h-5 w-5 text-amber-500" />,
      'Info': <Lightbulb className="h-5 w-5 text-blue-500" />,
      'Critical': <ShieldAlert className="h-5 w-5 text-destructive" />,
    };
  
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 flex-shrink-0">
                {ICONS[level]}
            </div>
            <div>
                <p className="font-bold text-card-foreground">{title}</p>
                <p className="text-sm text-muted-foreground font-normal">{description}</p>
            </div>
        </div>
    );
}

function RecommendationsLoadingSkeleton() {
    return (
        <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-5 w-5 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function SecurityPage() {
    const { data, isLoading, error, activeXpub: xpub, recommendations, refreshRecommendations, nostrNpub, publishNostrNote, currency, fiatPrice, currencySymbol } = useWallet();
    const { toast } = useToast();
    const [isSharing, setIsSharing] = useState(false);
    
    const shareUrl = `https://app.bitsleuth.ai/`;
    const shareText = `Just checked the privacy threat level of my Bitcoin wallet using BitSleuth - free and fast wallet analysis powered by AI.\n\nCheck yours now:`;
    const shareHashtags = `#Bitcoin #Privacy #WalletSecurity #BitSleuth`;
    const shareContent = `${shareText} ${shareUrl}\n\n${shareHashtags}`;


    useEffect(() => {
        // Refresh recommendations every time the security page is viewed
        if (data) {
            refreshRecommendations();
        }
    }, [data, refreshRecommendations]);
    
    if (!xpub) return <FullPageLoader />;
    if (isLoading) return <FullPageLoader />;
    if (error) return <ErrorDisplay message={error} />;
    if (!data) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;

    const usedAddressCount = data.usedAddressCount ?? 0;
    
    let dustLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (data.dustUtxoCount > 50) {
        dustLevel = 'High';
    } else if (data.dustUtxoCount > 10) {
        dustLevel = 'Medium';
    }

    let activityLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (usedAddressCount > 50) {
        activityLevel = 'High';
    } else if (usedAddressCount > 10) {
        activityLevel = 'Medium';
    }
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    }
    
    const dustAmountFiat = data.dustAmountBTC * fiatPrice;

  const handleShare = async () => {
    setIsSharing(true);
    const result = await publishNostrNote(shareContent);

    if (result.success) {
      toast({
        title: "Shared on Nostr",
        description: "Your note has been published successfully.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Share Failed",
        description: result.error || "Could not publish your note to Nostr.",
      });
    }
    setIsSharing(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <SecurityMetric
          icon={<ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
          title="Privacy Threat Level"
          value={data.opsecThreat}
          description="Risk from address reuse. Low is good."
          level={data.opsecThreat}
          tooltipText="This assesses the risk to your privacy based on address reuse. 'Low' means you follow best practices. 'Medium' indicates some reuse. 'High' suggests significant address reuse, which can link your transactions together and compromise your privacy."
        />
        <SecurityMetric
          icon={<Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
          title="Used Address Count"
          value={usedAddressCount}
          description="Total unique addresses with transaction history."
          level={activityLevel}
          levelText="Activity"
          tooltipText="This shows the total number of unique addresses in your wallet that have been involved in at least one transaction. A very high number can sometimes indicate extensive wallet usage."
        />
        <SecurityMetric
          icon={<TestTube2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
          title="Dust Value"
          value={formatCurrency(dustAmountFiat)}
          description={`Across ${data.dustUtxoCount} UTXOs worth <${currencySymbol}1 each.`}
          level={dustLevel}
          tooltipText='"Dust" refers to tiny, unspent amounts of Bitcoin in your wallet. While not a direct security risk, a large number of dust UTXOs can impact privacy and may lead to higher transaction fees in the future.'
        />
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Spread the Word</CardTitle>
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col h-full">
                <div className="text-xl sm:text-2xl font-bold mb-2">Share</div>
                <div className="text-xs text-muted-foreground font-normal">Help others improve their Bitcoin privacy.</div>
                <div className="flex justify-start mt-3">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            className="w-fit"
                            disabled={!nostrNpub}
                            size="sm"
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share on Nostr
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Preview Nostr Note</AlertDialogTitle>
                            <AlertDialogDescription className="font-normal">
                                This is a preview of the note that will be published to Nostr from your connected Nostr key.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {/* Rich preview of the final post */}
                        <div className="mt-2 space-y-4 rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                            <p className="whitespace-pre-wrap font-normal">{`Just checked the privacy threat level of my Bitcoin wallet using BitSleuth - free and fast wallet analysis powered by AI.\n\nCheck yours now:`}</p>
                            
                            {/* The Link Preview Card */}
                            <div className="overflow-hidden rounded-lg border bg-background text-card-foreground">
                                <Image
                                    src="https://placehold.co/1200x630.png"
                                    alt="BitSleuth Share Preview"
                                    width={1200}
                                    height={630}
                                    className="aspect-[1.91/1] w-full object-cover"
                                    data-ai-hint="logo brand"
                                />
                                <div className="p-3 space-y-0.5">
                                    <p className="text-xs text-muted-foreground font-normal">app.bitsleuth.ai</p>
                                    <p className="font-bold">BitSleuth | AI Bitcoin Wallet Analyzer</p>
                                    <p className="text-sm text-muted-foreground font-normal">Get AI-powered insights into any Bitcoin wallet. Analyze transactions, security, and privacy with BitSleuth.</p>
                                </div>
                            </div>

                            <p className="whitespace-pre-wrap font-normal">{shareHashtags}</p>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSharing}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleShare} disabled={isSharing}>
                                {isSharing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    'Publish'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                {!nostrNpub && <div className="text-xs text-center text-muted-foreground mt-2 font-normal">Connect Nostr to share.</div>}
                </div>
                <div className="flex-1"></div>
            </CardContent>
        </Card>
      </div>

       <AddressScreener />
      
       <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">AI-Powered Recommendations</CardTitle>
          <CardDescription className="font-normal text-sm">Personalized tips to improve your wallet security and privacy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {recommendations.length > 0 ? (
                recommendations.slice(0, 3).map((rec) => (
                    <RecommendationItem key={rec.title} recommendation={rec} />
                ))
            ) : (
                <RecommendationsLoadingSkeleton />
            )}
        </CardContent>
      </Card>
      
       <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Active Addresses</CardTitle>
            <CardDescription className="font-normal text-sm">
              A list of addresses from this xpub with transaction activity. Addresses with more than 1 transaction are being reused.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-0">Address</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-0">Transaction Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.addresses && data.addresses.length > 0 ? (
                    data.addresses.map((addr) => (
                      <TableRow key={addr.address}>
                        <TableCell className="font-mono text-xs pl-4 sm:pl-0 max-w-[200px] sm:max-w-none">
                          <Link
                            href={`/address/${addr.address}`}
                            className="hover:underline cursor-pointer truncate block"
                          >
                            {addr.address}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm pr-4 sm:pr-0 whitespace-nowrap">{addr.n_tx}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground text-sm">
                            No active addresses found.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
