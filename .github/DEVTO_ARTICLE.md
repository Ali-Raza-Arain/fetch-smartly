---
title: "Stop Writing Retry Logic for fetch() — Use fetch-smartly Instead"
published: false
description: Zero-dependency, isomorphic HTTP client with intelligent retry, circuit breaker, and offline queue for Node.js and browsers
tags: javascript, typescript, node, opensource
---

# Stop Writing Retry Logic for fetch() — Use fetch-smartly Instead

Every backend and frontend developer has been there. You call `fetch()`, and it works — until it doesn't. The API returns a 503. The network drops. A rate limit hits you with a 429. And `fetch` gives you... a generic error with no classification, no retry, no help.

So you write retry logic. Again. With exponential backoff. And jitter. And timeout handling with `AbortController`. And then you realize you need the same thing in your next project.

I built [fetch-smartly](https://www.npmjs.com/package/fetch-smartly) to fix this once and for all.

## What It Does

```
  Request ──► Timeout Guard ──► fetch() ──► Response Parser
                    │               │
                    │          on failure
                    │               ▼
                    │       Failure Analyzer
                    │        (classify error)
                    │               │
                    │          retryable?
                    │          ▼       ▼
                    │        YES      NO ──► throw
                    │         │
                    │    Backoff Manager
                    │    (delay + jitter)
                    │         │
                    └─── retry loop ◄──┘
```

It wraps native `fetch` with:
- **Intelligent retry** — exponential backoff + jitter, respects Retry-After headers
- **Typed errors** — `NetworkError`, `TimeoutError`, `HttpError`, `RateLimitError`
- **Circuit breaker** — stops hammering a dead server
- **Request deduplication** — concurrent GETs share one fetch
- **Offline queue** — save failed requests, replay when online
- **Zero dependencies** — native Web APIs only

## Quick Start

```typescript
import { fetchWithRetry } from 'fetch-smartly';

const res = await fetchWithRetry({
  url: 'https://api.example.com/data',
  timeout: 5000,
  retry: { maxRetries: 3 },
});

console.log(res.data);    // parsed JSON
console.log(res.retries); // 0
console.log(res.duration); // 142ms
```

## Key Features

- Exponential backoff with full jitter
- Retry-After header respect for 429 responses
- Never retries client errors (400, 401, 403, 404)
- Circuit breaker pattern (open/half-open/closed)
- Request deduplication for concurrent GET/HEAD
- Offline queue with pluggable storage (MemoryStorage, LocalStorageBackend)
- AbortSignal composition (user abort + internal timeout)
- Debug mode with verbose retry logging
- Strict TypeScript, no `any`
- Under 16KB bundled
- Works in Node.js 18+, browsers, Cloudflare Workers, Deno, Bun

## Links

- **npm**: [npmjs.com/package/fetch-smartly](https://www.npmjs.com/package/fetch-smartly)
- **GitHub**: [github.com/Ali-Raza-Arain/fetch-smartly](https://github.com/Ali-Raza-Arain/fetch-smartly)
- **Docs**: [Ali-Raza-Arain.github.io/fetch-smartly](https://Ali-Raza-Arain.github.io/fetch-smartly/)

---

Give it a try and let me know what you think!
