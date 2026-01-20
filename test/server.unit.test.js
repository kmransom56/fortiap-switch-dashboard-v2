const fs = require('fs');
const path = require('path');

// Require server which starts in test env but we only need exported helpers
jest.resetModules();
const server = require('../server.js');

afterAll(async () => {
  // ensure server instance closed to avoid port collisions during test runs
  try {
    if (server && typeof server.close === 'function') {
      await new Promise((res) => server.close(res));
    }
  } catch (_e) {
    // Ignore cleanup errors
  }
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
    const payload = { _timestamp: Date.now(), data: [{ name: 'APX' }] };
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
    try { fs.unlinkSync(filePath); } catch (_e) { /* Ignore errors */ }
  });

  test('saveDataToCache should write data to cache files', () => {
    const saveDataToCache = server.saveDataToCache;
    const cacheDir = path.join(__dirname, '..', 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const testData = { test: 'data', fortiaps: [{ name: 'AP1' }] };
    saveDataToCache('fortiaps', testData);

    const filePath = path.join(cacheDir, 'fortiaps.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const cached = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(cached).toHaveProperty('_timestamp');
    expect(cached.data).toEqual(testData);

    // cleanup
    try { fs.unlinkSync(filePath); } catch (_e) { /* Ignore errors */ }
  });

  test('transformFortiAPData should transform API data correctly', () => {
    const transformFortiAPData = server.transformFortiAPData;

    const mockApiData = [
      {
        name: 'AP-Office-1',
        serial: 'FAP123456',
        wtp_id: 'office-ap-1',
        os_version: 'FAP-221E-v6.4.8',
        local_ipv4_addr: '192.168.1.10',
        connecting_from: '192.168.1.10',
        clients: 15,
        status: 'connected',
        connection_state: 'Connected',
        board_mac: 'AA:BB:CC:DD:EE:FF',
        join_time: '2024-01-15T10:30:00Z',
        sensors_temperatures: [45],
        ssid: [{ list: ['Corporate-WiFi', 'Guest-WiFi'] }],
        radio: [{ detected_rogue_aps: 3 }]
      },
      {
        wtp_id: 'AP-Warehouse',
        serial: 'FAP789012',
        status: 'disconnected'
      }
    ];

    const result = transformFortiAPData(mockApiData);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);

    // Check first AP
    expect(result[0]).toMatchObject({
      name: 'AP-Office-1',
      serial: 'FAP123456',
      model: 'FAP',
      ip_address: '192.168.1.10',
      firmware_version: 'FAP-221E-v6.4.8',
      clients_connected: 15,
      status: 'up',
      temperature: 45,
      interfering_aps: 3,
      connection_state: 'Connected',
      board_mac: 'AA:BB:CC:DD:EE:FF'
    });
    expect(result[0].ssid).toEqual(['Corporate-WiFi', 'Guest-WiFi']);

    // Check second AP with minimal data
    expect(result[1]).toMatchObject({
      name: 'AP-Warehouse',
      serial: 'FAP789012',
      status: 'down',
      clients_connected: 0
    });
  });

  test('transformFortiSwitchData should transform API data correctly', () => {
    const transformFortiSwitchData = server.transformFortiSwitchData;

    const mockApiData = [
      {
        name: 'SW-Core-1',
        serial: 'FS248E123456',
        os_version: 'v7.2.3',
        connection_state: 'Connected',
        ports: {
          'port1': {
            'rx-packets': 1000,
            'tx-packets': 2000,
            'rx-bytes': 50000,
            'tx-bytes': 75000,
            poe_power: '15.5',
            poe_max: '30',
            poe_capable: true
          },
          'port2': {
            'rx-packets': 0,
            'tx-packets': 0,
            'rx-bytes': 0,
            'tx-bytes': 0,
            poe_capable: false
          }
        }
      },
      {
        name: 'SW-Access-2',
        serial: 'FS124E789012',
        status: 'down'
      }
    ];

    const result = transformFortiSwitchData(mockApiData);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);

    // Check first switch
    expect(result[0]).toMatchObject({
      name: 'SW-Core-1',
      serial: 'FS248E123456',
      model: 'FortiSwitch',
      firmware_version: 'v7.2.3',
      status: 'up',
      ports_up: 1,
      ports_total: 2
    });
    expect(result[0].poe_power_consumption).toBeGreaterThan(0);
    expect(result[0].ports).toHaveLength(2);
    expect(result[0].ports[0]).toMatchObject({
      port: 'port1',
      status: 'up',
      'rx-packets': 1000,
      'tx-packets': 2000,
      poe_power: '15.5'
    });

    // Check second switch with minimal data
    expect(result[1]).toMatchObject({
      name: 'SW-Access-2',
      serial: 'FS124E789012',
      status: 'down',
      ports_up: 0,
      ports_total: 0
    });
  });

  test('transformFortiAPData should handle missing fields gracefully', () => {
    const transformFortiAPData = server.transformFortiAPData;

    const minimalData = [{}];
    const result = transformFortiAPData(minimalData);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'Unknown',
      serial: 'Unknown',
      model: 'FortiAP',
      ip_address: 'Unknown',
      firmware_version: 'Unknown',
      clients_connected: 0,
      status: 'down',
      temperature: 0,
      interfering_aps: 0
    });
  });

  test('transformFortiSwitchData should handle missing ports data', () => {
    const transformFortiSwitchData = server.transformFortiSwitchData;

    const minimalData = [{ name: 'Test-Switch' }];
    const result = transformFortiSwitchData(minimalData);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'Test-Switch',
      ports_up: 0,
      ports_total: 0,
      poe_power_consumption: 0
    });
    expect(result[0].ports).toEqual([]);
  });

  test('loadCachedData should handle invalid JSON', () => {
    const loadCachedData = server.loadCachedData;
    const cacheDir = path.join(__dirname, '..', 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, 'fortiaps.json');
    fs.writeFileSync(filePath, 'invalid json{{{', 'utf8');

    const result = loadCachedData('fortiaps');
    expect(result).toBeNull();

    // cleanup
    try { fs.unlinkSync(filePath); } catch (_e) { /* Ignore errors */ }
  });

  test('loadCachedData should return null for non-existent cache type', () => {
    const loadCachedData = server.loadCachedData;
    const result = loadCachedData('nonexistent');
    expect(result).toBeNull();
  });

  test('saveDataToCache should handle invalid cache type', () => {
    const saveDataToCache = server.saveDataToCache;

    // Should not throw, just return early
    expect(() => {
      saveDataToCache('invalid_type', { test: 'data' });
    }).not.toThrow();
  });

  test('loadCachedData should load fortiswitches cache', () => {
    const loadCachedData = server.loadCachedData;
    const cacheDir = path.join(__dirname, '..', 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, 'fortiswitches.json');
    const payload = { _timestamp: Date.now(), data: [{ name: 'SW1' }] };
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');

    const result = loadCachedData('fortiswitches');
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('SW1');

    // cleanup
    try { fs.unlinkSync(filePath); } catch (_e) { /* Ignore errors */ }
  });

  test('loadCachedData should load historical_data cache', () => {
    const loadCachedData = server.loadCachedData;
    const cacheDir = path.join(__dirname, '..', 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, 'historical_data.json');
    const payload = { _timestamp: Date.now(), data: { history: [] } };
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');

    const result = loadCachedData('historical_data');
    expect(result).toHaveProperty('history');

    // cleanup
    try { fs.unlinkSync(filePath); } catch (_e) { /* Ignore errors */ }
  });
});
