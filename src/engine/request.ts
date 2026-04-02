import type { HttpMethod, SmartFetchOptions, SmartFetchResponse } from '../types/index.js';
import { NetworkError } from '../errors/network.js';
import { TimeoutError } from '../errors/timeout.js';
import { HttpError } from '../errors/http.js';
import { RateLimitError } from '../errors/rate-limit.js';
import { DEFAULT_TIMEOUT } from '../policies/defaults.js';

/**
 * Composes an internal timeout signal with an optional user-provided signal.
 * Returns the composed signal and a cleanup function that MUST be called
 * after the request completes to prevent timer leaks.
 */
function createComposedSignal(
  timeout: number,
  userSignal: AbortSignal | undefined,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort('timeout'), timeout);

  // If user provided a signal, forward its abort to our controller
  let onUserAbort: (() => void) | undefined;
  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timerId);
      controller.abort(userSignal.reason);
    } else {
      onUserAbort = () => controller.abort(userSignal.reason);
      userSignal.addEventListener('abort', onUserAbort, { once: true });
    }
  }

  const cleanup = (): void => {
    clearTimeout(timerId);
    if (userSignal && onUserAbort) {
      userSignal.removeEventListener('abort', onUserAbort);
    }
  };

  return { signal: controller.signal, cleanup };
}

/**
 * Classifies a fetch rejection into a typed SmartFetchError.
 * Handles abort (timeout vs user cancel) and generic network failures.
 */
function classifyFetchError(
  error: unknown,
  url: string,
  method: HttpMethod,
  timeout: number,
  signal: AbortSignal,
): never {
  // AbortError — either our timeout or user cancellation
  if (signal.aborted) {
    if (signal.reason === 'timeout') {
      throw new TimeoutError(url, method, timeout);
    }
    // User-initiated abort — re-throw the original error (DOMException)
    throw error;
  }

  throw new NetworkError(url, method, error);
}

/**
 * Executes a single HTTP request with timeout management.
 * Does NOT handle retries — that is the orchestrator's responsibility.
 *
 * @param options - The request configuration.
 * @returns A normalized `SmartFetchResponse`.
 * @throws {TimeoutError} If the request exceeds the configured timeout.
 * @throws {NetworkError} If a network-level failure occurs.
 * @throws {RateLimitError} If the server responds with HTTP 429.
 * @throws {HttpError} If the server responds with any other non-2xx status.
 */
export async function executeRequest<T = unknown>(
  options: SmartFetchOptions,
): Promise<SmartFetchResponse<T>> {
  const {
    url,
    method = 'GET',
    timeout = DEFAULT_TIMEOUT,
    signal: userSignal,
    // Strip custom options so they don't leak into native fetch
    retry: _retry,
    circuitBreaker: _cb,
    deduplicate: _dedup,
    onRetry: _onRetry,
    debug: _debug,
    ...fetchInit
  } = options;

  const startTime = performance.now();
  const { signal, cleanup } = createComposedSignal(timeout, userSignal);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchInit,
      method,
      signal,
    });
  } catch (error: unknown) {
    cleanup();
    classifyFetchError(error, url, method, timeout, signal);
  }

  cleanup();

  // Handle HTTP errors
  if (!response.ok) {
    if (response.status === 429) {
      throw new RateLimitError(url, method, response.headers);
    }

    let body: string | null = null;
    try {
      body = await response.text();
    } catch {
      // Body may be unreadable — that's fine
    }

    throw new HttpError(url, method, response.status, response.statusText, response.headers, body);
  }

  // Parse successful response
  const contentType = response.headers.get('content-type') ?? '';
  let data: T;
  if (contentType.includes('application/json')) {
    data = (await response.json()) as T;
  } else {
    data = (await response.text()) as T;
  }

  const duration = performance.now() - startTime;

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    retries: 0,
    duration,
    ok: true,
  };
}
