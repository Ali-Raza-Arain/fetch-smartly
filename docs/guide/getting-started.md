# Getting Started

## Installation

```bash
npm install fetch-smartly
```

## Quick Start

```typescript
import { fetchWithRetry } from 'fetch-smartly';

const response = await fetchWithRetry({
  url: 'https://api.example.com/data',
  method: 'GET',
  timeout: 5000,
  retry: { maxRetries: 3 },
});

console.log(response.data);    // Parsed JSON or text
console.log(response.status);  // 200
console.log(response.retries); // 0
console.log(response.duration); // 142 (ms)
```

## What Happens Under the Hood

1. **Request** — `fetchWithRetry` calls native `fetch` with an internal `AbortController` for timeout management.
2. **Failure Classification** — If the request fails, the error is classified as `NetworkError`, `TimeoutError`, `HttpError`, or `RateLimitError`.
3. **Retry Decision** — The failure analyzer checks if the error is retryable (5xx, 429, network errors). Client errors like 400/401/404 are **never** retried.
4. **Backoff** — If retrying, the orchestrator computes an exponential delay with jitter, respecting `Retry-After` headers on 429 responses.
5. **Response** — On success, a normalized `SmartFetchResponse` is returned with parsed data, timing, and retry metadata.

## Configuration

```typescript
await fetchWithRetry({
  url: 'https://api.example.com/data',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' }),
  timeout: 10000,
  retry: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    retryOn: [408, 429, 500, 502, 503, 504],
    retryOnNetworkError: true,
  },
  onRetry: (ctx) => {
    console.log(`Retry ${ctx.attempt}/${ctx.maxRetries}, waiting ${ctx.delay}ms`);
  },
  debug: true,
});
```

## Next Steps

- [Error Handling](/guide/error-handling) — Learn about the typed error hierarchy
- [Retry & Backoff](/guide/retry) — Configure retry behavior in detail
- [Circuit Breaker](/guide/circuit-breaker) — Protect against cascading failures
- [API Reference](/guide/api-reference) — Full API documentation
