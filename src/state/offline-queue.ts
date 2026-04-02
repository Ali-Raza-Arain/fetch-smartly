import type { SmartFetchOptions } from '../types/index.js';

/**
 * Abstract storage interface for persisting queued requests.
 * Implement this to provide custom storage backends.
 */
export interface QueueStorage {
  /** Retrieve all queued request entries. */
  getAll(): QueueEntry[];
  /** Append a request to the queue. */
  add(entry: QueueEntry): void;
  /** Remove a specific entry by its ID. */
  remove(id: string): void;
  /** Remove all entries. */
  clear(): void;
}

/** A serializable snapshot of a queued request. */
export interface QueueEntry {
  /** Unique identifier for this queue entry. */
  readonly id: string;
  /** Timestamp (ms) when the request was queued. */
  readonly queuedAt: number;
  /** The URL to fetch. */
  readonly url: string;
  /** HTTP method. */
  readonly method: string;
  /** Serialized headers (plain object). */
  readonly headers: Record<string, string>;
  /** Request body (string or null). */
  readonly body: string | null;
}

/** Generates a simple unique ID. */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * In-memory storage backend. Works in all environments (Node, Browser, Edge).
 * Data is lost when the process exits.
 */
export class MemoryStorage implements QueueStorage {
  private readonly entries: Map<string, QueueEntry> = new Map();

  getAll(): QueueEntry[] {
    return [...this.entries.values()];
  }

  add(entry: QueueEntry): void {
    this.entries.set(entry.id, entry);
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }
}

/**
 * localStorage-based storage backend for browsers.
 * Persists queued requests across page reloads.
 */
export class LocalStorageBackend implements QueueStorage {
  private readonly storageKey: string;

  constructor(storageKey = 'smart-fetch-pro:offline-queue') {
    this.storageKey = storageKey;
  }

  getAll(): QueueEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as QueueEntry[];
    } catch {
      return [];
    }
  }

  add(entry: QueueEntry): void {
    const entries = this.getAll();
    entries.push(entry);
    this.save(entries);
  }

  remove(id: string): void {
    const entries = this.getAll().filter((e) => e.id !== id);
    this.save(entries);
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore if localStorage is unavailable
    }
  }

  private save(entries: QueueEntry[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Converts `SmartFetchOptions` into a serializable `QueueEntry`.
 */
function optionsToEntry(options: SmartFetchOptions): QueueEntry {
  const headers: Record<string, string> = {};
  const init = options.headers;
  if (init) {
    // Handle Headers object, plain object, or array of tuples
    const h = new Headers(init as HeadersInit);
    h.forEach((value, key) => {
      headers[key] = value;
    });
  }

  return {
    id: generateId(),
    queuedAt: Date.now(),
    url: options.url,
    method: options.method ?? 'GET',
    headers,
    body: typeof options.body === 'string' ? options.body : null,
  };
}

/**
 * Manages an offline queue of failed requests that can be replayed
 * when connectivity is restored.
 */
export class OfflineQueue {
  private readonly storage: QueueStorage;

  constructor(storage?: QueueStorage) {
    this.storage = storage ?? new MemoryStorage();
  }

  /** Returns all currently queued entries. */
  getAll(): QueueEntry[] {
    return this.storage.getAll();
  }

  /** Returns the number of queued requests. */
  get size(): number {
    return this.storage.getAll().length;
  }

  /**
   * Enqueues a failed request for later replay.
   *
   * @param options - The original request options.
   * @returns The generated queue entry.
   */
  enqueue(options: SmartFetchOptions): QueueEntry {
    const entry = optionsToEntry(options);
    this.storage.add(entry);
    return entry;
  }

  /**
   * Removes a specific entry from the queue (e.g. after successful replay).
   */
  remove(id: string): void {
    this.storage.remove(id);
  }

  /**
   * Replays all queued requests using the provided executor function.
   * Successfully replayed entries are removed from the queue.
   * Failed entries remain for the next replay attempt.
   *
   * @param executor - A function that executes a request from a queue entry.
   *   Should throw on failure.
   * @returns The number of successfully replayed requests.
   */
  async replay(executor: (entry: QueueEntry) => Promise<void>): Promise<number> {
    const entries = this.storage.getAll();
    let successes = 0;

    for (const entry of entries) {
      try {
        await executor(entry);
        this.storage.remove(entry.id);
        successes++;
      } catch {
        // Leave failed entries in the queue for next replay
      }
    }

    return successes;
  }

  /** Clears all queued entries. */
  clear(): void {
    this.storage.clear();
  }
}
