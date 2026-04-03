# Offline Queue

The offline queue lets you save failed requests and replay them when connectivity is restored.

## Storage Backends

| Backend | Environment | Persistence |
|---------|-------------|-------------|
| `MemoryStorage` | Node.js, Browser, Edge | Lost on process exit |
| `LocalStorageBackend` | Browser | Survives page reloads |
| Custom | Any | Implement `QueueStorage` interface |

## Usage

```typescript
import { OfflineQueue, MemoryStorage, LocalStorageBackend } from 'fetch-smartly';

// Node.js
const queue = new OfflineQueue(new MemoryStorage());

// Browser (persists across reloads)
const queue = new OfflineQueue(new LocalStorageBackend());
```

## Enqueue Failed Requests

```typescript
import { fetchWithRetry, NetworkError } from 'fetch-smartly';

try {
  await fetchWithRetry({ url: 'https://api.example.com/submit', method: 'POST', body: '{"data":1}' });
} catch (error) {
  if (error instanceof NetworkError) {
    queue.enqueue({ url: 'https://api.example.com/submit', method: 'POST', body: '{"data":1}' });
    console.log('Request queued for later');
  }
}
```

## Replay When Online

```typescript
const successes = await queue.replay(async (entry) => {
  const res = await fetch(entry.url, {
    method: entry.method,
    headers: entry.headers,
    body: entry.body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

console.log(`${successes} replayed, ${queue.size} still queued`);
```

Successful entries are removed automatically. Failed entries remain for the next replay attempt.

## Custom Storage

```typescript
import type { QueueStorage, QueueEntry } from 'fetch-smartly';

class RedisStorage implements QueueStorage {
  getAll(): QueueEntry[] { /* ... */ }
  add(entry: QueueEntry): void { /* ... */ }
  remove(id: string): void { /* ... */ }
  clear(): void { /* ... */ }
}

const queue = new OfflineQueue(new RedisStorage());
```

## API

| Method | Description |
|--------|-------------|
| `queue.enqueue(options)` | Add a request to the queue |
| `queue.getAll()` | Get all queued entries |
| `queue.size` | Number of queued requests |
| `queue.remove(id)` | Remove a specific entry |
| `queue.replay(executor)` | Replay all, returns success count |
| `queue.clear()` | Remove all entries |
