import { executeRequest } from '../src/engine/request.js';
import { NetworkError } from '../src/errors/network.js';
import { TimeoutError } from '../src/errors/timeout.js';
import { HttpError } from '../src/errors/http.js';
import { RateLimitError } from '../src/errors/rate-limit.js';

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

const fetchMock = jest.fn<typeof globalThis.fetch>();

beforeEach(() => {
  jest.useFakeTimers();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  fetchMock.mockReset();
});

describe('executeRequest', () => {
  it('should return parsed JSON for a successful response', async () => {
    const payload = { id: 1, name: 'test' };
    fetchMock.mockResolvedValueOnce(mockResponse(payload, { status: 200 }));

    const result = await executeRequest<typeof payload>({ url: 'https://api.example.com/data' });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(payload);
    expect(result.retries).toBe(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should return plain text when content-type is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse('hello world', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );

    const result = await executeRequest<string>({ url: 'https://example.com' });
    expect(result.data).toBe('hello world');
  });

  it('should pass method and headers to fetch', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

    await executeRequest({
      url: 'https://example.com',
      method: 'POST',
      headers: { 'x-custom': 'value' },
      body: JSON.stringify({ key: 'val' }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://example.com');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('x-custom')).toBe('value');
  });

  describe('Timeout', () => {
    it('should throw TimeoutError when request exceeds timeout', async () => {
      fetchMock.mockImplementationOnce((_url: any, init: any) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const promise = executeRequest({ url: 'https://example.com', timeout: 3000 })
        .catch((e: unknown) => e);
      await jest.advanceTimersByTimeAsync(3000);

      const err = await promise;
      expect(err).toBeInstanceOf(TimeoutError);
      expect((err as TimeoutError).timeout).toBe(3000);
    });

    it('should NOT throw TimeoutError if request completes in time', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

      const result = await executeRequest({ url: 'https://example.com', timeout: 5000 });
      expect(result.ok).toBe(true);
    });
  });

  describe('User-provided AbortSignal', () => {
    it('should abort when user signal is triggered', async () => {
      const userController = new AbortController();

      fetchMock.mockImplementationOnce((_url: any, init: any) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const promise = executeRequest({ url: 'https://example.com', signal: userController.signal })
        .catch((e: unknown) => e);
      userController.abort('user cancelled');

      const err = await promise;
      expect(err).not.toBeInstanceOf(TimeoutError);
    });

    it('should reject immediately if user signal is already aborted', async () => {
      fetchMock.mockImplementationOnce((_url: any, init: any) => {
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
      fetchMock.mockResolvedValueOnce(
        mockResponse('Not Found', { status: 404, statusText: 'Not Found', headers: { 'content-type': 'text/plain' } }),
      );

      await expect(executeRequest({ url: 'https://example.com/missing' }))
        .rejects.toBeInstanceOf(HttpError);
    });

    it('should throw HttpError for 5xx', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse('error', { status: 500, statusText: 'Internal Server Error' }),
      );

      const err = await executeRequest({ url: 'https://example.com' }).catch((e: HttpError) => e);
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(500);
      expect(err.retryable).toBe(true);
    });

    it('should throw RateLimitError for 429', async () => {
      fetchMock.mockResolvedValueOnce(
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
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

      const err = await executeRequest({ url: 'https://example.com' }).catch((e: NetworkError) => e);
      expect(err).toBeInstanceOf(NetworkError);
      expect(err.code).toBe('ERR_NETWORK');
      expect(err.cause).toBeInstanceOf(TypeError);
    });
  });

  describe('Timer cleanup', () => {
    it('should not leak timers after successful request', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

      await executeRequest({ url: 'https://example.com', timeout: 5000 });

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should not leak timers after failed request', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('err', { status: 500, statusText: 'ISE' }),
      );

      await executeRequest({ url: 'https://example.com', timeout: 5000 }).catch(() => {});
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
