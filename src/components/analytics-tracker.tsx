
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { sendGAEvent } from '@next/third-parties/google';

/**
 * A component that tracks page views for Google Analytics (GA4) on client-side
 * route changes. The initial page view is emitted automatically by the
 * <GoogleAnalytics> component on load, so we skip the first render here to
 * avoid double-counting.
 */
export function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isInitialRender = useRef(true);

    useEffect(() => {
        // The <GoogleAnalytics> component already sends the initial page_view.
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        try {
            const search = searchParams.toString();
            const url = `${pathname}${search ? `?${search}` : ''}`;

            sendGAEvent('event', 'page_view', {
                page_location: window.location.href,
                page_path: url,
                page_title: document.title,
            });
        } catch (error) {
            console.error("ANALYTICS_TRACKER: Error logging page_view event:", error);
        }
    }, [pathname, searchParams]);

    // This component does not render anything to the DOM.
    return null;
}
