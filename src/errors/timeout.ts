import type { HttpMethod } from '../types/index.js';
import { SmartFetchError } from './base.js';

/** Thrown when a request exceeds the configured timeout duration. */
export class TimeoutError extends SmartFetchError {
  readonly code = 'ERR_TIMEOUT' as const;
  readonly retryable = true;

  /** The timeout duration in ms that was exceeded. */
  readonly timeout: number;

  constructor(url: string, method: HttpMethod, timeout: number) {
    super(`Request timed out after ${timeout}ms: ${method} ${url}`, url, method);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}
