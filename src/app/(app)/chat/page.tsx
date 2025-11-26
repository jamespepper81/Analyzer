
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SendHorizonal, Bot, User, CircleDashed, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { walletInsightsChat } from '@/ai/flows/wallet-insights-chat';
import { getNews } from '@/ai/flows/news-flow';
import { summarizeTransaction } from '@/ai/flows/summarize-transaction'; // Corrected import
import { summarizeAddress } from '@/ai/flows/summarize-address';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWallet } from '@/contexts/wallet-context';
import { FullPageLoader, ErrorDisplay } from '@/components/ui/loader';
import { AiChart } from '@/components/ui/ai-chart';
import type { Message, WalletData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/use-analytics';

const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});

// Static suggestions as a fallback if AI fails to generate them
const fallbackSuggestions = [
  "What's my most used address?",
  "Visualize my balance over time",
  "Analyze my transaction fees.",
  "/transaction <txid>",
  "/address <address>",
];

const MAX_CHAT_HISTORY = 8;
const MAX_CHAT_MESSAGE_LENGTH = 1200;

const sanitizeHistory = (history: Message[]): Message[] => {
  const trimmedHistory = history.slice(-MAX_CHAT_HISTORY);

  return trimmedHistory.map((message) => ({
    role: message.role,
    content:
      message.content.length > MAX_CHAT_MESSAGE_LENGTH
        ? `${message.content.slice(0, MAX_CHAT_MESSAGE_LENGTH)}…`
        : message.content,
  }));
};

// Reduce wallet data to the essentials so AI calls stay lightweight and avoid timeouts.
const buildWalletSnapshotForAi = (walletData: WalletData) => {
  const safeTransactions = Array.isArray(walletData.transactions)
    ? walletData.transactions
    : [];
  const safeUtxos = Array.isArray(walletData.utxos) ? walletData.utxos : [];
  const safeAddresses = Array.isArray(walletData.addresses) ? walletData.addresses : [];

  const recentTransactions = safeTransactions
    .slice(0, 25)
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      btc: tx.btc,
      status: tx.status,
      type: tx.type,
      fee: tx.fee,
      confirmations: tx.confirmations,
      fromAddress: tx.fromAddress?.slice(0, 3).filter(Boolean),
      toAddress: tx.toAddress?.slice(0, 3),
      labels: tx.labels,
    }));

  const utxoSample = safeUtxos
    .slice(0, 50)
    .map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      address: utxo.address,
      value: utxo.value,
    }));

  const addressOverview = safeAddresses
    .slice()
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 20);

  const flowSummary = {
    totalTransactions: safeTransactions.length,
    totalUtxos: safeUtxos.length,
    totalAddresses: safeAddresses.length,
  };

  return {
    balanceBTC: walletData.balanceBTC,
    btcPrice: walletData.btcPrice,
    btcPrices: walletData.btcPrices,
    securityScore: walletData.securityScore,
    opsecThreat: walletData.opsecThreat,
    usedAddressCount: walletData.usedAddressCount,
    dustAmountBTC: walletData.dustAmountBTC,
    dustUtxoCount: walletData.dustUtxoCount,
    averageFeeRate: walletData.averageFeeRate,
    performance: walletData.performance,
    inflowOutflow: walletData.inflowOutflow,
    transactionCount: safeTransactions.length,
    utxoCount: safeUtxos.length,
    counts: flowSummary,
    transactions: recentTransactions,
    utxos: utxoSample,
    addresses: addressOverview,
  };
};

export default function ChatPage() {
  const form = useForm<z.infer<typeof chatSchema>>({
    resolver: zodResolver(chatSchema),
    defaultValues: {
      message: '',
    },
  });

  const { toast } = useToast();
  const { track } = useAnalytics();
  const [isAiLoading, setAiLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { data: walletData, isLoading: isWalletLoading, error: walletError, activeXpub: xpub, messages, setMessages, suggestions: masterSuggestions } = useWallet();
  
  const [placeholder, setPlaceholder] = useState(fallbackSuggestions[0]);
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);
  const suggestionPool = useRef<string[]>([]);

  // Speech Recognition state and ref
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const speechRecognitionRef = useRef<any>(null);


  const updateSuggestions = useCallback(() => {
    const sourceSuggestions = masterSuggestions.length > 0 ? masterSuggestions : fallbackSuggestions;
    
    if (suggestionPool.current.length < 3) {
      suggestionPool.current = [...sourceSuggestions].sort(() => 0.5 - Math.random());
    }

    const newSuggestions = suggestionPool.current.splice(0, 3);
    setDisplayedSuggestions(newSuggestions);
    
    if (sourceSuggestions.length > 0) {
        setPlaceholder(sourceSuggestions[Math.floor(Math.random() * sourceSuggestions.length)]);
    }
  }, [masterSuggestions]);

  useEffect(() => {
    updateSuggestions();
  }, [masterSuggestions, updateSuggestions]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  async function onSubmit(data: z.infer<typeof chatSchema>) {
    if (!walletData || isAiLoading) return;

    const userMessage: Message = { role: 'user', content: data.message };
    const currentHistory = messages;
    setMessages((prev) => [...prev, userMessage]);
    setAiLoading(true);
    form.reset();

    try {
      let assistantMessage: Message;
      const message = data.message.trim();
      const walletDataString = JSON.stringify(buildWalletSnapshotForAi(walletData));
      const historyForAi = sanitizeHistory(currentHistory);
      const isNewsQuery = message.toLowerCase().includes('news');

      if (isNewsQuery) {
          track('ask_ai_chat', { type: 'news_query' });
          const result = await getNews();
          assistantMessage = { role: 'assistant', content: result.news };
      } else if (message.startsWith('/transaction ')) {
          track('ask_ai_chat', { type: 'slash_command', command: 'transaction' });
          const transactionId = message.split(' ')[1];
          if (!transactionId) {
              assistantMessage = { role: 'system', content: 'Please provide a transaction ID after the `/transaction` command.' };
          } else {
              const result = await summarizeTransaction({ transactionId, walletData: walletDataString });
              assistantMessage = { role: 'assistant', content: result.summary };
          }
      } else if (message.startsWith('/address ')) {
          track('ask_ai_chat', { type: 'slash_command', command: 'address' });
          const address = message.split(' ')[1];
          if (!address) {
              assistantMessage = { role: 'system', content: 'Please provide a Bitcoin address after the `/address` command.' };
          } else {
              const result = await summarizeAddress({ address, walletData: walletDataString });
              assistantMessage = { role: 'assistant', content: result.summary };
          }
      } else {
          track('ask_ai_chat', { type: 'question', length: message.length });
          const result = await walletInsightsChat({
              question: data.message,
              walletData: walletDataString,
              history: historyForAi,
          });
          assistantMessage = {
              role: 'assistant',
              content: result.answer,
              chart: result.chart,
          };
      }
      
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        role: 'system',
        content: 'I\'m sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
      updateSuggestions();
    }
  }

  // Use a ref to hold the latest onSubmit function to avoid stale closures.
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  });

  // Speech Recognition setup effect
  useEffect(() => {
    // This runs on the client to check for browser support and set up the API.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop listening after a pause.
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        form.setValue('message', transcript);
        form.handleSubmit(onSubmitRef.current)();
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        let description;

        switch (event.error) {
            case 'network':
                description = 'A network error occurred. This can be due to your connection or the browser\'s speech recognition service being temporarily unavailable. Please try again.';
                break;
            case 'not-allowed':
                description = 'Permission to use the microphone was denied. Please enable it in your browser settings.';
                break;
            case 'service-not-allowed':
                description = 'Speech recognition is not available. Your browser or a browser extension might be blocking it.';
                break;
            case 'no-speech':
                description = 'No speech was detected. Please try again.';
                break;
            case 'aborted':
                // This can happen if the user clicks the mic button again to stop it, so we can ignore it.
                console.log('Speech recognition aborted by user.');
                setIsRecording(false);
                return; // Don't show a toast for this
            default:
                description = `An unexpected error occurred: ${event.error}.`;
        }
        
        toast({
          variant: 'destructive',
          title: 'Speech Recognition Error',
          description: description,
        });
        setIsRecording(false);
      };
      
      speechRecognitionRef.current = recognition;
    } else {
      setIsSpeechSupported(false);
      console.warn("Speech recognition not supported in this browser.");
    }
  // This effect should only run once to initialize the API.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicClick = () => {
    if (!speechRecognitionRef.current) {
      toast({
        variant: 'destructive',
        title: 'Unsupported Feature',
        description: 'Your browser does not support speech recognition.',
      });
      return;
    }
    
    if (isRecording) {
      speechRecognitionRef.current.stop();
    } else {
      form.reset(); // Clear input before starting a new recording.
      speechRecognitionRef.current.start();
    }
  };


  if (!xpub) return <FullPageLoader />;
  if (isWalletLoading) return <FullPageLoader />;
  if (walletError) return <ErrorDisplay message={walletError} />;
  if (!walletData) return <ErrorDisplay message="No wallet data found. Please connect a wallet." />;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex-1 overflow-y-auto px-2 sm:px-4" ref={scrollAreaRef} aria-live="polite">
        <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6 pt-4">
          {messages.map((message, index) => (
            <div key={index} className={cn('flex items-start gap-2 sm:gap-4', message.role === 'user' && 'justify-end')}>
              {message.role === 'assistant' && (
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 border shadow-sm flex-shrink-0">
                    <AvatarFallback><Bot className="h-4 w-4 sm:h-5 sm:w-5 text-foreground"/></AvatarFallback>
                </Avatar>
              )}

              {message.role === 'system' && (
                 <Alert variant="destructive" className="w-full shadow-md" role="alert">
                  <AlertTitle>System Error</AlertTitle>
                  <AlertDescription>{message.content}</AlertDescription>
                 </Alert>
              )}
              
              {message.role !== 'system' && (
                <div
                    className={cn(
                    'max-w-[85%] sm:max-w-[90%] rounded-xl break-words overflow-hidden',
                    message.role === 'user'
                        ? 'rounded-br-none bg-primary text-primary-foreground p-2 sm:p-3'
                        : 'rounded-bl-none'
                    )}
                >
                  <div className={cn(message.role === 'assistant' && 'bg-card border-2 shadow-md rounded-xl p-2 sm:p-3 text-sm sm:text-base')}>
                    <ReactMarkdown
                      components={{
                          p: ({node, ...props}) => <p className="m-0" {...props} />,
                      }}
                    >
                        {message.content}
                    </ReactMarkdown>
                  </div>

                  {message.chart && message.chart.data && message.chart.data.length > 0 && (
                    <div className="mt-2">
                        <AiChart chart={message.chart} />
                    </div>
                  )}
                </div>
              )}
              
              {message.role === 'user' && (
                 <Avatar className="h-6 w-6 sm:h-8 sm:w-8 border shadow-sm flex-shrink-0">
                     <AvatarFallback><User className="h-4 w-4 sm:h-5 sm:w-5 text-foreground"/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isAiLoading && (
            <div className="flex items-start gap-2 sm:gap-4" aria-label="AI is thinking">
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 border shadow-sm flex-shrink-0">
                    <AvatarFallback><Bot className="h-4 w-4 sm:h-5 sm:w-5 text-foreground"/></AvatarFallback>
                </Avatar>
              <div className="flex items-center gap-2 rounded-xl border-2 shadow-md bg-card px-3 py-2 sm:px-4 sm:py-3">
                <CircleDashed className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 bg-background/50 pb-3 sm:pb-4 pt-2 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-2 sm:px-4">
            <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="relative flex w-full items-center gap-1 sm:gap-2"
            >
                <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Chat Message</FormLabel>
                      <FormControl>
                        <Textarea
                        {...field}
                        placeholder={isRecording ? "Listening..." : `e.g., ${placeholder}`}
                        className="min-h-10 sm:min-h-12 resize-none text-sm sm:text-base"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            form.handleSubmit(onSubmit)();
                            }
                        }}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
                <Button
                type="button"
                size="icon"
                onClick={handleMicClick}
                disabled={!isSpeechSupported || isAiLoading}
                className={cn("h-10 w-10 sm:h-10 sm:w-10 shadow-md hover:shadow-lg transition-shadow", isRecording && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
                >
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button type="submit" size="icon" disabled={isAiLoading} aria-label="Send message" className="h-10 w-10 sm:h-10 sm:w-10 shadow-md hover:shadow-lg transition-shadow">
                <SendHorizonal className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </form>
            </Form>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {!isAiLoading && displayedSuggestions.map((suggestion) => (
                    <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="h-auto px-2 sm:px-3 py-1 text-xs text-muted-foreground shadow-sm hover:shadow-md transition-shadow"
                        onClick={() => {
                            form.setValue('message', suggestion);
                            form.setFocus('message');
                        }}
                    >
                        {suggestion}
                    </Button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
