import { fetchWithRetry, HttpError, TimeoutError, NetworkError } from './src/index.js';

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

  console.log('\n--- All tests complete ---');
}

main().catch(console.error);
