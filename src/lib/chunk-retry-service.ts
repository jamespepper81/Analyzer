'use client';

interface ChunkRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class ChunkRetryService {
  private retryCount = 0;
  private isRetrying = false;
  private config: ChunkRetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  private getRetryKey(): string {
    return 'chunk-retry-count';
  }

  private getRetryCount(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(sessionStorage.getItem(this.getRetryKey()) || '0', 10);
  }

  private setRetryCount(count: number): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.getRetryKey(), count.toString());
  }

  private clearRetryCount(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(this.getRetryKey());
  }

  private calculateDelay(): number {
    const retryCount = this.getRetryCount();
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, retryCount);
    return Math.min(delay, this.config.maxDelay);
  }

  private isChunkError(error: Error | any): boolean {
    if (!error) return false;
    
    const message = error.message || '';
    const name = error.name || '';
    
    return (
      message.includes('Loading chunk') ||
      message.includes('ChunkLoadError') ||
      name === 'ChunkLoadError' ||
      message.includes('Loading CSS chunk') ||
      message.includes('Loading JS chunk')
    );
  }

  public handleChunkError(error: Error | any): boolean {
    if (!this.isChunkError(error)) {
      return false;
    }

    if (this.isRetrying) {
      console.warn('Chunk retry already in progress, ignoring duplicate error');
      return true;
    }

    const retryCount = this.getRetryCount();
    
    if (retryCount >= this.config.maxRetries) {
      console.error('Max chunk retry attempts reached, giving up');
      this.clearRetryCount();
      return true;
    }

    this.isRetrying = true;
    this.setRetryCount(retryCount + 1);
    
    const delay = this.calculateDelay();
    console.warn(`Chunk loading error detected (attempt ${retryCount + 1}/${this.config.maxRetries}), retrying in ${delay}ms...`, error);

    setTimeout(() => {
      this.isRetrying = false;
      window.location.reload();
    }, delay);

    return true;
  }

  public reset(): void {
    this.isRetrying = false;
    this.clearRetryCount();
  }

  public updateConfig(newConfig: Partial<ChunkRetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const chunkRetryService = new ChunkRetryService();

// Export utility functions
export const handleChunkError = (error: Error | any): boolean => {
  return chunkRetryService.handleChunkError(error);
};

export const resetChunkRetry = (): void => {
  chunkRetryService.reset();
};

export const updateChunkRetryConfig = (config: Partial<ChunkRetryConfig>): void => {
  chunkRetryService.updateConfig(config);
};
