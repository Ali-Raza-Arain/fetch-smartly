// Types
export type {
  HttpMethod,
  RetryContext,
  RetryPolicy,
  CircuitBreakerPolicy,
  SmartFetchOptions,
  SmartFetchResponse,
} from './types/index.js';

// Errors
export {
  SmartFetchError,
  NetworkError,
  TimeoutError,
  HttpError,
  RateLimitError,
} from './errors/index.js';

// Defaults
export {
  DEFAULT_RETRY_POLICY,
  DEFAULT_CIRCUIT_BREAKER_POLICY,
  DEFAULT_TIMEOUT,
} from './policies/defaults.js';

// Engine
export { executeRequest } from './engine/request.js';

// Retry
export { fetchWithRetry } from './retry/orchestrator.js';
export { isRetryable, getServerRetryDelay, classifyFailure } from './retry/analyzer.js';
export { computeDelay } from './retry/backoff.js';

// State
export { DedupManager, getDedupKey, isDedupEligible } from './state/dedup.js';
export { CircuitBreaker, CircuitOpenError } from './state/circuit-breaker.js';
export type { CircuitState } from './state/circuit-breaker.js';
