import { CircuitBreaker, CircuitOpenError } from '../src/state/circuit-breaker.js';

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

describe('CircuitBreaker', () => {
  it('starts in closed state', () => {
    const cb = new CircuitBreaker({ enabled: true });
    expect(cb.getState()).toBe('closed');
    expect(cb.getFailureCount()).toBe(0);
  });

  it('allows requests in closed state', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 3 });
    expect(() => cb.allowRequest('https://example.com', 'GET')).not.toThrow();
  });

  it('stays closed when failures are below threshold', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 3 });
    cb.onFailure();
    cb.onFailure();
    expect(cb.getState()).toBe('closed');
    expect(cb.getFailureCount()).toBe(2);
    expect(() => cb.allowRequest('https://example.com', 'GET')).not.toThrow();
  });

  it('opens after reaching failure threshold', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 3 });
    cb.onFailure();
    cb.onFailure();
    cb.onFailure();
    expect(cb.getState()).toBe('open');
  });

  it('rejects requests when open', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 2 });
    cb.onFailure();
    cb.onFailure();

    expect(() => cb.allowRequest('https://example.com', 'POST'))
      .toThrow(CircuitOpenError);
  });

  it('CircuitOpenError has correct properties', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 1, resetTimeout: 5000 });
    cb.onFailure();

    try {
      cb.allowRequest('https://example.com', 'GET');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitOpenError);
      const e = err as CircuitOpenError;
      expect(e.code).toBe('ERR_CIRCUIT_OPEN');
      expect(e.retryable).toBe(false);
      expect(e.circuitState).toBe('open');
      expect(e.url).toBe('https://example.com');
      expect(e.method).toBe('GET');
      expect(e.resetAt).toBeGreaterThan(0);
    }
  });

  it('transitions from open to half-open after resetTimeout', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 1, resetTimeout: 5000 });
    cb.onFailure();
    expect(cb.getState()).toBe('open');

    jest.advanceTimersByTime(5000);
    expect(cb.getState()).toBe('half-open');
  });

  it('allows limited requests in half-open state', () => {
    const cb = new CircuitBreaker({
      enabled: true,
      failureThreshold: 1,
      resetTimeout: 1000,
      halfOpenMaxAttempts: 1,
    });
    cb.onFailure();
    jest.advanceTimersByTime(1000);

    expect(() => cb.allowRequest('https://example.com', 'GET')).not.toThrow();
    expect(() => cb.allowRequest('https://example.com', 'GET')).toThrow(CircuitOpenError);
  });

  it('closes circuit on success in half-open state', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 1, resetTimeout: 1000 });
    cb.onFailure();
    jest.advanceTimersByTime(1000);
    expect(cb.getState()).toBe('half-open');

    cb.allowRequest('https://example.com', 'GET');
    cb.onSuccess();

    expect(cb.getState()).toBe('closed');
    expect(cb.getFailureCount()).toBe(0);
  });

  it('re-opens circuit on failure in half-open state', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 1, resetTimeout: 1000 });
    cb.onFailure();
    jest.advanceTimersByTime(1000);
    expect(cb.getState()).toBe('half-open');

    cb.allowRequest('https://example.com', 'GET');
    cb.onFailure();

    expect(cb.getState()).toBe('open');
  });

  it('resets failure count on success in closed state', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 3 });
    cb.onFailure();
    cb.onFailure();
    expect(cb.getFailureCount()).toBe(2);

    cb.onSuccess();
    expect(cb.getFailureCount()).toBe(0);
    expect(cb.getState()).toBe('closed');
  });

  it('manual reset returns to closed state', () => {
    const cb = new CircuitBreaker({ enabled: true, failureThreshold: 1, resetTimeout: 10000 });
    cb.onFailure();
    expect(cb.getState()).toBe('open');

    cb.reset();
    expect(cb.getState()).toBe('closed');
    expect(cb.getFailureCount()).toBe(0);
    expect(() => cb.allowRequest('https://example.com', 'GET')).not.toThrow();
  });

  it('full lifecycle: closed → open → half-open → closed', () => {
    const cb = new CircuitBreaker({
      enabled: true,
      failureThreshold: 2,
      resetTimeout: 3000,
      halfOpenMaxAttempts: 1,
    });

    cb.onFailure();
    expect(cb.getState()).toBe('closed');
    cb.onFailure();
    expect(cb.getState()).toBe('open');

    expect(() => cb.allowRequest('u', 'GET')).toThrow(CircuitOpenError);
    jest.advanceTimersByTime(3000);
    expect(cb.getState()).toBe('half-open');

    cb.allowRequest('u', 'GET');
    cb.onSuccess();
    expect(cb.getState()).toBe('closed');

    expect(() => cb.allowRequest('u', 'GET')).not.toThrow();
  });
});
