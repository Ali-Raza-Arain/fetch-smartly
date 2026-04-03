# Why smart-fetch?

## The Problem

The native `fetch` API is powerful but bare-bones. In production, HTTP requests fail — servers go down, networks drop, rate limits hit, timeouts expire. Handling all of these correctly means writing the same retry logic, timeout management, and error classification code in every project.

Most developers either:
- **Ignore failures** — leading to silent data loss and broken UIs
- **Use heavyweight libraries** — pulling in dozens of dependencies for features they don't need
- **Roll their own** — reinventing exponential backoff, circuit breakers, and abort signal management every time

## The Solution

smart-fetch wraps the native `fetch` API with production-grade resilience patterns, **zero dependencies**, and full TypeScript support:

- **Intelligent Retry** — Exponential backoff with jitter. Respects `Retry-After` headers. Never retries client errors (400, 401, 404).
- **Typed Errors** — Every failure is a specific error class (`NetworkError`, `TimeoutError`, `HttpError`, `RateLimitError`) with structured metadata and `instanceof` support.
- **Circuit Breaker** — Automatic failure isolation prevents cascading failures. Open → half-open → closed state machine.
- **Request Deduplication** — Concurrent identical GET requests share one fetch call. No wasted bandwidth.
- **Offline Queue** — Queue failed mutations for replay when connectivity returns. Pluggable storage backends.
- **Isomorphic** — Works in Node.js 18+, browsers, Cloudflare Workers, Deno, and Bun.
- **Tiny** — Under 16KB bundled. No bloat.

## Design Principles

1. **Zero dependencies** — Only native Web APIs. No supply chain risk.
2. **Strict TypeScript** — No `any`. Full type safety and autocompletion.
3. **Composable** — Use only the pieces you need. `executeRequest` for single calls, `fetchWithRetry` for retry, `CircuitBreaker` and `DedupManager` as standalone utilities.
4. **No magic** — Explicit configuration over hidden defaults. You control every behavior.
