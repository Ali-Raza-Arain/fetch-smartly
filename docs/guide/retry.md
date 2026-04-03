# Retry & Backoff

smart-fetch implements a robust retry strategy using exponential backoff with full jitter.

## Default Behavior

```typescript
import { fetchWithRetry } from 'smart-fetch';

// Uses default retry policy: 3 retries, 1s base delay, 2x backoff, jitter enabled
const res = await fetchWithRetry({ url: 'https://api.example.com/data' });
```

**Default retry policy:**

| Option | Default | Description |
|--------|---------|-------------|
| `maxRetries` | `3` | Maximum retry attempts |
| `baseDelay` | `1000` | Base delay in ms |
| `maxDelay` | `30000` | Maximum delay cap in ms |
| `backoffFactor` | `2` | Exponential multiplier |
| `jitter` | `true` | Randomize delay to prevent thundering herd |
| `retryOn` | `[408, 429, 500, 502, 503, 504]` | HTTP status codes to retry |
| `retryOnNetworkError` | `true` | Retry on DNS/connection failures |

## What Gets Retried

| Error Type | Retried? | Reason |
|-----------|----------|--------|
| 500, 502, 503, 504 | Yes | Server errors are often transient |
| 429 (Rate Limit) | Yes | Respects `Retry-After` header |
| 408 (Request Timeout) | Yes | Server-side timeout |
| 400, 401, 403, 404 | **No** | Client errors won't fix themselves on retry |
| Network errors | Yes | DNS failures, connection refused |
| Timeout errors | Yes | Request exceeded configured timeout |
| User abort | **No** | Intentional cancellation |

## Retry-After Header

When a 429 response includes a `Retry-After` header, smart-fetch uses that delay instead of the computed backoff:

```typescript
// If server responds with: Retry-After: 60
// smart-fetch waits 60 seconds (capped at maxDelay)
```

Both numeric seconds and HTTP-date formats are supported.

## Custom Retry Logic

```typescript
await fetchWithRetry({
  url: 'https://api.example.com/data',
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    shouldRetry: (ctx) => {
      // Only retry the first 2 attempts
      return ctx.attempt <= 2;
    },
  },
  onRetry: (ctx) => {
    console.log(`Attempt ${ctx.attempt}, waiting ${ctx.delay}ms`);
  },
});
```

## Backoff Formula

Without jitter: `delay = min(maxDelay, baseDelay * backoffFactor ^ attempt)`

With jitter (full jitter): `delay = random(0, min(maxDelay, baseDelay * backoffFactor ^ attempt))`
