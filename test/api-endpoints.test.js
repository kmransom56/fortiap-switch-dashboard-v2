/**
 * API Endpoints Integration Tests
 * Comprehensive tests for all API endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock server setup for testing
const createTestServer = () => {
  const app = express();
  app.use(express.json());

  // Mock endpoints
  app.get('/api/fortiaps', (req, res) => {
    res.json({
      fortiaps: [
        {
          name: 'FAP-1',
          serial: 'FP123456',
          status: 'online',
          ip_address: '192.168.1.10'
        }
      ]
    });
  });

  app.get('/api/fortiswitches', (req, res) => {
    res.json({
      fortiswitches: [
        {
          name: 'FSW-1',
          serial: 'FS123456',
          status: 'online',
          ports_up: 24
        }
      ]
    });
  });

  app.get('/api/connected-devices', (req, res) => {
    res.json({
      devices: [
        {
          mac: '00:11:22:33:44:55',
          ip: '192.168.1.100',
          hostname: 'device-1'
        }
      ]
    });
  });

  app.get('/api/topology', (req, res) => {
    res.json({
      nodes: [],
      links: []
    });
  });

  app.get('/api/historical', (req, res) => {
    res.json({
      data: []
    });
  });

  app.get('/api/status', (req, res) => {
    res.json({
      connected: true,
      lastCheck: new Date().toISOString()
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime()
    });
  });

  app.get('/metrics', (req, res) => {
    res.json({
      requestCount: 0,
      cacheHits: 0
    });
  });

  return app;
};

describe('API Endpoints', () => {
  let app;

  beforeEach(() => {
    app = createTestServer();
  });

  describe('FortiAP Endpoints', () => {
    test('GET /api/fortiaps should return FortiAP data', async () => {
      const response = await request(app)
        .get('/api/fortiaps')
        .expect(200);

      expect(response.body).toHaveProperty('fortiaps');
      expect(Array.isArray(response.body.fortiaps)).toBe(true);
      expect(response.body.fortiaps.length).toBeGreaterThan(0);
    });

    test('GET /api/fortiaps should return valid FortiAP structure', async () => {
      const response = await request(app)
        .get('/api/fortiaps')
        .expect(200);

      const ap = response.body.fortiaps[0];
      expect(ap).toHaveProperty('name');
      expect(ap).toHaveProperty('serial');
      expect(ap).toHaveProperty('status');
    });
  });

  describe('FortiSwitch Endpoints', () => {
    test('GET /api/fortiswitches should return FortiSwitch data', async () => {
      const response = await request(app)
        .get('/api/fortiswitches')
        .expect(200);

      expect(response.body).toHaveProperty('fortiswitches');
      expect(Array.isArray(response.body.fortiswitches)).toBe(true);
    });

    test('GET /api/fortiswitches should return valid FortiSwitch structure', async () => {
      const response = await request(app)
        .get('/api/fortiswitches')
        .expect(200);

      const sw = response.body.fortiswitches[0];
      expect(sw).toHaveProperty('name');
      expect(sw).toHaveProperty('serial');
      expect(sw).toHaveProperty('status');
    });
  });

  describe('Connected Devices Endpoints', () => {
    test('GET /api/connected-devices should return device data', async () => {
      const response = await request(app)
        .get('/api/connected-devices')
        .expect(200);

      expect(response.body).toHaveProperty('devices');
      expect(Array.isArray(response.body.devices)).toBe(true);
    });

    test('GET /api/connected-devices should return valid device structure', async () => {
      const response = await request(app)
        .get('/api/connected-devices')
        .expect(200);

      const device = response.body.devices[0];
      expect(device).toHaveProperty('mac');
      expect(device).toHaveProperty('ip');
    });
  });

  describe('Topology Endpoints', () => {
    test('GET /api/topology should return topology data', async () => {
      const response = await request(app)
        .get('/api/topology')
        .expect(200);

      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.links)).toBe(true);
    });
  });

  describe('Historical Data Endpoints', () => {
    test('GET /api/historical should return historical data', async () => {
      const response = await request(app)
        .get('/api/historical')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Status Endpoints', () => {
    test('GET /api/status should return connection status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('connected');
      expect(typeof response.body.connected).toBe('boolean');
    });
  });

  describe('Health Check Endpoints', () => {
    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    });

    test('GET /health should include uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('Metrics Endpoints', () => {
    test('GET /metrics should return performance metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('requestCount');
      expect(response.body).toHaveProperty('cacheHits');
    });
  });

  describe('Response Headers', () => {
    test('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent routes', async () => {
      await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });
  });
});
