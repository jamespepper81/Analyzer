
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { getPublicKey, nip19, nip04, finalizeEvent, SimplePool } from 'nostr-tools';
import type { Event as NostrEvent } from 'nostr-tools';
import { getWalletData as fetchWalletData, getWalletDataProgressive, type DiscoveryProgress, type PartialWalletData } from '@/lib/blockchain';
import type { WalletData, Message, SecurityRecommendation, NostrProfile, Currency } from '@/lib/types';
import { getProactiveInsight } from '@/ai/flows/proactive-insights';
import { getProactiveSuggestions } from '@/ai/flows/proactive-suggestions';
import { getSecurityRecommendations } from '@/ai/flows/security-recommendations';
import { useAnalytics } from '@/hooks/use-analytics';
import { useChunkRetry } from '@/hooks/use-chunk-retry';
import { useToast } from '@/hooks/use-toast';
import { resetChunkRetry } from '@/lib/chunk-retry-service';
import { logger } from '@/lib/logger';
import { ToastAction } from '@/components/ui/toast';

const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP'];
const RECOMMENDATIONS_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

type WalletState = {
  activeXpub: string | null;
  xpubs: string[];
  data: WalletData | null;
  isLoading: boolean;
  isLoadingAiContent: boolean;
  error: string | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  suggestions: string[];
  recommendations: SecurityRecommendation[];
  setActiveXpub: (xpub: string | null) => void;
  addXpub: (xpub: string) => Promise<{ success: boolean; error: string | null }>;
  removeXpub: (xpub: string) => Promise<void>;
  refetch: () => void;
  disconnect: () => void;
  refreshRecommendations: () => void;
  // Currency state
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  supportedCurrencies: Currency[];
  fiatPrice: number;
  fiatBalance: number;
  currencySymbol: string;
  // Progressive discovery state
  discoveryProgress: DiscoveryProgress | null;
  isDiscovering: boolean;
  // Nostr state
  nostrNpub: string | null;
  nostrProfile: NostrProfile | null;
  isNostrReady: boolean;
  connectNostr: (nsec: string) => Promise<{ success: boolean; error?: string }>;
  loginWithNostr: (nsec: string) => Promise<{ success: boolean; error?: string }>;
  updateNostrProfile: (newProfile: Partial<NostrProfile>) => Promise<{ success: boolean; error?: string }>;
  showSaveXpubsPrompt: boolean;
  setShowSaveXpubsPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  saveXpubsToNostr: () => Promise<{ success: boolean; error?: string }>;
  publishNostrNote: (content: string) => Promise<{ success: boolean; error?: string }>;
};

const WalletContext = createContext<WalletState | undefined>(undefined);

const defaultRelays = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.snort.social',
];


const generateInitialGreetingMessage = (): Message => {
    const hour = new Date().getHours();
    let timeOfDayGreeting;

    if (hour < 12) {
        timeOfDayGreeting = 'Good morning';
    } else if (hour < 18) {
        timeOfDayGreeting = 'Good afternoon';
    } else {
        timeOfDayGreeting = 'Good evening';
    }

    const greetings = [timeOfDayGreeting, 'Hello'];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    return {
        role: 'assistant',
        content: `${randomGreeting}! I'm your BitSleuth AI-powered assistant. Ask me anything about your wallet?`,
    };
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [xpubs, setXpubs] = useState<string[]>([]);
  const [activeXpub, setActiveXpub] = useState<string | null>(null);
  const [data, setData] = useState<WalletState['data']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);
  const [isInitialAiContentLoaded, setIsInitialAiContentLoaded] = useState(false);
  const [isLoadingAiContent, setIsLoadingAiContent] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState<DiscoveryProgress | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { track } = useAnalytics();
  const { toast, dismiss } = useToast();
  const errorToastId = useRef<string | null>(null);
  const errorRetryCount = useRef(0);
  const errorRetryTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Track when we just added/validated an XPUB to prevent duplicate fetches
  const justAddedXpub = useRef<string | null>(null);
  
  // Initialize chunk retry mechanism
  useChunkRetry();
  
  // Currency state
  const [currency, _setCurrency] = useState<Currency>('USD');

  // Nostr state
  const [isNostrReady, setIsNostrReady] = useState(false);
  const [nostrNsec, setNostrNsec] = useState<string | null>(null);
  const [nostrNpub, setNostrNpub] = useState<string | null>(null);
  const [nostrProfile, setNostrProfile] = useState<NostrProfile | null>(null);
  const [showSaveXpubsPrompt, setShowSaveXpubsPrompt] = useState(false);

  const setCurrency = useCallback((newCurrency: Currency) => {
    if (SUPPORTED_CURRENCIES.includes(newCurrency)) {
      _setCurrency(newCurrency);
      localStorage.setItem('currency', newCurrency);
      track('change_currency', { currency: newCurrency });
    }
  }, [track]);

  // This simply signals that we are on the client and can proceed with Nostr logic.
  useEffect(() => {
    setIsNostrReady(true);
  }, []);

  const fetchNostrProfile = useCallback(async (pubkey: string): Promise<NostrProfile | null> => {
    const pool = new SimplePool();
    try {
        const event = await pool.get(defaultRelays, {
            authors: [pubkey],
            kinds: [0],
            limit: 1,
        });

        if (event?.content) {
            const profile = JSON.parse(event.content) as NostrProfile;
            localStorage.setItem('nostr_profile', JSON.stringify(profile));
            return profile;
        }
        return null;
    } catch (e) {
      console.error("Failed to fetch Nostr profile from any relay:", e);
      return null;
    } finally {
        pool.close(defaultRelays);
    }
  }, []);

  const loadXpubsFromNostr = useCallback(async (nsec: string): Promise<string[]> => {
    const pool = new SimplePool();
    try {
        const sk = nip19.decode(nsec).data;
        const pk = getPublicKey(sk as Uint8Array);

        // Fetch the latest kind 4 event from the pool of relays
        const latestEvent = await pool.get(defaultRelays, {
            kinds: [4],
            authors: [pk],
            '#p': [pk],
            limit: 1,
        });

        if (!latestEvent) {
            return [];
        }

        const decryptedContent = await nip04.decrypt(sk as Uint8Array, pk, latestEvent.content);
        const remoteXpubs = JSON.parse(decryptedContent);
        
        if (Array.isArray(remoteXpubs)) {
            return remoteXpubs;
        }
    } catch (e) {
      console.error("Failed to load or decrypt xpubs from Nostr:", e);
    } finally {
        pool.close(defaultRelays);
    }
    return [];
  }, []);
  
  const publishToRelays = async (event: NostrEvent): Promise<boolean> => {
    const pool = new SimplePool();
    try {
        const pubPromise = pool.publish(defaultRelays, event);
        await pubPromise;
        return true;
    } catch(e) {
        console.error("Failed to publish to Nostr relays:", e);
        return false;
    } finally {
        pool.close(defaultRelays);
    }
  };

  const saveXpubsToNostr = useCallback(async (xpubsToSave?: string[]): Promise<{ success: boolean; error?: string }> => {
    const currentXpubs = xpubsToSave ?? xpubs;
    if (!nostrNsec) {
      return { success: false, error: "Nostr not ready." };
    }
    // Allow saving an empty list to clear synced data
    if (xpubsToSave && xpubsToSave.length === 0) {
        console.log("Saving empty xpub list to Nostr.");
    } else if (currentXpubs.length === 0) {
        return { success: false, error: "No xpubs to save." };
    }


    try {
      const sk = nip19.decode(nostrNsec).data as Uint8Array;
      const pk = getPublicKey(sk);

      const plaintext = JSON.stringify(currentXpubs);
      const ciphertext = await nip04.encrypt(sk, pk, plaintext);

      const eventTemplate = {
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', pk]],
        content: ciphertext,
        pubkey: pk,
      };

      const signedEvent = finalizeEvent(eventTemplate, sk);
      
      const success = await publishToRelays(signedEvent);
      
      if (!success) {
        return { success: false, error: "Failed to publish to any Nostr relays." };
      }
      
      localStorage.setItem('nostr_save_preference', 'accepted');
      track('save_xpubs_nostr', { xpub_count: currentXpubs.length });

      return { success: true };
    } catch (e) {
      console.error("Failed to save xpubs to Nostr:", e);
      return { success: false, error: "An unexpected error occurred while saving your xpubs." };
    }
  }, [nostrNsec, xpubs, track]);
  
  const loginWithNostr = useCallback(async (nsec: string): Promise<{ success: boolean; error?: string }> => {
    if (!isNostrReady) {
        return { success: false, error: "Nostr tools not loaded yet. Please try again in a moment." };
    }
    
    try {
        const { type, data: decodedKey } = nip19.decode(nsec);
        if (type !== 'nsec') {
            return { success: false, error: 'Invalid key type. Your key must start with "nsec1".' };
        }
        
        const remoteXpubs = await loadXpubsFromNostr(nsec);

        if (!remoteXpubs || remoteXpubs.length === 0) {
            return { success: false, error: 'No saved wallets were found for this Nostr account. Please connect with an XPUB key first to get started.' };
        }
        
        const publicKeyHex = getPublicKey(decodedKey as Uint8Array);
        const npub = nip19.npubEncode(publicKeyHex);
        
        // Overwrite local state with remote state
        setXpubs(remoteXpubs);
        localStorage.setItem('walletXpubs', JSON.stringify(remoteXpubs));
        
        // Set active xpub
        const newActive = remoteXpubs[0];
        setActiveXpub(newActive);
        localStorage.setItem('activeXpub', newActive);
        
        // Save Nostr session
        setNostrNsec(nsec);
        localStorage.setItem('nostr_nsec', nsec);
        setNostrNpub(npub);
        
        const profile = await fetchNostrProfile(publicKeyHex);
        setNostrProfile(profile);
        
        // Mark preference as accepted since they are logging in this way
        localStorage.setItem('nostr_save_preference', 'accepted');
        track('connect_wallet', { method: 'nostr_login' });
        
        return { success: true };

    } catch (e) {
        return { success: false, error: 'The Nostr private key (nsec) you entered appears to be invalid or malformed. Please double-check the key and try again.' };
    }
  }, [isNostrReady, loadXpubsFromNostr, fetchNostrProfile, setActiveXpub, track]);

  const connectNostr = useCallback(async (nsec: string): Promise<{ success: boolean; error?: string }> => {
    if (!isNostrReady) {
        return { success: false, error: "Nostr tools not loaded yet. Please try again in a moment." };
    }

    try {
      const { type, data: decodedKey } = nip19.decode(nsec);
      if (type !== 'nsec') {
        return { success: false, error: 'Invalid key type. Please provide a Nostr private key (nsec).' };
      }
      const publicKeyHex = getPublicKey(decodedKey as Uint8Array);
      const npub = nip19.npubEncode(publicKeyHex);
      
      const remoteXpubs = await loadXpubsFromNostr(nsec);
      // Use the current state 'xpubs' which is the most up-to-date list of local keys.
      const combined = Array.from(new Set([...xpubs, ...remoteXpubs]));
      
      // Update state and storage if they have changed after merging.
      if (JSON.stringify(combined) !== JSON.stringify(xpubs)) {
        setXpubs(combined);
        localStorage.setItem('walletXpubs', JSON.stringify(combined));
      }
      
      setNostrNsec(nsec);
      localStorage.setItem('nostr_nsec', nsec);
      setNostrNpub(npub);
      
      const profile = await fetchNostrProfile(publicKeyHex);
      setNostrProfile(profile);

      const savePreference = localStorage.getItem('nostr_save_preference');
      // Check if there are any local keys that weren't on the remote
      const hasUnsyncedXpubs = xpubs.some((xpub: string) => !remoteXpubs.includes(xpub));

      if (hasUnsyncedXpubs && savePreference !== 'accepted') {
          setShowSaveXpubsPrompt(true);
      }
      
      track('connect_nostr');
      return { success: true };
    } catch (e) {
      return { success: false, error: 'The Nostr private key (nsec) you entered appears to be invalid or malformed. Please double-check the key and try again.' };
    }
  }, [isNostrReady, fetchNostrProfile, loadXpubsFromNostr, xpubs, track]);

  const updateNostrProfile = useCallback(async (newProfileData: Partial<NostrProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!nostrNsec) {
      return { success: false, error: "Not connected to Nostr. Cannot update profile." };
    }

    try {
      const sk = nip19.decode(nostrNsec).data as Uint8Array;
      const pk = getPublicKey(sk);

      const updatedProfile = { ...nostrProfile, ...newProfileData };

      const eventTemplate = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify(updatedProfile),
        pubkey: pk,
      };

      const signedEvent = finalizeEvent(eventTemplate, sk);
      
      const success = await publishToRelays(signedEvent);

      if (!success) {
          return { success: false, error: 'Failed to publish profile update to any relays.' };
      }

      setNostrProfile(updatedProfile);
      localStorage.setItem('nostr_profile', JSON.stringify(updatedProfile));
      track('update_nostr_profile');
      
      return { success: true };

    } catch (e) {
      console.error("Failed to update Nostr profile:", e);
      return { success: false, error: "An unexpected error occurred while updating your profile." };
    }
  }, [nostrNsec, nostrProfile, track]);

  const publishNostrNote = useCallback(async (content: string): Promise<{ success: boolean; error?: string }> => {
    if (!nostrNsec) {
      return { success: false, error: "Not connected to Nostr." };
    }

    try {
      const sk = nip19.decode(nostrNsec).data as Uint8Array;
      const pk = getPublicKey(sk);

      const eventTemplate = {
        kind: 1, // Standard text note
        created_at: Math.floor(Date.now() / 1000),
        tags: [], // No tags for a simple broadcast
        content: content,
        pubkey: pk,
      };

      const signedEvent = finalizeEvent(eventTemplate, sk);
      const success = await publishToRelays(signedEvent);

      if (!success) {
        return { success: false, error: "Failed to publish note to any Nostr relays." };
      }
      track('publish_nostr_note');
      return { success: true };
    } catch (e) {
      console.error("Failed to publish Nostr note:", e);
      return { success: false, error: "An unexpected error occurred while publishing your note." };
    }
  }, [nostrNsec, track]);

  const disconnectNostr = useCallback(() => {
    setNostrNsec(null);
    setNostrNpub(null);
    setNostrProfile(null);
    try {
      localStorage.removeItem('nostr_nsec');
      localStorage.removeItem('nostr_profile');
      localStorage.removeItem('nostr_save_preference');
    } catch (e) {
      logger.error('Could not access local storage', e);
    }
  }, []);

  useEffect(() => {
    if (!isNostrReady) return;
    
    const init = async () => {
      try {
        const storedCurrency = localStorage.getItem('currency') as Currency;
        if (storedCurrency && SUPPORTED_CURRENCIES.includes(storedCurrency)) {
          _setCurrency(storedCurrency);
        }

        let currentXpubs = JSON.parse(localStorage.getItem('walletXpubs') || '[]');
        const storedNsec = localStorage.getItem('nostr_nsec');

        if (storedNsec) {
            try {
                const { type, data: decodedKey } = nip19.decode(storedNsec);
                if (type === 'nsec') {
                    const publicKeyHex = getPublicKey(decodedKey as Uint8Array);
                    const npub = nip19.npubEncode(publicKeyHex);
                    setNostrNsec(storedNsec);
                    setNostrNpub(npub);
                    
                    const remoteXpubs = await loadXpubsFromNostr(storedNsec);
                    const combined = Array.from(new Set([...currentXpubs, ...remoteXpubs]));
                    currentXpubs = combined;

                    const storedProfile = localStorage.getItem('nostr_profile');
                    if (storedProfile) {
                        setNostrProfile(JSON.parse(storedProfile));
                    } else {
                        fetchNostrProfile(publicKeyHex)
                            .then(setNostrProfile)
                            .catch(e => console.error("Error fetching profile on initial load:", e));
                    }
                } else {
                    disconnectNostr();
                }
            } catch (e) {
                console.error('Failed to decode stored nsec:', e);
                disconnectNostr();
            }
        }
        
        setXpubs(currentXpubs);
        // Persist the merged list back to local storage
        localStorage.setItem('walletXpubs', JSON.stringify(currentXpubs));

        const storedActiveXpub = localStorage.getItem('activeXpub');
        if (storedActiveXpub && currentXpubs.includes(storedActiveXpub)) {
          setActiveXpub(storedActiveXpub);
        } else if (currentXpubs.length > 0) {
          const newActive = currentXpubs[0];
          setActiveXpub(newActive);
          localStorage.setItem('activeXpub', newActive);
        } else {
          setIsLoading(false);
        }

        if (currentXpubs.length > 0) {
            setMessages([generateInitialGreetingMessage()]);
        }
        
        // Reset chunk retry count on successful initialization
        resetChunkRetry();
      } catch (e) {
        logger.error('Could not access local storage', e);
        setIsLoading(false);
      }
    };
    init();
  }, [isNostrReady, fetchNostrProfile, disconnectNostr, loadXpubsFromNostr]);

  const setActiveXpubAndPersist = useCallback((newXpub: string | null) => {
    setActiveXpub(newXpub);
    if (newXpub) {
      localStorage.setItem('activeXpub', newXpub);
      // Load cached data for a smoother UX on account switch
      try {
        const cached = localStorage.getItem(`walletCache:${newXpub}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Validate cached data belongs to this XPUB
          if (parsed._cacheMetadata?.xpub === newXpub) {
            setData(parsed.data || parsed);
          } else {
            console.warn(`[WalletContext] Cache XPUB mismatch on switch, clearing`);
            localStorage.removeItem(`walletCache:${newXpub}`);
            setData(null);
          }
        } else {
          setData(null);
        }
      } catch {
        setData(null);
      }
    } else {
      localStorage.removeItem('activeXpub');
      setData(null);
    }
    setRecommendations([]);
    setMessages([generateInitialGreetingMessage()]);
    setIsInitialAiContentLoaded(false);
    setIsLoadingAiContent(false);
  }, []);

  const addXpub = useCallback(async (newXpub: string): Promise<{ success: boolean; error: string | null }> => {
    if (xpubs.includes(newXpub)) {
      setActiveXpubAndPersist(newXpub);
      return { success: true, error: null };
    }

    // INSTANT CACHE CHECK - Show cached data immediately if available
    let cachedData: WalletData | null = null;
    try {
      const cached = localStorage.getItem(`walletCache:${newXpub}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed._cacheMetadata?.xpub === newXpub) {
          cachedData = parsed.data || parsed;
          console.log(`[WalletContext] Found cached data for wallet, showing immediately`);
        } else {
          console.warn(`[WalletContext] Cache XPUB mismatch, clearing stale cache`);
          localStorage.removeItem(`walletCache:${newXpub}`);
        }
      }
    } catch (e) {
      console.warn(`[WalletContext] Failed to load cached data during addXpub:`, e);
      logger.warn('[WalletContext] Cache read error in addXpub', e);
    }

    // If we have cached data, show it NOW
    if (cachedData) {
      const newXpubs = [...xpubs, newXpub];
      setXpubs(newXpubs);
      localStorage.setItem('walletXpubs', JSON.stringify(newXpubs));
      setData(cachedData);
      setActiveXpubAndPersist(newXpub);
      justAddedXpub.current = newXpub;
      track('connect_wallet', { method: 'xpub_cached' });
      return { success: true, error: null };
    }

    // No cached data - use progressive loading
    console.log(`[WalletContext] Starting progressive discovery for ${newXpub.substring(0, 20)}...`);
    setIsDiscovering(true);
    setDiscoveryProgress(null);
    setIsLoading(true);
    
    const result = await getWalletDataProgressive(newXpub, currency, (partialData: PartialWalletData) => {
      // Real-time UI updates as addresses are discovered!
      console.log(`[WalletContext] Progressive update - ${partialData.discoveryProgress.addressesWithActivity} addresses, ${partialData.transactions.length} txs, ${partialData.balanceBTC} BTC`);
      
      // Update discovery progress
      setDiscoveryProgress(partialData.discoveryProgress);
      
      // Update wallet data with partial results
      // Convert PartialWalletData to WalletData by removing progressive fields
      const { discoveryProgress: _, isComplete: __, ...walletData } = partialData;
      setData(walletData as WalletData);
      
      // If complete, mark as no longer discovering
      if (partialData.isComplete) {
        setIsDiscovering(false);
        setIsLoading(false);
      }
    });
    
    if (result.error) {
      setIsDiscovering(false);
      setIsLoading(false);
      return { success: false, error: result.error };
    }

    // Store the XPUB in our list
    const newXpubs = [...xpubs, newXpub];
    setXpubs(newXpubs);
    localStorage.setItem('walletXpubs', JSON.stringify(newXpubs));
    
    // Final data is already set by the progress callback
    if (result.data) {
      try {
        const cacheEntry = {
          _cacheMetadata: {
            xpub: newXpub,
            timestamp: Date.now(),
          },
          data: result.data,
        };
        localStorage.setItem(`walletCache:${newXpub}`, JSON.stringify(cacheEntry));
      } catch (storageError) {
        logger.warn('[WalletContext] Failed to cache wallet data on add', storageError);
      }
      justAddedXpub.current = newXpub;
    }
    
    setActiveXpubAndPersist(newXpub);
    setIsDiscovering(false);
    setIsLoading(false);

    const savePreference = localStorage.getItem('nostr_save_preference');
    if (nostrNsec && savePreference === 'accepted') {
      saveXpubsToNostr(newXpubs).catch(e => console.error("Failed to auto-save xpubs to Nostr:", e));
    } else if (nostrNsec) {
      setShowSaveXpubsPrompt(true);
    }

    track('connect_wallet', { method: 'xpub_progressive' });
    return { success: true, error: null };
  }, [xpubs, setActiveXpubAndPersist, nostrNsec, saveXpubsToNostr, track, currency]);

  const removeXpub = useCallback(async (xpubToRemove: string) => {
    const newXpubs = xpubs.filter(x => x !== xpubToRemove);
    setXpubs(newXpubs);
    localStorage.setItem('walletXpubs', JSON.stringify(newXpubs));

    if (activeXpub === xpubToRemove) {
      const newActive = newXpubs.length > 0 ? newXpubs[0] : null;
      setActiveXpubAndPersist(newActive);
    }
    
    const savePreference = localStorage.getItem('nostr_save_preference');
    if (nostrNsec && savePreference === 'accepted') {
        saveXpubsToNostr(newXpubs).catch(e => logger.error("Failed to auto-save xpubs to Nostr:", e));
    }
  }, [xpubs, activeXpub, setActiveXpubAndPersist, nostrNsec, saveXpubsToNostr]);

  const disconnect = useCallback(() => {
    setXpubs([]);
    setActiveXpub(null);
    setData(null);
    setSuggestions([]);
    setRecommendations([]);
    setIsInitialAiContentLoaded(false);
    setIsLoadingAiContent(false);
    setMessages([]);
    track('disconnect_wallet');
    try {
      // Clear all wallet-related data from localStorage
      localStorage.removeItem('walletXpubs');
      localStorage.removeItem('activeXpub');
      
      // Clear all cached wallet data to prevent showing wrong wallet's data
      // Iterate through all localStorage keys and remove wallet caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('walletCache:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log(`[WalletContext] Cleared ${keysToRemove.length} wallet cache(s) on disconnect`);
    } catch (e) {
      logger.error('Could not access local storage', e);
    }
    disconnectNostr();
  }, [disconnectNostr, track]);

  const getWalletData = useCallback(async () => {
    if (!activeXpub) {
        setData(null);
        setError(null);
        setIsLoading(false);
        return;
    }

    // If we just added this XPUB, skip the fetch since we already have the data
    // This prevents duplicate fetching during login
    if (justAddedXpub.current === activeXpub) {
      console.log(`[WalletContext] Skipping fetch for ${activeXpub.substring(0, 20)}... - just added, data already loaded`);
      justAddedXpub.current = null; // Clear the flag
      setIsLoading(false);
      return;
    }

    // INSTANT CACHED DATA LOADING
    // Check cache FIRST and show immediately if available
    let hasCachedData = false;
    try {
      const cached = localStorage.getItem(`walletCache:${activeXpub}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // Safety check: Verify cached data belongs to current XPUB
        // The cache includes metadata with the XPUB for validation
        if (parsed._cacheMetadata?.xpub === activeXpub) {
          setData(parsed.data || parsed);
          hasCachedData = true;
          console.log(`[WalletContext] Showing cached wallet data (instant load)`);
          // If we have cached data, show it immediately and mark as not loading
          // We'll still fetch fresh data in the background
          setIsLoading(false);
        } else {
          // Cache mismatch - clear invalid cache
          console.warn(`[WalletContext] Cache XPUB mismatch, clearing stale cache`);
          localStorage.removeItem(`walletCache:${activeXpub}`);
        }
      }
    } catch (e) {
      console.warn(`[WalletContext] Failed to load cached data:`, e);
      logger.warn('[WalletContext] Cache read error in getWalletData', e);
    }
    
    // If no cached data, show loading state
    if (!hasCachedData) {
      setIsLoading(true);
    }
    
    setError(null);
    
    // Fetch fresh data in the background (whether we have cache or not)
    const response = await fetchWalletData(activeXpub, currency);

    if (response.error) {
      // Keep last known good data; do not clear UI on transient errors
      setError(response.error);
    } else if (response.data) {
      setData(response.data);
      try {
        // Store with metadata for validation to prevent showing wrong wallet's data
        const cacheEntry = {
          _cacheMetadata: {
            xpub: activeXpub,
            timestamp: Date.now(),
          },
          data: response.data,
        };
        localStorage.setItem(`walletCache:${activeXpub}`, JSON.stringify(cacheEntry));
      } catch (storageError) {
        logger.warn('[WalletContext] Failed to cache fresh wallet data', storageError);
      }
    }
    
    setIsLoading(false);

  }, [activeXpub, currency]);

  useEffect(() => {
    getWalletData();
  }, [activeXpub, getWalletData]);

  useEffect(() => {
    if (!error || !data) {
      if (errorToastId.current) {
        dismiss(errorToastId.current);
        errorToastId.current = null;
      }
      if (errorRetryTimeout.current) {
        clearTimeout(errorRetryTimeout.current);
        errorRetryTimeout.current = null;
      }
      errorRetryCount.current = 0;
      return;
    }

    const triggerRetry = () => {
      if (errorRetryCount.current >= 3) return;
      errorRetryCount.current += 1;
      getWalletData();
    };

    if (errorToastId.current) {
      dismiss(errorToastId.current);
    }

    const toastResult = toast({
      variant: 'destructive',
      title: 'Wallet needs a refresh',
      description: 'We hit a hiccup reloading your data. We will retry automatically.',
      duration: 8000,
      action: (
        <ToastAction altText="Reload app" onClick={() => window.location.reload()}>
          Refresh now
        </ToastAction>
      ),
    });

    errorToastId.current = toastResult.id;

    if (errorRetryTimeout.current) {
      clearTimeout(errorRetryTimeout.current);
    }
    errorRetryTimeout.current = setTimeout(triggerRetry, 3000);

    const handleVisibility = () => {
      if (!document.hidden) {
        triggerRetry();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (errorRetryTimeout.current) {
        clearTimeout(errorRetryTimeout.current);
        errorRetryTimeout.current = null;
      }
    };
  }, [data, dismiss, error, getWalletData, toast]);

  // Effect for periodically refreshing the fiat price
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const scheduleNext = () => {
      timeoutId = setTimeout(async () => {
        if (!activeXpub || document.hidden) {
          scheduleNext();
          return;
        }
        try {
          const tickerUrl = 'https://blockchain.info/ticker';
          const response = await fetch(tickerUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch ticker data');
          }
          const btcPrices = await response.json();
          
          // Update the price in the main data object to keep it consistent
          setData(prevData => {
            if (!prevData) return null;
            return { ...prevData, btcPrices };
          });
          
        } catch (e) {
          logger.warn("Could not refresh BTC price:", e);
        }
        scheduleNext(); // Schedule the next execution
      }, 60000); // every 60 seconds
    };
    
    scheduleNext();
    
    return () => clearTimeout(timeoutId);
  }, [activeXpub]);

  const refreshRecommendations = useCallback(async () => {
    if (!data || !activeXpub) return;

    const walletSummary = JSON.stringify({
      opsecThreat: data.opsecThreat,
      dustUtxoCount: data.dustUtxoCount,
    });

    const cacheKey = `securityRecommendations:${activeXpub}`;

    let hasCachedRecommendations = false;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          recommendations: SecurityRecommendation[];
          timestamp: number;
          summary: string;
        };

        const isExpired = Date.now() - parsed.timestamp > RECOMMENDATIONS_CACHE_TTL_MS;
        const hasRelevantChanges = parsed.summary !== walletSummary;

        if (!isExpired && !hasRelevantChanges) {
          setRecommendations(parsed.recommendations);
          return;
        }

        // Keep showing cached recommendations while refreshing if possible
        if (parsed.recommendations) {
          setRecommendations(parsed.recommendations);
          hasCachedRecommendations = true;
        }
      }
    } catch (e) {
      logger.warn('Failed to read cached recommendations:', e);
    }

    if (!hasCachedRecommendations) {
      setRecommendations([]);
    }

    try {
      const recommendationsResult = await getSecurityRecommendations({ walletSummary });
      const recs = recommendationsResult.recommendations ?? [];

      setRecommendations(recs);

      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            recommendations: recs,
            timestamp: Date.now(),
            summary: walletSummary,
          }),
        );
      } catch (cacheError) {
        logger.warn('Failed to cache security recommendations:', cacheError);
      }
    } catch (e) {
      logger.error("Failed to refresh security recommendations:", e);
    }
  }, [activeXpub, data]);

  useEffect(() => {
    if (!data || isInitialAiContentLoaded) {
        return;
    }

    // NON-BLOCKING AI CONTENT GENERATION
    // This runs in the background and doesn't block the UI from showing wallet data
    const generateInitialChatContent = async () => {
      setIsLoadingAiContent(true);
      try {
        const summaryPayload = {
          balanceBTC: data.balanceBTC,
          balanceUSD: (data.balanceBTC || 0) * (data.btcPrices?.['USD']?.last || 0),
          transactionCount: data.transactions.length,
          securityScore: data.securityScore,
          opsecThreat: data.opsecThreat,
          usedAddressCount: data.usedAddressCount,
          dustAmountBTC: data.dustAmountBTC,
          dustUtxoCount: data.dustUtxoCount,
          utxoCount: data.utxos.length,
          hasOldTxs: data.transactions.some(tx => new Date(tx.date).getFullYear() < new Date().getFullYear() - 1),
        };

        const insightPayload = { ...summaryPayload, utxos: data.utxos.slice(0, 20), transactions: data.transactions.slice(0, 10).map(tx => ({ fee: tx.fee, btc: tx.btc, date: tx.date })) };
        
        // Run AI flows in parallel and update UI progressively as they complete
        const [insightResult, suggestionsResult] = await Promise.all([
          getProactiveInsight({ walletData: JSON.stringify(insightPayload) }),
          getProactiveSuggestions({ walletSummary: JSON.stringify(summaryPayload) }),
        ]);

        if (insightResult.insight) {
          const insightMessage: Message = { role: 'assistant', content: insightResult.insight };
          setMessages((prev) => [...prev, insightMessage]);
        }
        if (suggestionsResult.suggestions && suggestionsResult.suggestions.length > 0) {
          setSuggestions(suggestionsResult.suggestions);
        }

      } catch (e) {
        console.error("Failed to generate proactive content:", e);
      } finally {
        setIsInitialAiContentLoaded(true);
        setIsLoadingAiContent(false);
      }
    };

    if (messages.length === 0) {
        setMessages([generateInitialGreetingMessage()]);
    }
    
    // Fire and forget - don't await this
    // The UI will show wallet data immediately while AI processes in background
    generateInitialChatContent();
  }, [data, isInitialAiContentLoaded, messages.length]);

  // Derived currency values
  const fiatPrice = data?.btcPrices?.[currency]?.last || 0;
  
  // Map currency codes to actual symbols
  const getCurrencySymbol = (currencyCode: Currency): string => {
    const symbols: Record<Currency, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return symbols[currencyCode] || '$';
  };
  
  const currencySymbol = getCurrencySymbol(currency);
  const fiatBalance = (data?.balanceBTC || 0) * fiatPrice;


  return (
    <WalletContext.Provider value={{
      activeXpub, xpubs, data, isLoading, isLoadingAiContent, error, messages, setMessages, suggestions, recommendations, setActiveXpub: setActiveXpubAndPersist, addXpub, removeXpub, refetch: getWalletData, disconnect, refreshRecommendations, 
      currency, setCurrency, supportedCurrencies: SUPPORTED_CURRENCIES, fiatPrice, fiatBalance, currencySymbol,
      discoveryProgress, isDiscovering,
      nostrNpub, nostrProfile, isNostrReady, connectNostr, loginWithNostr, updateNostrProfile, showSaveXpubsPrompt, setShowSaveXpubsPrompt, saveXpubsToNostr, publishNostrNote
      }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
