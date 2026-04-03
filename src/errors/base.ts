import type { HttpMethod } from '../types/index.js';

/**
 * Base error for all fetch-smartly errors.
 * All subclasses carry structured metadata about the failed request.
 */
export abstract class SmartFetchError extends Error {
  /** Machine-readable error code (e.g. `ERR_NETWORK`). */
  abstract readonly code: string;
  /** Whether this error is eligible for automatic retry. */
  abstract readonly retryable: boolean;

  /** Unix timestamp (ms) when the error was created. */
  readonly timestamp: number;
  /** The URL that was being fetched. */
  readonly url: string;
  /** The HTTP method used. */
  readonly method: HttpMethod;

  constructor(message: string, url: string, method: HttpMethod, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SmartFetchError';
    this.timestamp = Date.now();
    this.url = url;
    this.method = method;
  }
}
