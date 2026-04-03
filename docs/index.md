---
layout: home
title: smart-fetch — Intelligent HTTP Client for Node.js & Browsers
titleTemplate: Resilient HTTP Made Effortless

hero:
  name: smart-fetch
  text: Resilient HTTP Made Effortless
  tagline: Zero-dependency, isomorphic HTTP client with intelligent retry, circuit breaker, and offline queue for Node.js and browsers
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Ali-Raza-Arain/smart-fetch
    - theme: alt
      text: npm
      link: https://www.npmjs.com/package/smart-fetch

features:
  - title: Intelligent Retry
    details: Exponential backoff with jitter, Retry-After header respect, and custom retry predicates. Never hammer a struggling server again.
  - title: Circuit Breaker
    details: Automatic failure isolation with open/half-open/closed state machine. Fail fast when a service is down, recover gracefully.
  - title: Request Deduplication
    details: Concurrent identical GET/HEAD requests share a single in-flight fetch. Save bandwidth and reduce server load effortlessly.
  - title: Typed Error Hierarchy
    details: NetworkError, TimeoutError, HttpError, RateLimitError — every failure is classified with instanceof checks and structured metadata.
  - title: Offline Queue
    details: Queue failed requests for replay when connectivity returns. Pluggable storage backends for browser (localStorage) and Node (in-memory).
  - title: Zero Dependencies
    details: Built entirely on native Web APIs. Works in Node.js 18+, browsers, Cloudflare Workers, Deno, and Bun. Under 16KB bundled.
---
