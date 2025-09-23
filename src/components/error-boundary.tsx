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
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message?.includes('Loading chunk') 
                ? 'Loading application resources...' 
                : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
