
'use client';

import { useCallback } from 'react';
import { sendGAEvent } from '@next/third-parties/google';

/**
 * A custom hook to provide a function for tracking custom analytics events.
 * It sends events to Google Analytics (GA4) via gtag. If GA is not configured
 * (no measurement ID), gtag is not loaded and these calls are no-ops.
 *
 * @example
 * const { track } = useAnalytics();
 * track('button_click', { button_name: 'primary_cta' });
 */
export function useAnalytics() {
  const track = useCallback((eventName: string, eventParams?: { [key: string]: any }) => {
    try {
      sendGAEvent('event', eventName, eventParams ?? {});
    } catch (error) {
      // Log an error to the console for developers, but don't crash the app.
      console.error(`ANALYTICS: Error logging event '${eventName}':`, error);
    }
  }, []);

  return { track };
}
