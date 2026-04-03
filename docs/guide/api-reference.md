# API Reference

## Functions

### `fetchWithRetry<T>(options: SmartFetchOptions): Promise<SmartFetchResponse<T>>`

Primary entry point. Executes an HTTP request with automatic retry on retryable failures.

```typescript
const res = await fetchWithRetry<{ id: number }>({
  url: 'https://api.example.com/data',
  timeout: 5000,
  retry: { maxRetries: 3 },
});
```

### `executeRequest<T>(options: SmartFetchOptions): Promise<SmartFetchResponse<T>>`

Low-level single request with no retry logic. Use when you want full control.

### `isRetryable(error: unknown, policy: RetryPolicy): boolean`

Returns whether an error should be retried given the policy.

### `getServerRetryDelay(error: unknown): number | null`

Extracts `Retry-After` delay from a `RateLimitError`, or returns `null`.

### `computeDelay(attempt: number, policy: RetryPolicy, serverDelay?: number | null): number`

Computes the backoff delay for a given attempt.

### `classifyFailure(error: unknown): string`

Returns a human-readable failure category: `'RATE_LIMIT'`, `'SERVER_ERROR'`, `'CLIENT_ERROR'`, `'TIMEOUT'`, `'NETWORK'`, `'UNKNOWN'`.

### `getDedupKey(method: string, url: string): string`

Generates a deduplication key from method and URL.

### `isDedupEligible(method: string): boolean`

Returns `true` for GET, HEAD, OPTIONS.

---

## Types

### `SmartFetchOptions`

```typescript
interface SmartFetchOptions extends Omit<RequestInit, 'signal' | 'method'> {
  url: string;
  method?: HttpMethod;              // Default: 'GET'
  timeout?: number;                 // Default: 10000 (ms)
  retry?: Partial<RetryPolicy>;
  circuitBreaker?: Partial<CircuitBreakerPolicy>;
  deduplicate?: boolean;            // Default: true for GET/HEAD
  signal?: AbortSignal;
  onRetry?: (context: RetryContext) => void;
  debug?: boolean;                  // Default: false
}
```

### `SmartFetchResponse<T>`

```typescript
interface SmartFetchResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  retries: number;
  duration: number;      // Total ms including retries
  ok: boolean;
}
```

### `RetryPolicy`

```typescript
interface RetryPolicy {
  maxRetries: number;              // Default: 3
  baseDelay: number;               // Default: 1000
  maxDelay: number;                // Default: 30000
  backoffFactor: number;           // Default: 2
  jitter: boolean;                 // Default: true
  retryOn: readonly number[];      // Default: [408, 429, 500, 502, 503, 504]
  retryOnNetworkError: boolean;    // Default: true
  shouldRetry?: (ctx: RetryContext) => boolean;
}
```

### `CircuitBreakerPolicy`

```typescript
interface CircuitBreakerPolicy {
  enabled: boolean;                // Default: false
  failureThreshold: number;        // Default: 5
  resetTimeout: number;            // Default: 30000
  halfOpenMaxAttempts: number;     // Default: 1
}
```

### `RetryContext`

```typescript
interface RetryContext {
  attempt: number;
  maxRetries: number;
  delay: number;
  error: unknown;
}
```

### `HttpMethod`

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

---

## Classes

### `CircuitBreaker`

| Method | Description |
|--------|-------------|
| `new CircuitBreaker(policy?)` | Create with optional config overrides |
| `getState()` | Returns `'closed'`, `'open'`, or `'half-open'` |
| `getFailureCount()` | Consecutive failure count |
| `allowRequest(url, method)` | Throws `CircuitOpenError` if circuit is open |
| `onSuccess()` | Record success, close circuit |
| `onFailure()` | Record failure, may open circuit |
| `reset()` | Force close the circuit |

### `DedupManager`

| Method | Description |
|--------|-------------|
| `has(key)` | Check if a request is in flight |
| `get<T>(key)` | Get the in-flight promise |
| `track<T>(key, promise)` | Register with auto-cleanup |
| `size` | Number of in-flight requests |
| `clear()` | Remove all entries |

### `OfflineQueue`

| Method | Description |
|--------|-------------|
| `new OfflineQueue(storage?)` | Create with optional storage backend |
| `enqueue(options)` | Add a request to the queue |
| `getAll()` | Get all queued entries |
| `size` | Number of queued requests |
| `remove(id)` | Remove a specific entry |
| `replay(executor)` | Replay all, returns success count |
| `clear()` | Remove all entries |

---

## Error Classes

| Class | Code | Retryable | Extra Fields |
|-------|------|-----------|--------------|
| `SmartFetchError` | (abstract) | (abstract) | `url`, `method`, `timestamp` |
| `NetworkError` | `ERR_NETWORK` | Yes | `cause` |
| `TimeoutError` | `ERR_TIMEOUT` | Yes | `timeout` |
| `HttpError` | `ERR_HTTP` | Per status | `status`, `statusText`, `headers`, `body` |
| `RateLimitError` | `ERR_RATE_LIMIT` | Yes | `retryAfter` |
| `CircuitOpenError` | `ERR_CIRCUIT_OPEN` | No | `circuitState`, `resetAt` |

---

## Constants

| Constant | Value |
|----------|-------|
| `DEFAULT_TIMEOUT` | `10000` |
| `DEFAULT_RETRY_POLICY` | See RetryPolicy defaults above |
| `DEFAULT_CIRCUIT_BREAKER_POLICY` | See CircuitBreakerPolicy defaults above |
