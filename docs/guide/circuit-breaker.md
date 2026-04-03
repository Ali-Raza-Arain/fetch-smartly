# Circuit Breaker

The circuit breaker pattern prevents your application from repeatedly calling a failing service, giving it time to recover.

## How It Works

```
  ┌─────────┐   failure threshold   ┌────────┐
  │ CLOSED  │ ─────────────────────► │  OPEN  │
  │ (normal)│                        │ (fail  │
  └────┬────┘ ◄───── success ─────── │  fast) │
       │                             └───┬────┘
       │                                 │
       │          resetTimeout           │
       │                                 ▼
       │                           ┌───────────┐
       └────── success ◄────────── │ HALF-OPEN │
                                   │  (probe)  │
               failure ──────────► └───────────┘
                  │                      │
                  └──► back to OPEN ◄────┘
```

- **Closed** — Requests flow normally. Consecutive failures are counted.
- **Open** — All requests immediately fail with `CircuitOpenError`. No network calls.
- **Half-Open** — After `resetTimeout`, a limited number of probe requests are allowed. If they succeed, the circuit closes. If they fail, it re-opens.

## Usage

```typescript
import { CircuitBreaker, CircuitOpenError, fetchWithRetry } from 'smart-fetch';

const breaker = new CircuitBreaker({
  enabled: true,
  failureThreshold: 5,    // Open after 5 consecutive failures
  resetTimeout: 30000,     // Try half-open after 30 seconds
  halfOpenMaxAttempts: 1,  // Allow 1 probe request
});

async function resilientFetch(url: string) {
  try {
    breaker.allowRequest(url, 'GET');
    const res = await fetchWithRetry({ url, retry: { maxRetries: 2 } });
    breaker.onSuccess();
    return res;
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.log('Circuit is open, failing fast until', new Date(error.resetAt));
      throw error;
    }
    breaker.onFailure();
    throw error;
  }
}
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Whether the circuit breaker is active |
| `failureThreshold` | `5` | Consecutive failures before opening |
| `resetTimeout` | `30000` | Ms before transitioning to half-open |
| `halfOpenMaxAttempts` | `1` | Probe requests allowed in half-open |

## Manual Reset

```typescript
breaker.reset(); // Force close the circuit
```
