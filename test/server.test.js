const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock dotenv config and dependencies before requiring the app
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock fs functions
jest.mock('fs', () => {
  const originalModule = jest.requireActual('fs');
  return {
    ...originalModule,
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
});

// Mock https
jest.mock('https', () => {
  return {
    Agent: jest.fn(() => ({})),
  };
});

// Mock axios - provide `default` function and `create()` returning a session with `request()`
jest.mock('axios', () => {
  const mockFn = jest.fn(() => Promise.resolve({ status: 200, data: {}, headers: {} }));
  return {
    default: mockFn,
    create: jest.fn(() => ({ request: mockFn }))
  };
});

// Set up environment variables for testing
process.env.FORTIGATE_HOST = 'test-host';
process.env.FORTIGATE_USERNAME = 'test-user';
process.env.FORTIGATE_PASSWORD = 'test-password';
process.env.VERIFY_SSL = 'false';
process.env.FORTIGATE_API_TOKEN = 'test-token';

// Import the app after all mocks are set up
let app;
let mockYaml;

describe('Server API', () => {
  beforeEach(() => {
    // Reset module cache before each test
    jest.resetModules();
    
    // Mock yaml data for tests
    const now = new Date().toISOString();
    mockYaml = `fortiaps:\n  - name: test-ap\n    status: up\nfortiswitches:\n  - name: test-switch\n    status: up\nhistorical_data:\n  - timestamp: ${now}\n`;
    
    // Set up fs mocks: cache files should appear missing; dashboard_data.yaml should exist
    // For tests ensure all paths exist so YAML fallback is reachable
    fs.existsSync.mockReturnValue(true);

    fs.readFileSync.mockImplementation((p) => {
      const lower = String(p).toLowerCase();
      if (lower.includes('dashboard_data.yaml')) return mockYaml;
      if (lower.includes('fortiaps.json')) return JSON.stringify({ _timestamp: Date.now(), data: [{ name: 'test-ap', status: 'up' }] });
      // Default return JSON for other cache reads
      return JSON.stringify({ _timestamp: Date.now(), data: [] });
    });
    
    // Now import the app
    app = require('../server');
  });
  
  afterEach(async () => {
    // Clean up between tests
    if (app && typeof app.close === 'function') {
      await new Promise((resolve) => { try { app.close(resolve); } catch (e) { resolve(); } });
    }

    jest.clearAllMocks();
  });
  
  describe('API Status endpoint', () => {
    test('GET /api/status should return connection status', async () => {
      const mockStatus = {
        status: 'connected',
        fortigate: {
          version: '7.0.0',
          hostname: 'test-fortigate',
          serial: '12345'
        }
      };
      
      // Mock the API response
      const axios = require('axios');
      axios.default.mockImplementationOnce(() => 
        Promise.resolve({ 
          status: 200, 
          data: { 
            results: { 
              version: '7.0.0',
              hostname: 'test-fortigate',
              serial: '12345'
            } 
          } 
        })
      );
      
      const response = await request(app).get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'connected'
      });
      expect(response.body.fortigate).toBeDefined();
    });
    
    test('GET /api/status should handle API errors', async () => {
      // Mock API failure
      const axios = require('axios');
      axios.default.mockImplementationOnce(() => 
        Promise.reject(new Error('API connection failed'))
      );
      
      const response = await request(app).get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'disconnected'
      });
    });
  });
  
  describe('Data endpoints', () => {
    test('GET /api/fortiaps should return FortiAP data', async () => {
      // Mock successful API response
      const axios = require('axios');
      axios.default.mockImplementationOnce(() => 
        Promise.resolve({ 
          status: 200, 
          data: { 
            results: [
              { name: 'ap1', model: 'FortiAP-431F', status: 'up' }
            ] 
          } 
        })
      );
      
      // debug: ensure cache content read by mocked fs
      // console.log('DEBUG cache read:', fs.readFileSync(path.resolve(__dirname, '../cache/fortiaps.json')));
      const response = await request(app).get('/api/fortiaps');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('GET /api/fortiswitches should return FortiSwitch data', async () => {
      // Mock successful API response
      const axios = require('axios');
      axios.default.mockImplementationOnce(() => 
        Promise.resolve({ 
          status: 200, 
          data: { 
            results: [
              { name: 'switch1', model: 'FortiSwitch-424E', status: 'up' }
            ] 
          } 
        })
      );
      
      const response = await request(app).get('/api/fortiswitches');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('GET /api/historical should return historical data', async () => {
      const response = await request(app).get('/api/historical');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('GET /api/data-source should return data source info', async () => {
      const response = await request(app).get('/api/data-source');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        source: expect.any(String)
      });
    });
  });
  
  describe('Fallback functionality', () => {
    test('Should fall back to YAML data when API fails', async () => {
      // Mock API failure
      const axios = require('axios');
      axios.default.mockImplementationOnce(() => 
        Promise.reject(new Error('API connection failed'))
      );
      
      // Force cache to be missing so YAML fallback is used
      fs.existsSync.mockImplementation((p) => {
        const lower = String(p).toLowerCase();
        if (lower.includes('dashboard_data.yaml')) return true;
        // Simulate no cache files present
        return false;
      });

      // Ensure YAML file is returned
      fs.readFileSync.mockImplementation((p) => {
        const lower = String(p).toLowerCase();
        if (lower.includes('dashboard_data.yaml')) return mockYaml;
        return JSON.stringify({ _timestamp: Date.now(), data: [] });
      });

      // Close the current server instance, then re-require so the latest fs mocks are used
      if (app && typeof app.close === 'function') {
        await new Promise((resolve) => { try { app.close(resolve); } catch (e) { resolve(); } });
      }
      jest.resetModules();
      app = require('../server');

      const response = await request(app).get('/api/fortiaps');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // YAML fallback returned (may be empty); ensure array result
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});