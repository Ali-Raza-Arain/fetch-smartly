import {
  fetchWithRetry,
  HttpError,
  TimeoutError,
  NetworkError,
  CircuitBreaker,
  CircuitOpenError,
  DedupManager,
  getDedupKey,
  isDedupEligible,
  OfflineQueue,
  MemoryStorage,
} from './src/index.js';

async function main() {
  // Test 1: Successful JSON GET
  console.log('--- Test 1: Successful GET ---');
  const res = await fetchWithRetry({ url: 'https://jsonplaceholder.typicode.com/posts/1' });
  console.log('Status:', res.status, '| Retries:', res.retries, '| Duration:', Math.round(res.duration), 'ms');
  console.log('Data:', res.data);

  // Test 2: 404 — should NOT retry
  console.log('\n--- Test 2: 404 (no retry) ---');
  try {
    await fetchWithRetry({ url: 'https://jsonplaceholder.typicode.com/posts/99999' });
  } catch (e) {
    if (e instanceof HttpError) console.log('Caught HttpError:', e.status, '| Retryable:', e.retryable);
  }

  // Test 3: Timeout
  console.log('\n--- Test 3: Timeout ---');
  try {
    await fetchWithRetry({
      url: 'https://httpbin.org/delay/10',
      timeout: 2000,
      retry: { maxRetries: 1 },
      onRetry: (ctx) => console.log(`  Retrying (attempt ${ctx.attempt})...`),
    });
  } catch (e) {
    if (e instanceof TimeoutError) console.log('Caught TimeoutError after', e.timeout, 'ms');
  }

  // Test 4: 500 with retries
  console.log('\n--- Test 4: 500 with retries ---');
  try {
    await fetchWithRetry({
      url: 'https://httpbin.org/status/500',
      retry: { maxRetries: 2, baseDelay: 500, jitter: false },
      onRetry: (ctx) => console.log(`  Retry ${ctx.attempt}/${ctx.maxRetries}, delay: ${Math.round(ctx.delay)}ms`),
      debug: true,
    });
  } catch (e) {
    if (e instanceof HttpError) console.log('Exhausted retries. Final status:', e.status);
  }

  // Test 5: Network error (bad domain)
  console.log('\n--- Test 5: Network error ---');
  try {
    await fetchWithRetry({
      url: 'https://this-domain-does-not-exist-12345.com',
      retry: { maxRetries: 1, baseDelay: 200 },
      onRetry: (ctx) => console.log(`  Retrying network error (attempt ${ctx.attempt})...`),
    });
  } catch (e) {
    if (e instanceof NetworkError) console.log('Caught NetworkError:', e.message);
  }

  // Test 6: Request Deduplication
  console.log('\n--- Test 6: Request Deduplication ---');
  const dedup = new DedupManager();
  const url = 'https://jsonplaceholder.typicode.com/posts/2';
  const method = 'GET';

  async function dedupFetch(label: string) {
    const key = getDedupKey(method, url);
    const existing = dedup.get(key);
    if (existing) {
      console.log(`  [${label}] Reusing in-flight request`);
      return existing;
    }
    console.log(`  [${label}] Starting new request`);
    return dedup.track(key, fetchWithRetry({ url, method }));
  }

  const [r1, r2] = await Promise.all([dedupFetch('Caller A'), dedupFetch('Caller B')]);
  console.log(`  Same response? ${r1 === r2} | Status: ${r1.status}`);
  console.log(`  Dedup map size after settle: ${dedup.size}`);

  // Test 7: Circuit Breaker
  console.log('\n--- Test 7: Circuit Breaker ---');
  const breaker = new CircuitBreaker({
    enabled: true,
    failureThreshold: 2,
    resetTimeout: 3000,
    halfOpenMaxAttempts: 1,
  });

  for (let i = 1; i <= 3; i++) {
    try {
      breaker.allowRequest('https://httpbin.org/status/500', 'GET');
      await fetchWithRetry({
        url: 'https://httpbin.org/status/500',
        retry: { maxRetries: 0 },
      });
      breaker.onSuccess();
    } catch (e) {
      if (e instanceof CircuitOpenError) {
        console.log(`  Request ${i}: Circuit OPEN — failed fast (resetAt: ${new Date(e.resetAt).toISOString()})`);
      } else {
        breaker.onFailure();
        console.log(`  Request ${i}: Failed — state is now "${breaker.getState()}" (failures: ${breaker.getFailureCount()})`);
      }
    }
  }

  // Test 8: Offline Queue
  console.log('\n--- Test 8: Offline Queue ---');
  const queue = new OfflineQueue(new MemoryStorage());

  // Simulate queuing two failed requests
  const e1 = queue.enqueue({ url: 'https://jsonplaceholder.typicode.com/posts', method: 'POST', body: '{"title":"queued-1"}' });
  const e2 = queue.enqueue({ url: 'https://this-will-fail-12345.com/api', method: 'POST', body: '{"title":"queued-2"}' });
  console.log(`  Queued ${queue.size} requests: [${e1.id}, ${e2.id}]`);

  // Replay — first will succeed, second will fail
  const successes = await queue.replay(async (entry) => {
    console.log(`  Replaying ${entry.method} ${entry.url}...`);
    const res = await fetch(entry.url, {
      method: entry.method,
      headers: { 'Content-Type': 'application/json', ...entry.headers },
      body: entry.body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });
  console.log(`  Replayed: ${successes} succeeded, ${queue.size} still queued`);

  console.log('\n--- All tests complete ---');
}

main().catch(console.error);
