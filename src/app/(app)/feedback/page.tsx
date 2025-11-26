

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SendHorizonal, ThumbsUp, CircleDashed, Copy, Zap } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { IconContainer } from '@/components/ui/icon-container';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { submitFeedback } from '@/ai/flows/feedback-flow';
import { usePathname } from 'next/navigation';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Import Dialog components
import { useWallet } from '@/contexts/wallet-context';
import { useAnalytics } from '@/hooks/use-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/lib/logger';

const feedbackSchema = z.object({
  feedback: z.string().min(10, 'Please provide at least 10 characters of feedback.'),
});

const lightningAddress = "laxspleen65@walletofsatoshi.com";
const lnurl = "lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhkcctcwdcxcet9dcmr2sgqlne";


export default function FeedbackPage() {
  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedback: '',
    },
  });

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pathname = usePathname();
  const { data: walletData } = useWallet();
  const { track } = useAnalytics();

  const handleCopy = (textToCopy: string, type: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: 'Copied to clipboard',
      description: `${type}: ${textToCopy}`,
    });
  };

  async function onSubmit(data: z.infer<typeof feedbackSchema>) {
    setIsLoading(true);
    setError(null);
    setIsSubmitted(false);

    try {
        const walletSummary = walletData ? {
            balance: walletData.balanceBTC,
            txCount: walletData.transactions.length,
            securityScore: walletData.securityScore
        } : {};

        const context = {
            currentPage: pathname,
            walletSummary,
        }

      // Step 1: Process feedback with AI
      const result = await submitFeedback({
        feedback: data.feedback,
        userContext: JSON.stringify(context, null, 2)
      });
      
      track('submit_feedback', { category: result.category, sentiment: result.sentiment });

      // Step 2: Submit to Google Sheets via API
      try {
        const apiResponse = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedbackData: result }),
        });

        const apiResult = await apiResponse.json();

        if (apiResult.success) {
          // Show success toast
          toast({
            title: 'Feedback submitted!',
            description: apiResult.warning || 'Thank you for your feedback. We appreciate your input!',
          });
          
          setIsSubmitted(true);
          form.reset();
        } else {
          // Show error toast but still consider it submitted (AI processed it)
          toast({
            title: 'Feedback received',
            description: 'Your feedback was processed but could not be saved to our records. We still appreciate your input!',
            variant: 'destructive',
          });
          
          setIsSubmitted(true);
          form.reset();
        }
      } catch (apiErr: any) {
        logger.error('API submission error:', apiErr);
        // Even if API fails, feedback was processed by AI
        toast({
          title: 'Feedback received',
          description: 'Your feedback was processed successfully.',
        });
        
        setIsSubmitted(true);
        form.reset();
      }

    } catch (err: any) {
      logger.error('Feedback submission error:', err);
      setError(err.message || 'Sorry, something went wrong while submitting your feedback. Please try again later.');
      
      toast({
        title: 'Submission failed',
        description: err.message || 'Sorry, something went wrong. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
        <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center px-4">
            <div className="rounded-xl border-2 bg-card p-6 sm:p-8 shadow-md max-w-lg space-y-4 w-full bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                <div className="flex justify-center">
                    <IconContainer variant="primary">
                        <ThumbsUp className="h-6 w-6 sm:h-8 sm:w-8" />
                    </IconContainer>
                </div>
                <AlertTitle className="text-xl sm:text-2xl font-bold">Thank You!</AlertTitle>
                <AlertDescription className="text-muted-foreground text-sm sm:text-base">
                    Your feedback has been submitted successfully. We appreciate you taking the time to help us improve BitSleuth.
                </AlertDescription>
                <Button onClick={() => setIsSubmitted(false)} className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow">Submit More Feedback</Button>
            </div>
        </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8 px-2 sm:px-0">
        <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tighter">Submit Feedback</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
                We'd love to hear your thoughts! Let us know what you like, what could be better, or if you've found a bug.
            </p>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="feedback"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Your Feedback</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Tell us what you think..."
                    className="min-h-36"
                    rows={6}
                    aria-label="Feedback input form"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="submit" className="w-full shadow-md hover:shadow-lg transition-shadow" size="lg" disabled={isLoading}>
            {isLoading ? (
                <>
                    <CircleDashed className="animate-spin mr-2" />
                    Submitting...
                </>
            ) : (
                <>
                    <SendHorizonal className="mr-2" />
                    Send Feedback
                </>
            )}
          </Button>
        </form>
      </Form>
      
      <Card className="border-2 shadow-md">
          <CardHeader className="bg-gradient-to-br from-amber-500/5 via-transparent to-transparent border-b">
            <CardTitle className='flex items-center gap-2 text-base sm:text-lg md:text-xl font-bold'>
              <IconContainer variant="amber">
                <Zap className='h-5 w-5 sm:h-6 sm:w-6'/>
              </IconContainer>
              Support BitSleuth
            </CardTitle>
            <CardDescription className="text-sm mt-2">
              If you find this tool helpful, consider sending a few sats. Your support helps us keep the servers running and continue development.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex-shrink-0">
                <Image
                  src="/lightning-qr.png"
                  alt="A QR code for sending a Lightning Network donation to support BitSleuth."
                  width={140}
                  height={140}
                  className="rounded-lg border bg-white p-1 sm:w-[160px] sm:h-[160px]"
                />
            </div>
            <div className="w-full text-center sm:text-left space-y-3 sm:space-y-4">
                <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Lightning Address:</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                        <code className="font-mono text-xs sm:text-sm break-all">{lightningAddress}</code>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => handleCopy(lightningAddress, 'Lightning Address')} aria-label="Copy Lightning Address">
                            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                </div>

                <Separator />
                
                <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Or copy the LNURL:</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                        <code className="font-mono text-xs break-all">{lnurl}</code>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => handleCopy(lnurl, 'LNURL')} aria-label="Copy LNURL">
                            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                </div>
            </div>
          </CardContent>
      </Card>
      
    </div>
  );
}
