const { test, expect } = require('@playwright/test');

test.describe('API Endpoints', () => {
  test.describe('Health and Status', () => {
    test('GET /health - should return 200', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('status');
      expect(body.status).toBe('healthy');
    });

    test('GET /metrics - should return metrics data', async ({ request }) => {
      const response = await request.get('/metrics');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('requestCount');
      expect(body).toHaveProperty('averageResponseTime');
    });

    test('GET /api-docs - should return API documentation', async ({ request }) => {
      const response = await request.get('/api-docs');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    });
  });

  test.describe('FortiAP Endpoints', () => {
    test('GET /api/fortiaps - should return FortiAP list', async ({ request }) => {
      const response = await request.get('/api/fortiaps');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
      
      if (body.length > 0) {
        const ap = body[0];
        expect(ap).toHaveProperty('name');
        expect(ap).toHaveProperty('serial');
        expect(ap).toHaveProperty('status');
      }
    });

    test('GET /api/fortiaps/:serial - should return specific FortiAP', async ({ request }) => {
      const listResponse = await request.get('/api/fortiaps');
      const fortiaps = await listResponse.json();
      
      if (fortiaps.length > 0) {
        const serial = fortiaps[0].serial;
        const response = await request.get(`/api/fortiaps/${serial}`);
        expect(response.ok()).toBeTruthy();
        
        const body = await response.json();
        expect(body).toHaveProperty('serial', serial);
      }
    });
  });

  test.describe('FortiSwitch Endpoints', () => {
    test('GET /api/fortiswitches - should return FortiSwitch list', async ({ request }) => {
      const response = await request.get('/api/fortiswitches');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
      
      if (body.length > 0) {
        const sw = body[0];
        expect(sw).toHaveProperty('name');
        expect(sw).toHaveProperty('serial');
        expect(sw).toHaveProperty('status');
      }
    });

    test('GET /api/fortiswitches/:serial - should return specific FortiSwitch', async ({ request }) => {
      const listResponse = await request.get('/api/fortiswitches');
      const switches = await listResponse.json();
      
      if (switches.length > 0) {
        const serial = switches[0].serial;
        const response = await request.get(`/api/fortiswitches/${serial}`);
        expect(response.ok()).toBeTruthy();
        
        const body = await response.json();
        expect(body).toHaveProperty('serial', serial);
      }
    });
  });

  test.describe('Topology Endpoints', () => {
    test('GET /api/topology - should return network topology', async ({ request }) => {
      const response = await request.get('/api/topology');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('fortigate');
      expect(body).toHaveProperty('switches');
      expect(body).toHaveProperty('aps');
      expect(Array.isArray(body.switches)).toBeTruthy();
      expect(Array.isArray(body.aps)).toBeTruthy();
    });

    test('GET /api/topology - verify detailed structure', async ({ request }) => {
      const response = await request.get('/api/topology');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('switches');
      expect(body).toHaveProperty('aps');
    });
  });

  test.describe('Statistics Endpoints', () => {
    test('GET /api/stats - should return dashboard statistics', async ({ request }) => {
      const response = await request.get('/api/stats');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('fortiaps');
      expect(body).toHaveProperty('fortiswitches');
    });

    test('GET /api/alerts - should return system alerts', async ({ request }) => {
      const response = await request.get('/api/alerts');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
    });
  });

  test.describe('Connected Devices Endpoints', () => {
    test('GET /api/connected-devices - should return connected devices', async ({ request }) => {
      const response = await request.get('/api/connected-devices');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('wired');
      expect(body).toHaveProperty('wireless');
      expect(body).toHaveProperty('detected');
      expect(body).toHaveProperty('summary');
      expect(Array.isArray(body.wired)).toBeTruthy();
      expect(Array.isArray(body.wireless)).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('GET /api/nonexistent - should return 404', async ({ request }) => {
      const response = await request.get('/api/nonexistent');
      expect(response.status()).toBe(404);
    });

    test('GET /api/fortiaps/invalid-serial - should return 404', async ({ request }) => {
      const response = await request.get('/api/fortiaps/INVALID_SERIAL_12345');
      expect(response.status()).toBe(404);
    });
  });
});
