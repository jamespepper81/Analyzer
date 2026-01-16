/**
 * Simple logging utility that can be controlled by environment variables
 * In production, only errors are logged to console
 * In development, all logs are shown
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  private get isDebugLoginFlow(): boolean {
    // Safe client-side check for environment variable
    if (typeof window !== 'undefined') {
      // On client, use the NEXT_PUBLIC_ prefixed variable
      return process.env.NEXT_PUBLIC_DEBUG_LOGIN_FLOW === 'true';
    }
    // On server, can access any env variable
    return process.env.NEXT_PUBLIC_DEBUG_LOGIN_FLOW === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    return level === 'error' || level === 'warn';
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Login flow specific logging - only logs when DEBUG_LOGIN_FLOW is enabled
   */
  loginFlow(event: string, data?: Record<string, any>): void {
    if (this.isDebugLoginFlow || this.isDevelopment) {
      const timestamp = Date.now();
      const timeStr = new Date(timestamp).toISOString();
      console.log(`[LOGIN_FLOW] ${timeStr} - ${event}`, data || '');
    }
  }
}

export const logger = new Logger();

/**
 * Timer utility for measuring login flow performance
 */
export class LoginFlowTimer {
  private startTime: number = 0;
  private events: Array<{ name: string; timestamp: number; elapsed: number }> = [];

  start(event: string = 'start'): void {
    this.startTime = Date.now();
    this.events = [];
    this.mark(event);
  }

  mark(event: string, data?: Record<string, any>): void {
    const timestamp = Date.now();
    const elapsed = this.startTime ? timestamp - this.startTime : 0;
    this.events.push({ name: event, timestamp, elapsed });
    
    logger.loginFlow(`${event} (+${elapsed}ms)`, data);
  }

  getElapsed(): number {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  getSummary(): string {
    if (this.events.length === 0) return 'No events recorded';
    
    const totalTime = this.events[this.events.length - 1].elapsed;
    const summary = this.events
      .map(e => `  ${e.name}: +${e.elapsed}ms`)
      .join('\n');
    
    return `Login Flow Summary (Total: ${totalTime}ms):\n${summary}`;
  }

  reset(): void {
    this.startTime = 0;
    this.events = [];
  }
}
