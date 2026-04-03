# Request Deduplication

When multiple parts of your application fetch the same URL simultaneously, fetch-smartly can ensure only one actual network request is made.

## How It Works

The `DedupManager` tracks in-flight requests by a key (`METHOD:URL`). If a second request arrives with the same key while the first is still pending, both callers share the same promise. Once the request settles, the entry is automatically cleaned up.

Only safe (idempotent) methods are eligible: **GET**, **HEAD**, **OPTIONS**. Mutation methods (POST, PUT, PATCH, DELETE) are never deduplicated.

## Usage

```typescript
import { DedupManager, getDedupKey, isDedupEligible, fetchWithRetry } from 'fetch-smartly';

const dedup = new DedupManager();

async function smartFetch(url: string, method = 'GET') {
  if (!isDedupEligible(method)) {
    return fetchWithRetry({ url, method });
  }

  const key = getDedupKey(method, url);
  const existing = dedup.get(key);
  if (existing) return existing;

  return dedup.track(key, fetchWithRetry({ url, method }));
}

// Both resolve with the same response from a single fetch:
const [a, b] = await Promise.all([
  smartFetch('https://api.example.com/users'),
  smartFetch('https://api.example.com/users'),
]);
// a === b → true
```

## API

| Method | Description |
|--------|-------------|
| `dedup.has(key)` | Check if a request is in flight |
| `dedup.get(key)` | Get the in-flight promise |
| `dedup.track(key, promise)` | Register and auto-cleanup a request |
| `dedup.size` | Number of in-flight requests |
| `dedup.clear()` | Remove all tracked entries |
| `getDedupKey(method, url)` | Generate a dedup key |
| `isDedupEligible(method)` | Check if method is safe for dedup |
