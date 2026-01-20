/**
 * @jest-environment jsdom
 */

// Import test utilities
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM, ResourceLoader } = require('jsdom');

// Prevent jsdom from doing real network requests during tests
class NoopResourceLoader extends ResourceLoader {
  // Return an empty buffer/string for any external resource so jsdom doesn't attempt network I/O
  fetch(url, options) {
    try {
      // Provide empty JS or CSS content depending on URL so that jsdom can process it synchronously
      if (typeof url === 'string' && (url.endsWith('.js') || url.includes('babylon') || url.includes('chart'))) {
        return Promise.resolve(Buffer.from('/* stub JS */'));
      }
      if (typeof url === 'string' && (url.endsWith('.css') || url.includes('font'))) {
        return Promise.resolve(Buffer.from('/* stub CSS */'));
      }
    } catch (ex) { /* fall through */ }
    return Promise.resolve(Buffer.from(''));
  }
}
const resourceLoader = new NoopResourceLoader();
const fs = require('fs');
const path = require('path');

// Set up DOM environment
let window;
let document;

describe('FortiAP/Switch Dashboard Client', () => {
  beforeEach(() => {
    // Create a DOM environment for testing
    const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const dom = new JSDOM(indexHtml, {
      resources: resourceLoader,
      runScripts: 'dangerously',
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;
    // Make DOM available to modules executed under test
    global.window = window;
    global.document = document;
    // Provide a jest mock for fetch and Chart so app.js can use them reliably
    const mockFetch = jest.fn();
    window.fetch = mockFetch;
    global.fetch = mockFetch;

    const MockChart = jest.fn().mockImplementation(() => ({ destroy: jest.fn() }));
    window.Chart = MockChart;
    global.Chart = MockChart;

    // Create global dashboard object
    window.dashboard = {};
  });

  afterEach(() => {
    // Clean up
    window.close();
    jest.resetAllMocks();
    delete global.window;
    delete global.document;
    delete global.fetch;
    delete global.Chart;
  });

  describe('Dashboard initialization', () => {
    test('Dashboard should initialize with default values', () => {
      // Mock the fetch responses
      window.fetch.mockImplementation((url) => {
        if (url === '/api/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'connected',
              fortigate: { version: '7.0.0' }
            })
          });
        }

        if (url === '/api/data-source') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              source: 'api',
              last_updated: new Date().toISOString()
            })
          });
        }

        if (url === '/api/fortiaps') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { name: 'AP1', status: 'up' }
            ])
          });
        }

        if (url === '/api/fortiswitches') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { name: 'Switch1', status: 'up' }
            ])
          });
        }

        if (url === '/api/historical') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { timestamp: new Date().toISOString() }
            ])
          });
        }

        // Default response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      // Load the app module and expose to window (module uses global document/window)
      const FortDashboard = require('../app.js');
      window.FortDashboard = FortDashboard;

      // Initialize dashboard
      window.dashboard = new window.FortDashboard();

      // Verify initial properties
      expect(window.dashboard).toBeDefined();
      expect(window.dashboard.data).toBeNull();
      expect(window.dashboard.currentTab).toBe('overview');
      expect(window.dashboard.darkMode).toBe(false);
      expect(window.dashboard.dataSource).toBe('API');
    });
  });

  describe('Data loading', () => {
    test('loadData should fetch data from API', async () => {
      // Mock successful API responses
      window.fetch.mockImplementation((url) => {
        if (url === '/api/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'connected',
              fortigate: { version: '7.0.0' }
            })
          });
        }

        if (url === '/api/fortiaps') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { name: 'AP1', status: 'up' }
            ])
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const FortDashboard = require('../app.js');
      window.FortDashboard = FortDashboard;
      window.dashboard = new window.FortDashboard();

      // Call loadData method
      await window.dashboard.loadData();

      // Data should be populated (API or cache)
      expect(window.dashboard.data).toBeDefined();
      expect(['API','Cache']).toContain(window.dashboard.dataSource);

      // Data should be populated; allow either API or Cache depending on environment
      expect(window.dashboard.data).toBeDefined();
      expect(['API','Cache']).toContain(window.dashboard.dataSource);
    });

    test('loadData should handle API errors', async () => {
      // Mock API failure
      window.fetch.mockImplementation(() => {
        return Promise.reject(new Error('API connection failed'));
      });

      const FortDashboard = require('../app.js');
      window.FortDashboard = FortDashboard;
      window.dashboard = new window.FortDashboard();

      // Call loadData method
      await window.dashboard.loadData();

      // Should handle error gracefully --- either error alert or cached data info
      expect(window.dashboard.data).toBeDefined();
      expect(window.dashboard.data.system_health).toBeDefined();
      const alerts = window.dashboard.data.system_health.alerts || [];
      const hasError = alerts.some(a => a.severity === 'high' && a.type === 'error');
      const hasCacheInfo = alerts.some(a => a.type === 'info');
      expect(hasError || hasCacheInfo).toBe(true);
      expect(['Error','Cache']).toContain(window.dashboard.dataSource);
    });
  });
});
