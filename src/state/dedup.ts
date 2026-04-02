import type { SmartFetchResponse } from '../types/index.js';

/**
 * Generates a deduplication key from a request's method and URL.
 * Only safe (idempotent) methods are eligible for deduplication.
 */
export function getDedupKey(method: string, url: string): string {
  return `${method}:${url}`;
}

/** HTTP methods considered safe for deduplication. */
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Returns whether a request method is eligible for deduplication.
 *
 * @param method - The HTTP method.
 * @returns `true` for GET, HEAD, and OPTIONS.
 */
export function isDedupEligible(method: string): boolean {
  return SAFE_METHODS.has(method);
}

/**
 * Manages in-flight request deduplication.
 *
 * When multiple callers issue the same GET/HEAD/OPTIONS request concurrently,
 * only one actual fetch is executed. All callers share the same response promise.
 * The entry is automatically removed once the request settles (resolves or rejects).
 */
export class DedupManager {
  private readonly inflight = new Map<string, Promise<SmartFetchResponse<unknown>>>();

  /**
   * Returns the number of currently in-flight deduplicated requests.
   * Useful for testing and debugging.
   */
  get size(): number {
    return this.inflight.size;
  }

  /**
   * Checks if a request with the given key is already in flight.
   */
  has(key: string): boolean {
    return this.inflight.has(key);
  }

  /**
   * Returns the in-flight promise for a deduplicated request, if one exists.
   */
  get<T>(key: string): Promise<SmartFetchResponse<T>> | undefined {
    return this.inflight.get(key) as Promise<SmartFetchResponse<T>> | undefined;
  }

  /**
   * Registers an in-flight request. Automatically cleans up when the promise settles.
   *
   * @param key - The dedup key (from `getDedupKey`).
   * @param promise - The request promise to track.
   * @returns The same promise (for chaining convenience).
   */
  track<T>(key: string, promise: Promise<SmartFetchResponse<T>>): Promise<SmartFetchResponse<T>> {
    this.inflight.set(key, promise as Promise<SmartFetchResponse<unknown>>);

    const cleanup = (): void => {
      // Only delete if it's still the same promise (guard against races)
      if (this.inflight.get(key) === (promise as Promise<SmartFetchResponse<unknown>>)) {
        this.inflight.delete(key);
      }
    };

    promise.then(cleanup, cleanup);
    return promise;
  }

  /**
   * Removes all tracked in-flight requests.
   */
  clear(): void {
    this.inflight.clear();
  }
}
