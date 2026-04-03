import type { SmartFetchOptions, SmartFetchResponse, RetryPolicy, RetryContext } from '../types/index.js';
import { DEFAULT_RETRY_POLICY } from '../policies/defaults.js';
import { executeRequest } from '../engine/request.js';
import { isRetryable, getServerRetryDelay, classifyFailure } from './analyzer.js';
import { computeDelay } from './backoff.js';

/**
 * Merges user-provided partial retry overrides with the default policy.
 */
function resolvePolicy(overrides?: Partial<RetryPolicy>): RetryPolicy {
  if (!overrides) return DEFAULT_RETRY_POLICY;
  return { ...DEFAULT_RETRY_POLICY, ...overrides };
}

/**
 * Returns a promise that resolves after `ms` milliseconds.
 * Respects an optional `AbortSignal` to cancel the wait early.
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    let onAbort: (() => void) | undefined;

    const timerId = setTimeout(() => {
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    if (signal) {
      onAbort = (): void => {
        clearTimeout(timerId);
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Executes an HTTP request with automatic retry logic.
 *
 * Wraps `executeRequest` and re-attempts on retryable failures using
 * exponential backoff with jitter. Respects `Retry-After` headers for
 * 429 responses. Invokes `onRetry` callback before each retry.
 *
 * @param options - The request configuration (same as `executeRequest`).
 * @returns A normalized `SmartFetchResponse` with the `retries` count populated.
 * @throws The last error encountered if all retries are exhausted.
 */
export async function fetchWithRetry<T = unknown>(
  options: SmartFetchOptions,
): Promise<SmartFetchResponse<T>> {
  const policy = resolvePolicy(options.retry);
  const startTime = performance.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      const response = await executeRequest<T>(options);
      // Patch in cumulative duration and retry count
      return {
        ...response,
        retries: attempt,
        duration: performance.now() - startTime,
      };
    } catch (error: unknown) {
      lastError = error;

      // Check if we've exhausted retries
      if (attempt >= policy.maxRetries) {
        break;
      }

      // Check if the error is retryable
      if (!isRetryable(error, policy)) {
        break;
      }

      // Compute delay
      const serverRetryDelay = getServerRetryDelay(error);
      const backoffDelay = computeDelay(attempt, policy, serverRetryDelay);

      // Allow user to override retry decision
      const context: RetryContext = {
        attempt: attempt + 1,
        maxRetries: policy.maxRetries,
        delay: backoffDelay,
        error,
      };

      if (policy.shouldRetry && !policy.shouldRetry(context)) {
        break;
      }

      // Notify caller
      options.onRetry?.(context);

      if (options.debug) {
        const category = classifyFailure(error);
        // eslint-disable-next-line no-console
        console.debug(
          `[fetch-smartly] Retry ${attempt + 1}/${policy.maxRetries} after ${Math.round(backoffDelay)}ms (${category})`,
        );
      }

      // Wait before retrying, respecting user abort signal
      await delay(backoffDelay, options.signal);
    }
  }

  throw lastError;
}
