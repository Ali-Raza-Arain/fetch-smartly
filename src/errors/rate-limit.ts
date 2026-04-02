import type { HttpMethod } from '../types/index.js';
import { SmartFetchError } from './base.js';

/** Thrown specifically for HTTP 429 (Too Many Requests) responses. */
export class RateLimitError extends SmartFetchError {
  readonly code = 'ERR_RATE_LIMIT' as const;
  readonly retryable = true;

  /** The HTTP status code (always 429). */
  readonly status = 429 as const;
  /** Response headers from the 429 response. */
  readonly headers: Headers;
  /** Parsed `Retry-After` value in ms, or `null` if not present. */
  readonly retryAfter: number | null;

  constructor(url: string, method: HttpMethod, headers: Headers) {
    super(`Rate limited (429): ${method} ${url}`, url, method);
    this.name = 'RateLimitError';
    this.headers = headers;
    this.retryAfter = RateLimitError.parseRetryAfter(headers);
  }

  /** Parses the `Retry-After` header into milliseconds. */
  private static parseRetryAfter(headers: Headers): number | null {
    const value = headers.get('retry-after');
    if (value === null) {
      return null;
    }

    // If it's a number of seconds
    const seconds = Number(value);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    // If it's an HTTP-date
    const date = Date.parse(value);
    if (!Number.isNaN(date)) {
      const delta = date - Date.now();
      return Math.max(0, delta);
    }

    return null;
  }
}
