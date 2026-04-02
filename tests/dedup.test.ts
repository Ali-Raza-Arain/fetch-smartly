import { describe, it, expect } from 'vitest';
import { DedupManager, getDedupKey, isDedupEligible } from '../src/state/dedup.js';
import type { SmartFetchResponse } from '../src/types/index.js';

function fakeResponse(data: unknown): SmartFetchResponse<unknown> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    retries: 0,
    duration: 10,
    ok: true,
  };
}

describe('getDedupKey', () => {
  it('creates key from method and url', () => {
    expect(getDedupKey('GET', 'https://example.com')).toBe('GET:https://example.com');
  });
});

describe('isDedupEligible', () => {
  it('returns true for GET, HEAD, OPTIONS', () => {
    expect(isDedupEligible('GET')).toBe(true);
    expect(isDedupEligible('HEAD')).toBe(true);
    expect(isDedupEligible('OPTIONS')).toBe(true);
  });

  it('returns false for mutation methods', () => {
    expect(isDedupEligible('POST')).toBe(false);
    expect(isDedupEligible('PUT')).toBe(false);
    expect(isDedupEligible('PATCH')).toBe(false);
    expect(isDedupEligible('DELETE')).toBe(false);
  });
});

describe('DedupManager', () => {
  it('tracks and returns an in-flight promise', async () => {
    const mgr = new DedupManager();
    const promise = Promise.resolve(fakeResponse({ id: 1 }));

    mgr.track('GET:https://example.com', promise);

    expect(mgr.has('GET:https://example.com')).toBe(true);
    expect(mgr.size).toBe(1);

    const result = mgr.get<{ id: number }>('GET:https://example.com');
    expect(result).toBe(promise);
  });

  it('returns undefined for unknown keys', () => {
    const mgr = new DedupManager();
    expect(mgr.get('GET:https://unknown.com')).toBeUndefined();
    expect(mgr.has('GET:https://unknown.com')).toBe(false);
  });

  it('auto-cleans after promise resolves', async () => {
    const mgr = new DedupManager();
    const promise = Promise.resolve(fakeResponse('ok'));

    mgr.track('k', promise);
    await promise;
    // Allow microtask (then cleanup) to run
    await Promise.resolve();

    expect(mgr.size).toBe(0);
  });

  it('auto-cleans after promise rejects', async () => {
    const mgr = new DedupManager();
    const promise = Promise.reject(new Error('fail'));

    mgr.track('k', promise);
    await promise.catch(() => {});
    await Promise.resolve();

    expect(mgr.size).toBe(0);
  });

  it('does not remove entry if a newer promise replaced it', async () => {
    const mgr = new DedupManager();
    const first = Promise.resolve(fakeResponse('first'));
    // Second promise stays pending so its cleanup hasn't fired
    const second = new Promise<SmartFetchResponse<unknown>>(() => {});

    mgr.track('k', first);
    mgr.track('k', second);

    await first;
    await Promise.resolve();

    // First's cleanup should not remove the second entry
    expect(mgr.size).toBe(1);
    expect(mgr.get('k')).toBe(second);
  });

  it('multiple callers share the same response', async () => {
    const mgr = new DedupManager();
    let resolveRequest!: (v: SmartFetchResponse<unknown>) => void;
    const promise = new Promise<SmartFetchResponse<unknown>>((r) => { resolveRequest = r; });

    mgr.track('k', promise);

    const caller1 = mgr.get('k')!;
    const caller2 = mgr.get('k')!;

    expect(caller1).toBe(caller2);

    resolveRequest(fakeResponse({ shared: true }));
    const [r1, r2] = await Promise.all([caller1, caller2]);
    expect(r1.data).toEqual({ shared: true });
    expect(r2.data).toEqual({ shared: true });
  });

  it('clear removes all entries', () => {
    const mgr = new DedupManager();
    mgr.track('a', Promise.resolve(fakeResponse('a')));
    mgr.track('b', Promise.resolve(fakeResponse('b')));

    expect(mgr.size).toBe(2);
    mgr.clear();
    expect(mgr.size).toBe(0);
  });
});
