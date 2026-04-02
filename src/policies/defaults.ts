import type { RetryPolicy, CircuitBreakerPolicy } from '../types/index.js';

/** Default retry policy values. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30_000,
  backoffFactor: 2,
  jitter: true,
  retryOn: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
} as const;

/** Default circuit breaker policy values. */
export const DEFAULT_CIRCUIT_BREAKER_POLICY: CircuitBreakerPolicy = {
  enabled: false,
  failureThreshold: 5,
  resetTimeout: 30_000,
  halfOpenMaxAttempts: 1,
} as const;

/** Default request timeout in ms. */
export const DEFAULT_TIMEOUT = 10_000;
