/**
 * Normalized response returned by `smartFetch`.
 * @typeParam T - The expected shape of the parsed response body.
 */
export interface SmartFetchResponse<T = unknown> {
  /** Parsed response body. */
  readonly data: T;
  /** HTTP status code. */
  readonly status: number;
  /** HTTP status text. */
  readonly statusText: string;
  /** Response headers. */
  readonly headers: Headers;
  /** Number of retry attempts that occurred before success. */
  readonly retries: number;
  /** Total elapsed time in ms (including all retries). */
  readonly duration: number;
  /** Whether the response status was in the 2xx range. */
  readonly ok: boolean;
}
