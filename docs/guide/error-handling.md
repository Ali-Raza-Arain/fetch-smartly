# Error Handling

Every error thrown by smart-fetch is a typed class extending `SmartFetchError`. Use `instanceof` to handle each failure case precisely.

## Error Hierarchy

```
Error
 └── SmartFetchError (abstract)
      ├── NetworkError        ERR_NETWORK       (retryable)
      ├── TimeoutError        ERR_TIMEOUT        (retryable)
      ├── HttpError           ERR_HTTP           (retryable per status)
      ├── RateLimitError      ERR_RATE_LIMIT     (retryable)
      └── CircuitOpenError    ERR_CIRCUIT_OPEN   (not retryable)
```

## Usage

```typescript
import {
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  HttpError,
  RateLimitError,
  CircuitOpenError,
} from 'smart-fetch';

try {
  await fetchWithRetry({ url: 'https://api.example.com/data' });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited. Retry after:', error.retryAfter, 'ms');
  } else if (error instanceof TimeoutError) {
    console.log('Timed out after', error.timeout, 'ms');
  } else if (error instanceof HttpError) {
    console.log('HTTP', error.status, error.statusText);
    console.log('Response body:', error.body);
  } else if (error instanceof NetworkError) {
    console.log('Network failure:', error.message);
    console.log('Cause:', error.cause);
  } else if (error instanceof CircuitOpenError) {
    console.log('Circuit open until:', new Date(error.resetAt));
  }
}
```

## Common Properties

All `SmartFetchError` subclasses share these fields:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | Machine-readable error code |
| `retryable` | `boolean` | Whether retry is appropriate |
| `url` | `string` | The request URL |
| `method` | `HttpMethod` | The HTTP method |
| `timestamp` | `number` | When the error was created (ms) |
| `message` | `string` | Human-readable description |
| `cause` | `unknown` | Original error (if applicable) |

## Error-Specific Properties

| Error Class | Extra Properties |
|-------------|-----------------|
| `NetworkError` | `cause` — the underlying `TypeError` |
| `TimeoutError` | `timeout` — the timeout duration in ms |
| `HttpError` | `status`, `statusText`, `headers`, `body` |
| `RateLimitError` | `retryAfter` — parsed `Retry-After` in ms (or `null`) |
| `CircuitOpenError` | `circuitState`, `resetAt` — when the circuit transitions to half-open |
