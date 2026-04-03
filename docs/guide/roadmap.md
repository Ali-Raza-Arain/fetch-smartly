# Roadmap

## Planned Features

### v1.1 — Observability
- Request/response hooks (interceptors)
- Metrics collection (total requests, retries, circuit breaker trips)
- OpenTelemetry trace context propagation

### v1.2 — Advanced Patterns
- Per-host circuit breakers (automatic key derivation)
- Request priority queue
- Concurrency limiter (max N in-flight requests)

### v1.3 — Developer Experience
- `createClient()` factory for shared defaults
- Middleware/plugin system
- Response caching with TTL

### Future Considerations
- Streaming response support
- GraphQL-aware retry (don't retry mutations)
- WebSocket fallback for offline queue sync
- React/Vue hooks for data fetching

## Contributing

Have a feature idea? Open a [Feature Request](https://github.com/Ali-Raza-Arain/fetch-smartly/issues/new?template=feature_request.yml) on GitHub.
