# smart-fetch-pro

Production-grade, zero-dependency, isomorphic HTTP client wrapper around the native `fetch` API. Built with strict TypeScript for Node.js (v18+), browsers, and edge runtimes.

## Features

- **Zero dependencies** — uses only native Web APIs
- **Intelligent retry** — exponential backoff with jitter, `Retry-After` header respect
- **Smart error classification** — typed errors for Network, Timeout, HTTP 4xx/5xx, Rate Limit
- **Circuit breaker** — automatic failure isolation with open/half-open/closed states
- **Request deduplication** — concurrent identical GET/HEAD requests share a single fetch
- **Offline queue** — queue failed requests for replay when connectivity returns
- **Isomorphic** — works in Node.js, browsers, Cloudflare Workers, Deno, Bun
- **Strict TypeScript** — full type safety, no `any`

## Install

```bash
npm install smart-fetch-pro
```

## Quick Start

```ts
import { fetchWithRetry } from 'smart-fetch-pro';

const response = await fetchWithRetry({
  url: 'https://api.example.com/data',
  method: 'GET',
  timeout: 5000,
});

console.log(response.data);   // parsed JSON or text
console.log(response.status); // 200
console.log(response.retries); // 0
```

## API

### `fetchWithRetry<T>(options: SmartFetchOptions): Promise<SmartFetchResponse<T>>`

Primary entry point. Executes a fetch with automatic retry on retryable failures.

### `executeRequest<T>(options: SmartFetchOptions): Promise<SmartFetchResponse<T>>`

Low-level single request (no retry). Use when you want full control over retry logic.

### `SmartFetchOptions`

```ts
{
  url: string;                    // Required
  method?: HttpMethod;            // Default: 'GET'
  timeout?: number;               // Default: 10000 (ms)
  retry?: Partial<RetryPolicy>;   // Retry configuration
  circuitBreaker?: Partial<CircuitBreakerPolicy>;
  deduplicate?: boolean;          // Default: true for GET/HEAD
  signal?: AbortSignal;           // User-provided abort signal
  onRetry?: (ctx: RetryContext) => void;
  debug?: boolean;                // Enable verbose logging
  // ...all native RequestInit options (headers, body, etc.)
}
```

### `RetryPolicy`

```ts
{
  maxRetries: 3,          // Maximum retry attempts
  baseDelay: 1000,        // Base delay in ms
  maxDelay: 30000,        // Max delay cap in ms
  backoffFactor: 2,       // Exponential multiplier
  jitter: true,           // Add randomness to delay
  retryOn: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
  shouldRetry?: (ctx: RetryContext) => boolean,  // Custom override
}
```

### `SmartFetchResponse<T>`

```ts
{
  data: T;              // Parsed response body
  status: number;       // HTTP status code
  statusText: string;
  headers: Headers;
  retries: number;      // Retry attempts before success
  duration: number;     // Total elapsed ms
  ok: boolean;
}
```

## Error Handling

All errors extend `SmartFetchError` and support `instanceof` checks:

```ts
import {
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  HttpError,
  RateLimitError,
} from 'smart-fetch-pro';

try {
  await fetchWithRetry({ url: 'https://api.example.com/data' });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited. Retry after:', error.retryAfter, 'ms');
  } else if (error instanceof TimeoutError) {
    console.log('Timed out after', error.timeout, 'ms');
  } else if (error instanceof HttpError) {
    console.log('HTTP', error.status, error.body);
  } else if (error instanceof NetworkError) {
    console.log('Network failure:', error.message);
  }
}
```

| Error Class | Code | Retryable | Extra Fields |
|---|---|---|---|
| `NetworkError` | `ERR_NETWORK` | Yes | `cause` |
| `TimeoutError` | `ERR_TIMEOUT` | Yes | `timeout` |
| `HttpError` | `ERR_HTTP` | Per status | `status`, `headers`, `body` |
| `RateLimitError` | `ERR_RATE_LIMIT` | Yes | `retryAfter` |
| `CircuitOpenError` | `ERR_CIRCUIT_OPEN` | No | `resetAt` |

## Retry with Callbacks

```ts
await fetchWithRetry({
  url: 'https://api.example.com/data',
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    shouldRetry: (ctx) => {
      // Stop retrying after 3 attempts for specific errors
      return ctx.attempt < 3;
    },
  },
  onRetry: (ctx) => {
    console.log(`Attempt ${ctx.attempt}/${ctx.maxRetries}, waiting ${ctx.delay}ms`);
  },
  debug: true, // Logs retry details to console.debug
});
```

## Circuit Breaker

```ts
import { CircuitBreaker, CircuitOpenError } from 'smart-fetch-pro';

const breaker = new CircuitBreaker({
  enabled: true,
  failureThreshold: 5,   // Open after 5 consecutive failures
  resetTimeout: 30000,    // Try half-open after 30s
  halfOpenMaxAttempts: 1, // Allow 1 probe request
});

// Before each request:
try {
  breaker.allowRequest(url, method);
  const res = await fetchWithRetry({ url });
  breaker.onSuccess();
} catch (error) {
  if (error instanceof CircuitOpenError) {
    console.log('Circuit is open, failing fast');
  } else {
    breaker.onFailure();
  }
}
```

## Request Deduplication

```ts
import { DedupManager, getDedupKey, isDedupEligible } from 'smart-fetch-pro';

const dedup = new DedupManager();

async function deduplicatedFetch(options) {
  const method = options.method ?? 'GET';
  if (!isDedupEligible(method)) {
    return fetchWithRetry(options);
  }

  const key = getDedupKey(method, options.url);
  const inflight = dedup.get(key);
  if (inflight) return inflight;

  return dedup.track(key, fetchWithRetry(options));
}

// These two calls result in only ONE actual fetch:
const [a, b] = await Promise.all([
  deduplicatedFetch({ url: 'https://api.example.com/data' }),
  deduplicatedFetch({ url: 'https://api.example.com/data' }),
]);
```

## Offline Queue

```ts
import { OfflineQueue, MemoryStorage, LocalStorageBackend } from 'smart-fetch-pro';

// Use MemoryStorage (Node) or LocalStorageBackend (Browser)
const queue = new OfflineQueue(new MemoryStorage());

// Enqueue a failed request
queue.enqueue({ url: 'https://api.example.com/submit', method: 'POST', body: '{"data":1}' });

// Replay when back online
const successes = await queue.replay(async (entry) => {
  await fetch(entry.url, {
    method: entry.method,
    headers: entry.headers,
    body: entry.body,
  });
});

console.log(`Replayed ${successes}/${queue.size} requests`);
```

## User Abort

```ts
const controller = new AbortController();

// Cancel after 1 second
setTimeout(() => controller.abort(), 1000);

try {
  await fetchWithRetry({
    url: 'https://api.example.com/slow',
    signal: controller.signal,
  });
} catch (error) {
  // User abort — NOT a TimeoutError
}
```

## License

MIT
