/**
 * Cache Unit Tests
 * Tests for MemoryCache class and caching mechanisms
 */

jest.resetModules();
const server = require('../server');
const { MemoryCache } = server;

describe('MemoryCache', () => {
  let cache;

  beforeEach(() => {
    cache = new MemoryCache(1000); // 1 second TTL for testing
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  afterAll(async () => {
    // Close server to avoid port conflicts
    try {
      if (server && typeof server.close === 'function') {
        await new Promise((resolve) => server.close(resolve));
      }
    } catch (_e) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    test('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    test('should clear all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    test('should expire entries after TTL', async () => {
      const shortCache = new MemoryCache(100); // 100ms TTL
      shortCache.set('key1', 'value1');

      // Should exist immediately
      expect(shortCache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(shortCache.get('key1')).toBeNull();

      shortCache.stopCleanup();
    });

    test('should clean up expired entries', () => {
      const shortCache = new MemoryCache(100); // 100ms TTL
      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2');

      // Manually trigger cleanup after entries expire
      setTimeout(() => {
        shortCache.cleanup();
        const stats = shortCache.getStats();
        expect(stats.size).toBe(0);
      }, 150);

      shortCache.stopCleanup();
    });
  });

  describe('Statistics', () => {
    test('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(stats.size).toBe(2);
      expect(stats.ttl).toBe(1000);
    });
  });

  describe('Cleanup Management', () => {
    test('should start and stop automatic cleanup', () => {
      cache.startCleanup();
      expect(cache.cleanupInterval).toBeTruthy();

      cache.stopCleanup();
      expect(cache.cleanupInterval).toBeNull();
    });

    test('should not start multiple cleanup intervals', () => {
      cache.startCleanup();
      const firstInterval = cache.cleanupInterval;

      cache.startCleanup();
      const secondInterval = cache.cleanupInterval;

      expect(firstInterval).toBe(secondInterval);

      cache.stopCleanup();
    });
  });

  describe('Complex Values', () => {
    test('should handle object values', () => {
      const obj = { name: 'test', value: 123 };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });

    test('should handle array values', () => {
      const arr = [1, 2, 3, 4, 5];
      cache.set('arr', arr);
      expect(cache.get('arr')).toEqual(arr);
    });

    test('should handle null values', () => {
      cache.set('null', null);
      expect(cache.get('null')).toBeNull();
    });
  });
});
