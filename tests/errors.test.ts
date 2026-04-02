import { describe, it, expect } from 'vitest';
import {
  SmartFetchError,
  NetworkError,
  TimeoutError,
  HttpError,
  RateLimitError,
} from '../src/errors/index.js';

describe('Error Hierarchy', () => {
  describe('NetworkError', () => {
    it('should set correct properties', () => {
      const err = new NetworkError('https://example.com', 'GET');
      expect(err).toBeInstanceOf(SmartFetchError);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe('ERR_NETWORK');
      expect(err.retryable).toBe(true);
      expect(err.url).toBe('https://example.com');
      expect(err.method).toBe('GET');
      expect(err.name).toBe('NetworkError');
      expect(err.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve cause', () => {
      const cause = new TypeError('fetch failed');
      const err = new NetworkError('https://example.com', 'POST', cause);
      expect(err.cause).toBe(cause);
    });
  });

  describe('TimeoutError', () => {
    it('should set correct properties', () => {
      const err = new TimeoutError('https://example.com', 'GET', 5000);
      expect(err).toBeInstanceOf(SmartFetchError);
      expect(err.code).toBe('ERR_TIMEOUT');
      expect(err.retryable).toBe(true);
      expect(err.timeout).toBe(5000);
      expect(err.message).toContain('5000ms');
    });
  });

  describe('HttpError', () => {
    it('should be retryable for 5xx', () => {
      const err = new HttpError('https://example.com', 'GET', 503, 'Service Unavailable', new Headers(), null);
      expect(err).toBeInstanceOf(SmartFetchError);
      expect(err.code).toBe('ERR_HTTP');
      expect(err.retryable).toBe(true);
      expect(err.status).toBe(503);
    });

    it('should NOT be retryable for 4xx (except 408/429)', () => {
      const err = new HttpError('https://example.com', 'POST', 400, 'Bad Request', new Headers(), '{"error":"bad"}');
      expect(err.retryable).toBe(false);
      expect(err.body).toBe('{"error":"bad"}');
    });

    it('should be retryable for 408', () => {
      const err = new HttpError('https://example.com', 'GET', 408, 'Request Timeout', new Headers(), null);
      expect(err.retryable).toBe(true);
    });
  });

  describe('RateLimitError', () => {
    it('should parse numeric Retry-After header', () => {
      const headers = new Headers({ 'retry-after': '120' });
      const err = new RateLimitError('https://example.com', 'GET', headers);
      expect(err).toBeInstanceOf(SmartFetchError);
      expect(err.code).toBe('ERR_RATE_LIMIT');
      expect(err.retryable).toBe(true);
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBe(120_000);
    });

    it('should return null when Retry-After is absent', () => {
      const err = new RateLimitError('https://example.com', 'GET', new Headers());
      expect(err.retryAfter).toBeNull();
    });

    it('should parse date-based Retry-After header', () => {
      const futureDate = new Date(Date.now() + 60_000).toUTCString();
      const headers = new Headers({ 'retry-after': futureDate });
      const err = new RateLimitError('https://example.com', 'GET', headers);
      expect(err.retryAfter).toBeGreaterThan(0);
      expect(err.retryAfter).toBeLessThanOrEqual(60_000);
    });
  });
});
