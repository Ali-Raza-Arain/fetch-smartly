/** Supported HTTP methods. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Context passed to the `onRetry` callback and `shouldRetry` predicate. */
export interface RetryContext {
  /** The current attempt number (1-indexed). */
  readonly attempt: number;
  /** Maximum retries allowed. */
  readonly maxRetries: number;
  /** Delay in ms before this retry fires. */
  readonly delay: number;
  /** The error that triggered the retry. */
  readonly error: unknown;
}

/** Configuration for the retry behavior. */
export interface RetryPolicy {
  /** Maximum number of retry attempts. @default 3 */
  readonly maxRetries: number;
  /** Base delay in ms for exponential backoff. @default 1000 */
  readonly baseDelay: number;
  /** Maximum delay cap in ms. @default 30000 */
  readonly maxDelay: number;
  /** Multiplier applied per attempt. @default 2 */
  readonly backoffFactor: number;
  /** Whether to add random jitter to the delay. @default true */
  readonly jitter: boolean;
  /** HTTP status codes that are eligible for retry. @default [408,429,500,502,503,504] */
  readonly retryOn: readonly number[];
  /** Whether to retry on network errors (e.g. DNS failure). @default true */
  readonly retryOnNetworkError: boolean;
  /** Optional user-defined predicate to override retry decisions. */
  readonly shouldRetry?: (context: RetryContext) => boolean;
}

/** Configuration for the circuit breaker. */
export interface CircuitBreakerPolicy {
  /** Whether the circuit breaker is enabled. @default false */
  readonly enabled: boolean;
  /** Number of consecutive failures before the circuit opens. @default 5 */
  readonly failureThreshold: number;
  /** Time in ms before transitioning from open to half-open. @default 30000 */
  readonly resetTimeout: number;
  /** Max requests allowed through in half-open state. @default 1 */
  readonly halfOpenMaxAttempts: number;
}

/**
 * Options for a `smartFetch` call.
 * Extends the native `RequestInit` (excluding `signal`, which is managed internally).
 */
export interface SmartFetchOptions extends Omit<RequestInit, 'signal' | 'method'> {
  /** The URL to fetch. */
  readonly url: string;
  /** HTTP method. @default 'GET' */
  readonly method?: HttpMethod;
  /** Request timeout in ms. @default 10000 */
  readonly timeout?: number;
  /** Retry policy overrides. */
  readonly retry?: Partial<RetryPolicy>;
  /** Circuit breaker policy overrides. */
  readonly circuitBreaker?: Partial<CircuitBreakerPolicy>;
  /** Deduplicate identical in-flight requests. @default true for GET/HEAD */
  readonly deduplicate?: boolean;
  /** User-provided abort signal. Composed with the internal timeout signal. */
  readonly signal?: AbortSignal;
  /** Callback invoked before each retry attempt. */
  readonly onRetry?: (context: RetryContext) => void;
  /** Enable verbose debug logging. @default false */
  readonly debug?: boolean;
}
