import type { HttpMethod } from '../types/index.js';
import { SmartFetchError } from './base.js';

/** Thrown when a request fails due to a network-level issue (DNS, connection refused, etc.). */
export class NetworkError extends SmartFetchError {
  readonly code = 'ERR_NETWORK' as const;
  readonly retryable = true;

  constructor(url: string, method: HttpMethod, cause?: unknown) {
    super(`Network error while fetching ${method} ${url}`, url, method, { cause });
    this.name = 'NetworkError';
  }
}
