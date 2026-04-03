# Social Posts for fetch-smartly

## Reddit r/node and r/javascript

**Title:** The native fetch API has zero resilience built-in — here's a library I built

**Body:**

Every production app needs retry logic, timeout handling, and error classification for HTTP requests. But `fetch` gives you none of that — just a generic error when things fail. You end up writing the same exponential backoff, abort controller timeout, and error parsing code in every project.

I built `fetch-smartly` — a zero-dependency fetch wrapper with intelligent retry, circuit breaker, request deduplication, and offline queue. Full TypeScript, works everywhere (Node 18+, browsers, edge runtimes).

```typescript
import { fetchWithRetry } from 'fetch-smartly';

const res = await fetchWithRetry({
  url: 'https://api.example.com/data',
  timeout: 5000,
  retry: { maxRetries: 3 },
});
```

Features:
- Exponential backoff with jitter, Retry-After header respect
- Never retries 4xx client errors (400, 401, 404)
- Typed error hierarchy (NetworkError, TimeoutError, HttpError, RateLimitError)
- Circuit breaker pattern (open/half-open/closed)
- Request deduplication for concurrent GET requests
- Offline queue with pluggable storage
- Under 16KB bundled, zero dependencies

Links:
- npm: https://www.npmjs.com/package/fetch-smartly
- GitHub: https://github.com/Ali-Raza-Arain/fetch-smartly
- Docs: https://Ali-Raza-Arain.github.io/fetch-smartly/

Would love feedback!

---

## Hacker News (Show HN)

**Title:** Show HN: fetch-smartly — Zero-dep fetch wrapper with retry, circuit breaker, and offline queue

**Body:**

I built a Node.js/browser package that wraps the native fetch API with production-grade resilience — exponential backoff with jitter, Retry-After header respect, circuit breaker, request deduplication, and offline queue. Zero dependencies, strict TypeScript, under 16KB.

npm: https://www.npmjs.com/package/fetch-smartly
GitHub: https://github.com/Ali-Raza-Arain/fetch-smartly

---

## X/Twitter Thread

**Tweet 1:**
Your fetch() calls have zero resilience.

No retry. No timeout. No error classification.

When a server returns 503, you get... a generic error.

I built a fix. Thread

**Tweet 2:**
fetch-smartly: a zero-dependency fetch wrapper with intelligent retry, circuit breaker, and typed errors.

```
npm install fetch-smartly
```

**Tweet 3:**
It supports:
- Exponential backoff with jitter
- Retry-After header respect for 429s
- Circuit breaker (open/half-open/closed)
- Request deduplication for concurrent GETs
- Offline queue with pluggable storage
- Typed errors: NetworkError, TimeoutError, HttpError, RateLimitError

**Tweet 4:**
Try it:

npm: https://npmjs.com/package/fetch-smartly
GitHub: https://github.com/Ali-Raza-Arain/fetch-smartly
Docs: https://Ali-Raza-Arain.github.io/fetch-smartly/

---

## StackOverflow — Target Questions

Search for these questions and answer mentioning fetch-smartly where genuinely helpful:

- "How to retry fetch requests in JavaScript"
- "Exponential backoff with fetch API"
- "How to add timeout to fetch in Node.js"
- "Circuit breaker pattern JavaScript"
- "Handle rate limiting 429 in fetch"
- "Retry-After header handling in JavaScript"
