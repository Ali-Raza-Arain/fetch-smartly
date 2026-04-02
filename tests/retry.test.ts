import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../src/retry/orchestrator.js';
import { isRetryable, getServerRetryDelay, classifyFailure } from '../src/retry/analyzer.js';
import { computeDelay } from '../src/retry/backoff.js';
import { NetworkError } from '../src/errors/network.js';
import { TimeoutError } from '../src/errors/timeout.js';
import { HttpError } from '../src/errors/http.js';
import { RateLimitError } from '../src/errors/rate-limit.js';
import { DEFAULT_RETRY_POLICY } from '../src/policies/defaults.js';

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
  });
}

// ─── Analyzer Tests ───

describe('isRetryable', () => {
  const policy = DEFAULT_RETRY_POLICY;

  it('returns true for NetworkError when retryOnNetworkError is true', () => {
    expect(isRetryable(new NetworkError('u', 'GET'), policy)).toBe(true);
  });

  it('returns false for NetworkError when retryOnNetworkError is false', () => {
    expect(isRetryable(new NetworkError('u', 'GET'), { ...policy, retryOnNetworkError: false })).toBe(false);
  });

  it('returns true for TimeoutError', () => {
    expect(isRetryable(new TimeoutError('u', 'GET', 1000), policy)).toBe(true);
  });

  it('returns true for HttpError with retryable status', () => {
    const err = new HttpError('u', 'GET', 503, 'Unavailable', new Headers(), null);
    expect(isRetryable(err, policy)).toBe(true);
  });

  it('returns false for HttpError 400', () => {
    const err = new HttpError('u', 'GET', 400, 'Bad Request', new Headers(), null);
    expect(isRetryable(err, policy)).toBe(false);
  });

  it('returns false for HttpError 401', () => {
    const err = new HttpError('u', 'GET', 401, 'Unauthorized', new Headers(), null);
    expect(isRetryable(err, policy)).toBe(false);
  });

  it('returns false for HttpError 403', () => {
    const err = new HttpError('u', 'GET', 403, 'Forbidden', new Headers(), null);
    expect(isRetryable(err, policy)).toBe(false);
  });

  it('returns false for HttpError 404', () => {
    const err = new HttpError('u', 'GET', 404, 'Not Found', new Headers(), null);
    expect(isRetryable(err, policy)).toBe(false);
  });

  it('returns true for RateLimitError when 429 is in retryOn', () => {
    expect(isRetryable(new RateLimitError('u', 'GET', new Headers()), policy)).toBe(true);
  });

  it('returns false for unknown errors', () => {
    expect(isRetryable(new Error('random'), policy)).toBe(false);
  });
});

describe('getServerRetryDelay', () => {
  it('returns retryAfter from RateLimitError', () => {
    const err = new RateLimitError('u', 'GET', new Headers({ 'retry-after': '5' }));
    expect(getServerRetryDelay(err)).toBe(5000);
  });

  it('returns null for non-RateLimitError', () => {
    expect(getServerRetryDelay(new NetworkError('u', 'GET'))).toBeNull();
  });
});

describe('classifyFailure', () => {
  it('classifies correctly', () => {
    expect(classifyFailure(new RateLimitError('u', 'GET', new Headers()))).toBe('RATE_LIMIT');
    expect(classifyFailure(new HttpError('u', 'GET', 500, '', new Headers(), null))).toBe('SERVER_ERROR');
    expect(classifyFailure(new HttpError('u', 'GET', 400, '', new Headers(), null))).toBe('CLIENT_ERROR');
    expect(classifyFailure(new TimeoutError('u', 'GET', 1000))).toBe('TIMEOUT');
    expect(classifyFailure(new NetworkError('u', 'GET'))).toBe('NETWORK');
    expect(classifyFailure(new Error('x'))).toBe('UNKNOWN');
  });
});

// ─── Backoff Tests ───

describe('computeDelay', () => {
  it('computes exponential backoff without jitter', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, jitter: false, baseDelay: 1000, backoffFactor: 2 };
    expect(computeDelay(0, policy)).toBe(1000);
    expect(computeDelay(1, policy)).toBe(2000);
    expect(computeDelay(2, policy)).toBe(4000);
  });

  it('caps at maxDelay', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, jitter: false, baseDelay: 1000, backoffFactor: 2, maxDelay: 3000 };
    expect(computeDelay(5, policy)).toBe(3000);
  });

  it('applies jitter (result is between 0 and capped delay)', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, jitter: true, baseDelay: 1000, backoffFactor: 2 };
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(computeDelay(0, policy)).toBe(500); // 0.5 * 1000
    vi.restoreAllMocks();
  });

  it('uses server delay when provided', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, jitter: false, baseDelay: 1000 };
    expect(computeDelay(0, policy, 5000)).toBe(5000);
  });

  it('caps server delay at maxDelay', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, jitter: false, maxDelay: 3000 };
    expect(computeDelay(0, policy, 10000)).toBe(3000);
  });
});

// ─── Orchestrator Tests ───

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns on first success without retrying', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await fetchWithRetry({ url: 'https://example.com', retry: { maxRetries: 3 } });
    expect(result.ok).toBe(true);
    expect(result.retries).toBe(0);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('retries on 503 and succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('err', { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const onRetry = vi.fn();
    const promise = fetchWithRetry({
      url: 'https://example.com',
      retry: { maxRetries: 3, jitter: false, baseDelay: 100 },
      onRetry,
    });

    // Advance past the backoff delay
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(result.retries).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry.mock.calls[0]![0]).toMatchObject({ attempt: 1 });
  });

  it('does NOT retry 4xx errors by default', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('bad', { status: 400, statusText: 'Bad Request' }),
    );

    const err = await fetchWithRetry({
      url: 'https://example.com',
      retry: { maxRetries: 3 },
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect(fetch).toHaveBeenCalledOnce(); // no retries
  });

  it('does NOT retry 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('unauth', { status: 401, statusText: 'Unauthorized' }),
    );

    await expect(fetchWithRetry({ url: 'https://example.com', retry: { maxRetries: 3 } }))
      .rejects.toBeInstanceOf(HttpError);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('does NOT retry 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('not found', { status: 404, statusText: 'Not Found' }),
    );

    await expect(fetchWithRetry({ url: 'https://example.com', retry: { maxRetries: 3 } }))
      .rejects.toBeInstanceOf(HttpError);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('throws last error when all retries exhausted', async () => {
    vi.mocked(fetch)
      .mockResolvedValue(new Response('err', { status: 500, statusText: 'ISE' }));

    const promise = fetchWithRetry({
      url: 'https://example.com',
      retry: { maxRetries: 2, jitter: false, baseDelay: 100 },
    }).catch((e: unknown) => e);

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(500);
    const err = await promise;

    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('respects Retry-After header on 429', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response('rate limited', {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '2' }, // 2 seconds
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const onRetry = vi.fn();
    const promise = fetchWithRetry({
      url: 'https://example.com',
      retry: { maxRetries: 3, jitter: false, baseDelay: 100 },
      onRetry,
    });

    // The delay should be 2000ms (from Retry-After), not 100ms (baseDelay)
    await vi.advanceTimersByTimeAsync(2100);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry.mock.calls[0]![0].delay).toBe(2000);
  });

  it('respects shouldRetry override to stop retrying', async () => {
    vi.mocked(fetch)
      .mockResolvedValue(new Response('err', { status: 500, statusText: 'ISE' }));

    const promise = fetchWithRetry({
      url: 'https://example.com',
      retry: {
        maxRetries: 5,
        jitter: false,
        baseDelay: 50,
        shouldRetry: (ctx) => ctx.attempt < 2, // only allow 1 retry
      },
    }).catch((e: unknown) => e);

    // Advance past the first retry delay
    await vi.advanceTimersByTimeAsync(200);
    const err = await promise;

    expect(err).toBeInstanceOf(HttpError);
    expect(fetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry, then shouldRetry returned false
  });

  it('retries on NetworkError', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ recovered: true }));

    const promise = fetchWithRetry({
      url: 'https://example.com',
      retry: { maxRetries: 2, jitter: false, baseDelay: 50 },
    });

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ recovered: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
