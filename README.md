<p align="center">
  <img src="https://img.shields.io/npm/v/smart-fetch?style=color=blue&label=smart-fetch" alt="version" />
</p>

<h1 align="center">smart-fetch</h1>

<p align="center">
  <strong>A production-grade fetch wrapper that makes HTTP requests resilient, intelligent, and effortless.</strong><br/>
  Zero-dependency, isomorphic HTTP client with intelligent retry, circuit breaker, and offline queue for Node.js and browsers
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue" alt="typescript" />
  <img src="https://img.shields.io/badge/tests-86%20passed-green" alt="tests" />
  <a href="https://codecov.io/gh/Ali-Raza-Arain/smart-fetch"><img src="https://codecov.io/gh/Ali-Raza-Arain/smart-fetch/branch/main/graph/badge.svg" alt="codecov" /></a>
</p>

---

## The Problem

The native `fetch` API gives you no help when things go wrong. Servers return 503, rate limits hit 429, networks drop, timeouts expire — and `fetch` just throws a generic error. You end up writing the same retry logic, timeout management, and error classification in every project, or pulling in heavyweight libraries with dozens of dependencies.

---

## Why smart-fetch?

- **Zero dependencies** — built entirely on native Web APIs, no supply chain risk
- **Intelligent retry** — exponential backoff with jitter, `Retry-After` header respect, never retries 4xx client errors
- **Typed error hierarchy** — `NetworkError`, `TimeoutError`, `HttpError`, `RateLimitError` with `instanceof` support
- **Circuit breaker** — automatic failure isolation (open/half-open/closed)
- **Request deduplication** — concurrent identical GET/HEAD requests share one fetch
- **Offline queue** — queue failed requests for replay with pluggable storage
- **Isomorphic** — Node.js 18+, browsers, Cloudflare Workers, Deno, Bun
- **Strict TypeScript** — no `any`, full type safety, JSDoc on every export

---

## Table of Contents

- [The Problem](#the-problem)
- [Why smart-fetch?](#why-smart-fetch)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Error Handling](#error-handling)
- [Retry with Callbacks](#retry-with-callbacks)
- [Circuit Breaker](#circuit-breaker)
- [Request Deduplication](#request-deduplication)
- [Offline Queue](#offline-queue)
- [User Abort](#user-abort)
- [Full API Reference](#full-api-reference)
- [Comparison with Alternatives](#comparison-with-alternatives)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [Security](#security)
- [Support](#support)
- [License](#license)

---

## How It Works

```
  Request ──► Timeout Guard ──► fetch() ──► Response Parser
     │              │               │              │
     │              │          on failure           │
     │              │               ▼              │
     │              │       Failure Analyzer        │
     │              │        (classify error)       │
     │              │               │              │
     │              │          retryable?           │
     │              │          ▼       ▼           │
     │              │        YES      NO ──► throw │
     │              │         │                    │
     │              │    Backoff Manager            │
     │              │    (delay + jitter)           │
     │              │         │                    │
     │              └─── retry loop ◄──┘           │
     │                                              │
     └──────────── SmartFetchResponse ◄─────────────┘
```

---

## Installation

```bash
npm install smart-fetch
```

---

## Quick Start

```typescript
import { fetchWithRetry } from 'smart-fetch';

const response = await fetchWithRetry({
  url: 'https://api.example.com/data',
  method: 'GET',
  timeout: 5000,
});

console.log(response.data);    // parsed JSON or text
console.log(response.status);  // 200
console.log(response.retries); // 0
console.log(response.duration); // 142 (ms)
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | *required* | The URL to fetch |
| `method` | `HttpMethod` | `'GET'` | HTTP method |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `retry.maxRetries` | `number` | `3` | Maximum retry attempts |
| `retry.baseDelay` | `number` | `1000` | Base backoff delay in ms |
| `retry.maxDelay` | `number` | `30000` | Maximum delay cap in ms |
| `retry.backoffFactor` | `number` | `2` | Exponential multiplier |
| `retry.jitter` | `boolean` | `true` | Randomize delay |
| `retry.retryOn` | `number[]` | `[408,429,500,502,503,504]` | Status codes to retry |
| `retry.retryOnNetworkError` | `boolean` | `true` | Retry on network failures |
| `retry.shouldRetry` | `function` | `undefined` | Custom retry predicate |
| `signal` | `AbortSignal` | `undefined` | User-provided abort signal |
| `onRetry` | `function` | `undefined` | Callback before each retry |
| `debug` | `boolean` | `false` | Verbose logging |

All native `RequestInit` options (`headers`, `body`, `credentials`, etc.) are also supported.

---

## Error Handling

All errors extend `SmartFetchError` and support `instanceof` checks:

```typescript
import {
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  HttpError,
  RateLimitError,
} from 'smart-fetch';

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

---

## Retry with Callbacks

```typescript
await fetchWithRetry({
  url: 'https://api.example.com/data',
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    shouldRetry: (ctx) => ctx.attempt < 3,
  },
  onRetry: (ctx) => {
    console.log(`Attempt ${ctx.attempt}/${ctx.maxRetries}, waiting ${ctx.delay}ms`);
  },
  debug: true,
});
```

---

## Circuit Breaker

```typescript
import { CircuitBreaker, CircuitOpenError, fetchWithRetry } from 'smart-fetch';

const breaker = new CircuitBreaker({
  enabled: true,
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxAttempts: 1,
});

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

---

## Request Deduplication

```typescript
import { DedupManager, getDedupKey, isDedupEligible, fetchWithRetry } from 'smart-fetch';

const dedup = new DedupManager();

async function deduplicatedFetch(url: string) {
  const key = getDedupKey('GET', url);
  const existing = dedup.get(key);
  if (existing) return existing;
  return dedup.track(key, fetchWithRetry({ url }));
}

// Both resolve with the same response from a single fetch:
const [a, b] = await Promise.all([
  deduplicatedFetch('https://api.example.com/data'),
  deduplicatedFetch('https://api.example.com/data'),
]);
```

---

## Offline Queue

```typescript
import { OfflineQueue, MemoryStorage, LocalStorageBackend } from 'smart-fetch';

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

---

## User Abort

```typescript
const controller = new AbortController();
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

---

## Full API Reference

[View full API docs](https://Ali-Raza-Arain.github.io/smart-fetch/guide/api-reference)

---

## Comparison with Alternatives

| Feature | smart-fetch | axios | ky | got |
|---------|:-:|:-:|:-:|:-:|
| Zero dependencies | **Yes** | No | No | No |
| Native fetch based | **Yes** | No | Yes | No |
| Isomorphic | **Yes** | Yes | Yes | Node only |
| Edge runtime support | **Yes** | No | Yes | No |
| Strict TypeScript | **Yes** | Partial | Yes | Yes |
| Retry with backoff | **Yes** | Plugin | Yes | Yes |
| Retry-After respect | **Yes** | No | No | No |
| Circuit breaker | **Yes** | No | No | No |
| Request deduplication | **Yes** | No | No | No |
| Offline queue | **Yes** | No | No | No |
| Typed error hierarchy | **Yes** | Partial | Partial | Yes |

---

## Running Tests

```bash
npm test
```

86 tests across 6 test suites covering errors, request engine, retry, circuit breaker, deduplication, and offline queue.

---

## Contributing

We welcome contributions! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

Look for issues labeled [`good first issue`](https://github.com/Ali-Raza-Arain/smart-fetch/labels/good%20first%20issue) to get started.

---

## Security

To report vulnerabilities, please see our [Security Policy](SECURITY.md).

---

## Support

If this package helps you, consider supporting its development:

<a href="https://github.com/sponsors/Ali-Raza-Arain">
  <img src="https://img.shields.io/badge/Sponsor_on_GitHub-EA4AAA?style=for-the-badge&logo=github-sponsors&logoColor=white" alt="GitHub Sponsors" />
</a>
<a href="https://buymeacoffee.com/alirazaarain">
  <img src="https://img.shields.io/badge/Buy_Me_a_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee" />
</a>

---

## Contributors

<a href="https://github.com/ali-raza-arain/smart-fetch/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ali-raza-arain/smart-fetch" alt="Contributors" />
</a>

---

## License

[MIT](https://opensource.org/licenses/MIT) — Made by [Ali Raza](https://github.com/Ali-Raza-Arain)
