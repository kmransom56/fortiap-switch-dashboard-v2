const fs = require('fs');
const path = require('path');

// Require server which starts in test env but we only need exported helpers
jest.resetModules();
const server = require('../server.js');

afterAll(async () => {
  // ensure server instance closed to avoid port collisions during test runs
  try { if (server && typeof server.close === 'function') await new Promise((res) => server.close(res)); } catch (e) {}
});

describe('Server internal helpers', () => {
  test('MemoryCache set/get/cleanup behavior', () => {
    const MemoryCache = server.MemoryCache;
    expect(typeof MemoryCache).toBe('function');

    const mc = new MemoryCache(10); // tiny ttl
    mc.set('a', 1);
    expect(mc.get('a')).toBe(1);

    // Simulate expiration by setting timestamp in the past
    const item = mc.cache.get('a');
    item.timestamp = Date.now() - 10000;
    mc.cleanup();

    expect(mc.get('a')).toBeNull();
    expect(mc.has('a')).toBe(false);

    mc.set('b', { x: 2 });
    const stats = mc.getStats();
    expect(stats.size).toBeGreaterThanOrEqual(1);
    expect(stats.ttl).toBe(10);

    mc.clear();
    expect(mc.get('b')).toBeNull();
  });

  test('loadCachedData and loadFallbackData should read cache and yaml fallback', () => {
    const loadCachedData = server.loadCachedData;
    const loadFallbackData = server.loadFallbackData;

    const cacheDir = path.join(__dirname, '..', 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    // Write a valid cache file for fortiaps
    const filePath = path.join(cacheDir, 'fortiaps.json');
    const payload = { _timestamp: Date.now(), data: [ { name: 'APX' } ] };
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');

    const v = loadCachedData('fortiaps');
    expect(Array.isArray(v)).toBe(true);
    expect(v[0].name).toBe('APX');

    // Expire the cache and check that loader returns null
    payload._timestamp = Date.now() - (48 * 60 * 60 * 1000);
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
    const v2 = loadCachedData('fortiaps');
    expect(v2).toBeNull();

    // loadFallbackData should return array (from dashboard_data.yaml)
    const fb = loadFallbackData('fortiaps');
    expect(Array.isArray(fb)).toBe(true);

    // cleanup
    try { fs.unlinkSync(filePath) } catch (e) {}
  });
});
