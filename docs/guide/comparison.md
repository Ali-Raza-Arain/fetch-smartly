# Comparison with Alternatives

## Feature Matrix

| Feature | fetch-smartly | axios | ky | got | ofetch |
|---------|:-:|:-:|:-:|:-:|:-:|
| Zero dependencies | **Yes** | No (6) | No (2) | No (11) | No (4) |
| Native fetch based | **Yes** | No (XMLHttpRequest) | Yes | No (http module) | Yes |
| Isomorphic (Node + Browser) | **Yes** | Yes | Yes | Node only | Yes |
| Edge runtime support | **Yes** | No | Yes | No | Yes |
| TypeScript (strict) | **Yes** | Partial | Yes | Yes | Yes |
| Retry with backoff | **Yes** | Plugin | Yes | Yes | Yes |
| Retry-After header respect | **Yes** | No | No | No | No |
| Circuit breaker | **Yes** | No | No | No | No |
| Request deduplication | **Yes** | No | No | No | No |
| Offline queue | **Yes** | No | No | No | No |
| Typed error hierarchy | **Yes** | Partial | Partial | Yes | Partial |
| AbortController timeout | **Yes** | Yes | Yes | Yes | Yes |
| User signal composition | **Yes** | No | No | No | No |
| Bundle size (min) | ~16KB | ~29KB | ~10KB | Node only | ~12KB |

## When to Choose fetch-smartly

- You need **zero dependencies** and care about supply chain security
- You want **circuit breaker** and **deduplication** built-in, not as separate packages
- You need to work across **Node.js, browsers, and edge runtimes** with one API
- You want **strict TypeScript** with typed errors you can pattern-match on
- You want **Retry-After** header respect for 429 responses out of the box

## When to Choose Something Else

- **axios** — If you need interceptors, request/response transforms, or XMLHttpRequest support for older browsers
- **ky** — If you want a tiny fetch wrapper without retry orchestration or circuit breakers
- **got** — If you're Node.js only and need streams, pagination, or cookie support
- **ofetch** — If you want Nuxt/Nitro integration
