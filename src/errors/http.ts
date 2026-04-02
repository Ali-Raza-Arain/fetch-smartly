import type { HttpMethod } from '../types/index.js';
import { SmartFetchError } from './base.js';

/** Default status codes considered retryable. */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 429, 500, 502, 503, 504]);

/** Thrown when the server responds with a non-2xx status code. */
export class HttpError extends SmartFetchError {
  readonly code = 'ERR_HTTP' as const;
  readonly retryable: boolean;

  /** The HTTP status code. */
  readonly status: number;
  /** The HTTP status text. */
  readonly statusText: string;
  /** Response headers from the failed response. */
  readonly headers: Headers;
  /** Raw response body (if available). */
  readonly body: string | null;

  constructor(
    url: string,
    method: HttpMethod,
    status: number,
    statusText: string,
    headers: Headers,
    body: string | null,
  ) {
    super(`HTTP ${status} (${statusText}): ${method} ${url}`, url, method);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.body = body;
    this.retryable = RETRYABLE_STATUSES.has(status);
  }
}
