'use client';

/**
 * Utility functions for handling browser cache issues that can cause chunk loading errors
 */

export function clearBrowserCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear various caches
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB if available
    if ('indexedDB' in window) {
      indexedDB.databases?.().then((databases) => {
        databases.forEach((db) => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
    
    console.log('Browser cache cleared successfully');
  } catch (error) {
    console.warn('Failed to clear browser cache:', error);
  }
}

export function forceReload(): void {
  if (typeof window === 'undefined') return;
  
  // Clear cache first
  clearBrowserCache();
  
  // Force reload with cache bypass
  window.location.reload();
}

export function isChunkLoadingError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || '';
  const name = error.name || '';
  
  return (
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError') ||
    name === 'ChunkLoadError' ||
    message.includes('Loading CSS chunk') ||
    message.includes('Loading JS chunk') ||
    message.includes('timeout:') ||
    message.includes('Failed to fetch')
  );
}

export function getChunkErrorInfo(error: any): { chunkId?: string; url?: string; timeout?: boolean } {
  if (!isChunkLoadingError(error)) return {};
  
  const message = error.message || '';
  const match = message.match(/Loading chunk (\w+)/);
  const urlMatch = message.match(/timeout: (https?:\/\/[^\s)]+)/);
  const timeoutMatch = message.includes('timeout:');
  
  return {
    chunkId: match?.[1],
    url: urlMatch?.[1],
    timeout: timeoutMatch,
  };
}
