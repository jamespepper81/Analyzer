'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { handleChunkError } from '@/lib/chunk-retry-service';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  componentDidMount() {
    // Set up global error listeners for chunk loading errors
    const handleGlobalError = (event: ErrorEvent) => {
      // Skip favicon and other static resource errors
      if (event.filename?.includes('favicon.ico') || 
          event.filename?.includes('.ico') ||
          event.filename?.includes('.png') ||
          event.filename?.includes('.jpg') ||
          event.filename?.includes('.svg')) {
        return;
      }
      
      if (event.error && (
        event.error.message?.includes('Loading chunk') ||
        event.error.name === 'ChunkLoadError' ||
        event.message?.includes('Loading chunk')
      )) {
        handleChunkError(event.error);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && (
        event.reason.message?.includes('Loading chunk') ||
        event.reason.name === 'ChunkLoadError'
      )) {
        handleChunkError(event.reason);
      }
    };

    // Listen for errors
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Store cleanup function
    this.cleanup = () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }

  componentWillUnmount() {
    if (this.cleanup) {
      this.cleanup();
    }
  }

  private cleanup?: () => void;

  public static getDerivedStateFromError(error: Error): State {
    // Don't show fallback UI for chunk loading errors that will be handled by retry service
    if (error.message?.includes('Loading chunk') || 
        error.message?.includes('ChunkLoadError') ||
        error.name === 'ChunkLoadError' ||
        error.message?.includes('Loading CSS chunk') ||
        error.message?.includes('Loading JS chunk')) {
      return { hasError: false, error };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Handle chunk loading errors through centralized service
    if (handleChunkError(error)) {
      return; // Chunk error is being handled, don't show fallback UI
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message?.includes('Loading chunk') 
                ? 'Loading application resources...' 
                : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
