'use client';

import * as React from 'react';
import { Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AnalyticsWarning() {
  const [isConfigured, setIsConfigured] = React.useState(true);

  // We check on mount to avoid hydration errors
  React.useEffect(() => {
    setIsConfigured(!!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);
  }, []);

  if (isConfigured) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Analytics Not Configured</AlertTitle>
        <AlertDescription className="font-normal">
            Your Google Analytics measurement ID is missing. To enable analytics, add <code>NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID</code> to the <code>.env</code> file, then restart the development server.
        </AlertDescription>
    </Alert>
  )
}
