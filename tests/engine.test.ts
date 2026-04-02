import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeRequest } from '../src/engine/request.js';
import { NetworkError } from '../src/errors/network.js';
import { TimeoutError } from '../src/errors/timeout.js';
import { HttpError } from '../src/errors/http.js';
import { RateLimitError } from '../src/errors/rate-limit.js';

// Helper to create a mock Response
function mockResponse(
  body: string | object,
  init: ResponseInit & { headers?: Record<string, string> } = {},
): Response {
  const isJson = typeof body === 'object';
  const bodyStr = isJson ? JSON.stringify(body) : body;
  const headers = new Headers(init.headers);
  if (isJson && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return new Response(bodyStr, { ...init, headers });
}

describe('executeRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return parsed JSON for a successful response', async () => {
    const payload = { id: 1, name: 'test' };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse(payload, { status: 200 }));

    const result = await executeRequest<typeof payload>({ url: 'https://api.example.com/data' });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(payload);
    expect(result.retries).toBe(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should return plain text when content-type is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse('hello world', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );

    const result = await executeRequest<string>({ url: 'https://example.com' });
    expect(result.data).toBe('hello world');
  });

  it('should pass method and headers to fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ ok: true }));

    await executeRequest({
      url: 'https://example.com',
      method: 'POST',
      headers: { 'x-custom': 'value' },
      body: JSON.stringify({ key: 'val' }),
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('https://example.com');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('x-custom')).toBe('value');
  });

  describe('Timeout', () => {
    it('should throw TimeoutError when request exceeds timeout', async () => {
      vi.mocked(fetch).mockImplementationOnce((_url, init) => {
        return new Promise((_resolve, reject) => {
          // Simulate fetch respecting the abort signal
          const signal = init?.signal;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const promise = executeRequest({ url: 'https://example.com', timeout: 3000 })
        .catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(3000);

      const err = await promise;
      expect(err).toBeInstanceOf(TimeoutError);
      expect(err).toMatchObject({ timeout: 3000 });
    });

    it('should NOT throw TimeoutError if request completes in time', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ ok: true }));

      const result = await executeRequest({ url: 'https://example.com', timeout: 5000 });
      expect(result.ok).toBe(true);
    });
  });

  describe('User-provided AbortSignal', () => {
    it('should abort when user signal is triggered', async () => {
      const userController = new AbortController();

      vi.mocked(fetch).mockImplementationOnce((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const promise = executeRequest({ url: 'https://example.com', signal: userController.signal });
      userController.abort('user cancelled');

      // Should re-throw the original error, NOT a TimeoutError
      await expect(promise).rejects.toThrow();
      await expect(promise).rejects.not.toBeInstanceOf(TimeoutError);
    });

    it('should reject immediately if user signal is already aborted', async () => {
      vi.mocked(fetch).mockImplementationOnce((_url, init) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
            return;
          }
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const aborted = AbortSignal.abort('already cancelled');
      await expect(executeRequest({ url: 'https://example.com', signal: aborted })).rejects.toThrow();
    });
  });

  describe('HTTP Errors', () => {
    it('should throw HttpError for 4xx', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse('Not Found', { status: 404, statusText: 'Not Found', headers: { 'content-type': 'text/plain' } }),
      );

      await expect(executeRequest({ url: 'https://example.com/missing' }))
        .rejects.toBeInstanceOf(HttpError);
    });

    it('should throw HttpError for 5xx', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse('error', { status: 500, statusText: 'Internal Server Error' }),
      );

      const err = await executeRequest({ url: 'https://example.com' }).catch((e: HttpError) => e);
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(500);
      expect(err.retryable).toBe(true);
    });

    it('should throw RateLimitError for 429', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Too Many Requests', {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '60' },
        }),
      );

      const err = await executeRequest({ url: 'https://example.com' }).catch((e: RateLimitError) => e);
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.retryAfter).toBe(60_000);
    });
  });

  describe('Network Errors', () => {
    it('should throw NetworkError on fetch rejection', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'));

      const err = await executeRequest({ url: 'https://example.com' }).catch((e: NetworkError) => e);
      expect(err).toBeInstanceOf(NetworkError);
      expect(err.code).toBe('ERR_NETWORK');
      expect(err.cause).toBeInstanceOf(TypeError);
    });
  });

  describe('Timer cleanup', () => {
    it('should not leak timers after successful request', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ ok: true }));

      await executeRequest({ url: 'https://example.com', timeout: 5000 });

      // If the timer leaked, advancing would cause unhandled errors
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should not leak timers after failed request', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('err', { status: 500, statusText: 'ISE' }),
      );

      await executeRequest({ url: 'https://example.com', timeout: 5000 }).catch(() => {});
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
