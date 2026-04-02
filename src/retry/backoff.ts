import type { RetryPolicy } from '../types/index.js';

/**
 * Computes the delay in ms before the next retry attempt using
 * exponential backoff with optional full jitter.
 *
 * Formula (no jitter): `min(maxDelay, baseDelay * backoffFactor ^ attempt)`
 * Formula (with jitter): `random(0, delay)` (full jitter strategy)
 *
 * @param attempt - The current attempt number (0-indexed: 0 = first retry).
 * @param policy - The resolved retry policy.
 * @param serverDelay - Optional server-mandated delay (e.g. from `Retry-After`).
 *   When present, it takes precedence over the computed backoff but is still
 *   capped at `maxDelay`.
 * @returns Delay in ms.
 */
export function computeDelay(
  attempt: number,
  policy: RetryPolicy,
  serverDelay: number | null = null,
): number {
  // Server-mandated delay takes precedence
  if (serverDelay !== null && serverDelay > 0) {
    return Math.min(serverDelay, policy.maxDelay);
  }

  const exponential = policy.baseDelay * Math.pow(policy.backoffFactor, attempt);
  const capped = Math.min(exponential, policy.maxDelay);

  if (policy.jitter) {
    return Math.random() * capped;
  }

  return capped;
}
