import type { CircuitBreakerPolicy, HttpMethod } from '../types/index.js';
import { SmartFetchError } from '../errors/base.js';
import { DEFAULT_CIRCUIT_BREAKER_POLICY } from '../policies/defaults.js';

/** The three possible states of a circuit breaker. */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Thrown when a request is rejected because the circuit is open.
 */
export class CircuitOpenError extends SmartFetchError {
  readonly code = 'ERR_CIRCUIT_OPEN' as const;
  readonly retryable = false;

  /** The circuit state at the time of rejection. */
  readonly circuitState: CircuitState;
  /** Timestamp (ms) when the circuit will transition to half-open. */
  readonly resetAt: number;

  constructor(url: string, method: HttpMethod, resetAt: number) {
    super(`Circuit breaker is open: ${method} ${url}`, url, method);
    this.name = 'CircuitOpenError';
    this.circuitState = 'open';
    this.resetAt = resetAt;
  }
}

/**
 * Per-endpoint circuit breaker implementing the closed → open → half-open → closed cycle.
 *
 * - **Closed**: requests flow through normally. Consecutive failures are counted.
 * - **Open**: all requests are immediately rejected with `CircuitOpenError`.
 * - **Half-open**: a limited number of probe requests are allowed through.
 *   If they succeed, the circuit closes. If they fail, it re-opens.
 */
export class CircuitBreaker {
  private readonly policy: CircuitBreakerPolicy;

  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private halfOpenAttempts = 0;

  constructor(policy?: Partial<CircuitBreakerPolicy>) {
    this.policy = { ...DEFAULT_CIRCUIT_BREAKER_POLICY, ...policy };
  }

  /** Returns the current circuit state. */
  getState(): CircuitState {
    // Check if an open circuit should transition to half-open
    if (this.state === 'open' && Date.now() >= this.openedAt + this.policy.resetTimeout) {
      this.state = 'half-open';
      this.halfOpenAttempts = 0;
    }
    return this.state;
  }

  /** Returns the number of consecutive failures recorded. */
  getFailureCount(): number {
    return this.consecutiveFailures;
  }

  /**
   * Checks whether a request is allowed through the circuit.
   * Throws `CircuitOpenError` if the circuit is open and the reset timeout hasn't elapsed.
   *
   * @param url - The request URL (used in the error message).
   * @param method - The HTTP method (used in the error message).
   */
  allowRequest(url: string, method: HttpMethod): void {
    const currentState = this.getState();

    if (currentState === 'open') {
      throw new CircuitOpenError(url, method, this.openedAt + this.policy.resetTimeout);
    }

    if (currentState === 'half-open' && this.halfOpenAttempts >= this.policy.halfOpenMaxAttempts) {
      throw new CircuitOpenError(url, method, this.openedAt + this.policy.resetTimeout);
    }

    if (currentState === 'half-open') {
      this.halfOpenAttempts++;
    }
  }

  /**
   * Records a successful request. Resets the failure count and closes the circuit.
   */
  onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
    this.halfOpenAttempts = 0;
  }

  /**
   * Records a failed request. Increments the failure counter and opens the circuit
   * if the threshold is reached.
   */
  onFailure(): void {
    this.consecutiveFailures++;

    if (this.state === 'half-open') {
      // Any failure in half-open re-opens the circuit
      this.state = 'open';
      this.openedAt = Date.now();
      this.halfOpenAttempts = 0;
      return;
    }

    if (this.consecutiveFailures >= this.policy.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }

  /** Manually resets the circuit to the closed state. */
  reset(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;
    this.openedAt = 0;
  }
}
