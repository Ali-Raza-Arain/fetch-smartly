import type { RetryPolicy } from '../types/index.js';
import { SmartFetchError } from '../errors/base.js';
import { NetworkError } from '../errors/network.js';
import { TimeoutError } from '../errors/timeout.js';
import { HttpError } from '../errors/http.js';
import { RateLimitError } from '../errors/rate-limit.js';

/**
 * Determines whether a failed request should be retried based on the
 * error type and the active retry policy.
 *
 * @param error - The error thrown by `executeRequest`.
 * @param policy - The resolved retry policy.
 * @returns `true` if the request is eligible for retry.
 */
export function isRetryable(error: unknown, policy: RetryPolicy): boolean {
  if (error instanceof RateLimitError) {
    return policy.retryOn.includes(429);
  }

  if (error instanceof HttpError) {
    return policy.retryOn.includes(error.status);
  }

  if (error instanceof NetworkError) {
    return policy.retryOnNetworkError;
  }

  if (error instanceof TimeoutError) {
    return true;
  }

  // Unknown errors (e.g. user-aborted) are never retried
  return false;
}

/**
 * Extracts a server-mandated retry delay from the error, if available.
 * Currently only `RateLimitError` carries a `retryAfter` value.
 *
 * @returns Delay in ms, or `null` if the server didn't specify one.
 */
export function getServerRetryDelay(error: unknown): number | null {
  if (error instanceof RateLimitError) {
    return error.retryAfter;
  }
  return null;
}

/**
 * Classifies an error into a human-readable failure category.
 * Useful for debug logging.
 */
export function classifyFailure(error: unknown): string {
  if (error instanceof RateLimitError) return 'RATE_LIMIT';
  if (error instanceof HttpError) return error.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';
  if (error instanceof TimeoutError) return 'TIMEOUT';
  if (error instanceof NetworkError) return 'NETWORK';
  if (error instanceof SmartFetchError) return 'UNKNOWN_SMART_FETCH';
  return 'UNKNOWN';
}
