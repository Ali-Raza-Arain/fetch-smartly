import { describe, it, expect, vi } from 'vitest';
import { OfflineQueue, MemoryStorage } from '../src/state/offline-queue.js';
import type { QueueEntry } from '../src/state/offline-queue.js';

describe('MemoryStorage', () => {
  it('starts empty', () => {
    const s = new MemoryStorage();
    expect(s.getAll()).toEqual([]);
  });

  it('add and getAll', () => {
    const s = new MemoryStorage();
    const entry: QueueEntry = { id: '1', queuedAt: 1000, url: 'https://a.com', method: 'POST', headers: {}, body: '{}' };
    s.add(entry);
    expect(s.getAll()).toEqual([entry]);
  });

  it('remove deletes by id', () => {
    const s = new MemoryStorage();
    s.add({ id: '1', queuedAt: 1000, url: 'u', method: 'GET', headers: {}, body: null });
    s.add({ id: '2', queuedAt: 1001, url: 'u', method: 'GET', headers: {}, body: null });
    s.remove('1');
    expect(s.getAll().length).toBe(1);
    expect(s.getAll()[0]!.id).toBe('2');
  });

  it('clear removes all', () => {
    const s = new MemoryStorage();
    s.add({ id: '1', queuedAt: 1000, url: 'u', method: 'GET', headers: {}, body: null });
    s.clear();
    expect(s.getAll()).toEqual([]);
  });
});

describe('OfflineQueue', () => {
  it('enqueues a request and tracks it', () => {
    const q = new OfflineQueue();
    const entry = q.enqueue({ url: 'https://api.example.com/data', method: 'POST', body: '{"key":"val"}' });

    expect(entry.url).toBe('https://api.example.com/data');
    expect(entry.method).toBe('POST');
    expect(entry.body).toBe('{"key":"val"}');
    expect(entry.id).toBeTruthy();
    expect(entry.queuedAt).toBeGreaterThan(0);
    expect(q.size).toBe(1);
  });

  it('defaults method to GET', () => {
    const q = new OfflineQueue();
    const entry = q.enqueue({ url: 'https://example.com' });
    expect(entry.method).toBe('GET');
  });

  it('serializes headers from plain object', () => {
    const q = new OfflineQueue();
    const entry = q.enqueue({ url: 'https://example.com', headers: { 'x-token': 'abc' } });
    expect(entry.headers['x-token']).toBe('abc');
  });

  it('getAll returns all entries', () => {
    const q = new OfflineQueue();
    q.enqueue({ url: 'https://a.com' });
    q.enqueue({ url: 'https://b.com' });
    expect(q.getAll().length).toBe(2);
  });

  it('remove deletes a specific entry', () => {
    const q = new OfflineQueue();
    const e1 = q.enqueue({ url: 'https://a.com' });
    q.enqueue({ url: 'https://b.com' });
    q.remove(e1.id);
    expect(q.size).toBe(1);
    expect(q.getAll()[0]!.url).toBe('https://b.com');
  });

  it('clear removes all entries', () => {
    const q = new OfflineQueue();
    q.enqueue({ url: 'https://a.com' });
    q.enqueue({ url: 'https://b.com' });
    q.clear();
    expect(q.size).toBe(0);
  });

  describe('replay', () => {
    it('replays all entries and removes successful ones', async () => {
      const q = new OfflineQueue();
      q.enqueue({ url: 'https://a.com', method: 'POST', body: '1' });
      q.enqueue({ url: 'https://b.com', method: 'POST', body: '2' });

      const executor = vi.fn().mockResolvedValue(undefined);
      const count = await q.replay(executor);

      expect(count).toBe(2);
      expect(executor).toHaveBeenCalledTimes(2);
      expect(q.size).toBe(0);
    });

    it('keeps failed entries in the queue', async () => {
      const q = new OfflineQueue();
      q.enqueue({ url: 'https://a.com' });
      q.enqueue({ url: 'https://b.com' });

      const executor = vi.fn()
        .mockResolvedValueOnce(undefined)       // first succeeds
        .mockRejectedValueOnce(new Error('fail')); // second fails

      const count = await q.replay(executor);

      expect(count).toBe(1);
      expect(q.size).toBe(1);
      expect(q.getAll()[0]!.url).toBe('https://b.com');
    });

    it('returns 0 when queue is empty', async () => {
      const q = new OfflineQueue();
      const count = await q.replay(vi.fn());
      expect(count).toBe(0);
    });
  });

  it('accepts custom storage backend', () => {
    const storage = new MemoryStorage();
    const q = new OfflineQueue(storage);
    q.enqueue({ url: 'https://example.com' });
    expect(storage.getAll().length).toBe(1);
  });
});
