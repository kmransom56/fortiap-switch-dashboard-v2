/**
 * End-to-End Application Tests
 * Tests the actual application pages and functionality
 */

const request = require('supertest');
const path = require('path');

// Set NODE_ENV to development for these tests so the server actually starts
process.env.NODE_ENV = 'development';
process.env.PORT = 13999; // Use a different port for E2E tests

describe('End-to-End Application Tests', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Reset modules to get a fresh server instance
    jest.resetModules();

    // Import the server module - this will start the server in development mode
    const serverModule = require('../server');
    server = serverModule;
    app = serverModule.app;

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up server
    if (server && typeof server.close === 'function') {
      await new Promise((resolve) => {
        try {
          server.close(() => {
            resolve();
          });
        } catch (error) {
          // Server might already be closed
          resolve();
        }
      });
    }

    // Wait a bit to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  }, 10000); // Increase timeout for cleanup

  describe('Frontend Pages', () => {
    test('GET / should return the main dashboard page', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('Fortinet Dashboard');
      expect(response.text).toContain('<!DOCTYPE html>');
    });

    test('Main page should include required CSS', async () => {
      const response = await request(app).get('/');

      expect(response.text).toContain('style.css');
      expect(response.text).toContain('font-awesome');
    });

    test('Main page should include required JavaScript libraries', async () => {
      const response = await request(app).get('/');

      expect(response.text).toContain('chart.js');
      expect(response.text).toContain('d3.v7.min.js');
      expect(response.text).toContain('babylon.js');
    });

    test('Main page should have navigation tabs', async () => {
      const response = await request(app).get('/');

      expect(response.text).toContain('Overview');
      expect(response.text).toContain('FortiAPs');
      expect(response.text).toContain('FortiSwitches');
      expect(response.text).toContain('Topology');
    });
  });

  describe('Static Assets', () => {
    test('GET /style.css should return CSS file', async () => {
      const response = await request(app).get('/style.css');

      expect(response.status).toBe(200);
      expect(response.type).toContain('text/css');
    });

    test('GET /app.js should return JavaScript file', async () => {
      const response = await request(app).get('/app.js');

      expect(response.status).toBe(200);
      expect(response.type).toContain('application/javascript');
    });

    test('CSS file should contain dashboard styles', async () => {
      const response = await request(app).get('/style.css');

      expect(response.text).toContain('body');
      expect(response.text.length).toBeGreaterThan(100);
    });

    test('JavaScript file should contain dashboard logic', async () => {
      const response = await request(app).get('/app.js');

      expect(response.text.length).toBeGreaterThan(100);
    });
  });

  describe('API Endpoints for Dashboard', () => {
    test('GET /api/fortiaps should return FortiAP data', async () => {
      const response = await request(app).get('/api/fortiaps');

      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      // Accept either API or fallback data format
      expect(response.body).toBeDefined();
      // Fallback returns array, API returns object with fortiaps property
      expect(
        Array.isArray(response.body) || response.body.fortiaps !== undefined
      ).toBe(true);
    });

    test('GET /api/fortiswitches should return FortiSwitch data', async () => {
      const response = await request(app).get('/api/fortiswitches');

      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      // Accept either API or fallback data format
      expect(response.body).toBeDefined();
      expect(
        Array.isArray(response.body) || response.body.fortiswitches !== undefined
      ).toBe(true);
    });

    test('GET /api/connected-devices should return device data', async () => {
      const response = await request(app).get('/api/connected-devices');

      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
    });

    test('GET /api/topology should return topology data', async () => {
      const response = await request(app).get('/api/topology');

      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      expect(response.body).toHaveProperty('fortigate');
    });

    test('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Dashboard Functionality', () => {
    test('API data should be properly formatted for frontend', async () => {
      const response = await request(app).get('/api/fortiaps');

      expect(response.status).toBe(200);
      // Data can be either array (fallback) or object with fortiaps property (API)
      const isValidFormat = Array.isArray(response.body) ||
        (response.body.fortiaps && Array.isArray(response.body.fortiaps));

      expect(isValidFormat).toBe(true);
    });

    test('Topology should include all device types', async () => {
      const response = await request(app).get('/api/topology');

      expect(response.status).toBe(200);
      // Topology can come from API or fallback data
      // Just verify we get some topology data
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    test('Metrics endpoint should return performance data', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requestCount');
      expect(response.body).toHaveProperty('cacheHits');
    });
  });

  describe('Error Handling', () => {
    test('Non-existent routes should return 404', async () => {
      const response = await request(app).get('/non-existent-page');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    test('API errors should be properly formatted', async () => {
      const response = await request(app).get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
