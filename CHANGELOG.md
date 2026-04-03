# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-04-02

### Added
- Initial release
- Core request engine with native `fetch` wrapper and `AbortController` timeout
- Typed error hierarchy: `NetworkError`, `TimeoutError`, `HttpError`, `RateLimitError`, `CircuitOpenError`
- Intelligent retry with exponential backoff, jitter, and `Retry-After` header respect
- Failure analyzer that classifies errors and prevents retrying 4xx client errors
- Circuit breaker pattern (open/half-open/closed state machine)
- Request deduplication for concurrent GET/HEAD/OPTIONS calls
- Offline queue with pluggable storage backends (`MemoryStorage`, `LocalStorageBackend`)
- Debug mode with verbose retry logging
- Full TypeScript strict mode, zero dependencies
- Isomorphic support for Node.js 18+, browsers, and edge runtimes
- Dual ESM/CJS output with `.d.ts` declarations
