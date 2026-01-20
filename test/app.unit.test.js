/**
 * @jest-environment jsdom
 */

// TextEncoder/TextDecoder are required by jsdom internals
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM, ResourceLoader } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Ensure DOM exists for methods that interact with document
beforeAll(() => {
  const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  class NoopLoader extends ResourceLoader {
    fetch(url, options) {
      return Promise.resolve(Buffer.from(''));
    }
  }
  const dom = new JSDOM(indexHtml, { runScripts: 'dangerously', resources: new NoopLoader() });
  global.window = dom.window;
  global.document = dom.window.document;
});

afterAll(() => {
  delete global.window;
  delete global.document;
});

const FortDashboard = require('../app.js');

describe('FortDashboard unit tests', () => {
  test('calculateSystemHealth should create proper alerts for Cache and device issues', () => {
    const d = new FortDashboard();

    d.dataSource = 'Cache';
    d.lastCacheUpdate = '2025-01-01T12:00:00Z';
    d.data = {
      fortiaps: [{ name: 'AP1', status: 'up', clients_connected: 3 }],
      fortiswitches: [
        {
          name: 'SW1',
          status: 'warning',
          temperature: 70,
          poe_power_percentage: 85,
          poe_power_consumption: 50,
          poe_power_budget: 60,
          model: '548-abc',
          fan_status: 'warning'
        }
      ]
    };

    d.calculateSystemHealth();
    expect(d.data.system_health).toBeDefined();
    const alerts = d.data.system_health.alerts;
    expect(Array.isArray(alerts)).toBe(true);

    // Should include an info alert about using cache
    expect(alerts.some(a => a.type === 'info' && a.device === 'System')).toBe(true);
    // Should include warnings for the switch (status/warning, temp, poe, fan)
    expect(alerts.some(a => a.device === 'SW1' && a.type === 'warning')).toBe(true);
    expect(alerts.some(a => a.device === 'SW1' && a.message && a.message.includes('High temperature'))).toBe(true);
    expect(alerts.some(a => a.device === 'SW1' && a.message && a.message.includes('PoE utilization'))).toBe(true);
    expect(alerts.some(a => a.device === 'SW1' && a.message && a.message.includes('Fan issue'))).toBe(true);
  });

  test('calculateSystemHealth should create error alert when dataSource is Error', () => {
    const d = new FortDashboard();
    d.dataSource = 'Error';
    d.data = { fortiaps: [], fortiswitches: [] };

    d.calculateSystemHealth();
    const alerts = d.data.system_health.alerts;
    expect(alerts.some(a => a.device === 'System' && a.type === 'error')).toBe(true);
  });

  test('extractNodeData should extract data from node DOM element', () => {
    const d = new FortDashboard();

    const node = document.createElement('div');
    node.dataset.type = 'switch';
    node.dataset.nodeData = JSON.stringify({ foo: 'bar' });

    const name = document.createElement('span');
    name.className = 'node-name';
    name.textContent = 'MySwitch';
    node.appendChild(name);

    const status = document.createElement('span');
    status.className = 'node-status';
    status.textContent = 'up';
    node.appendChild(status);

    const ip = document.createElement('span');
    ip.className = 'node-ip';
    ip.textContent = '10.0.0.1';
    node.appendChild(ip);

    const model = document.createElement('span');
    model.className = 'node-model';
    model.textContent = 'ModelX';
    node.appendChild(model);

    const data = d.extractNodeData(node);
    expect(data.name).toBe('MySwitch');
    expect(data.type).toBe('switch');
    expect(data.status).toBe('up');
    expect(data.ip_address).toBe('10.0.0.1');
    expect(data.model).toBe('ModelX');
    expect(data.foo).toBe('bar');
  });

  test('expandAllHierarchy and collapseAllHierarchy should change display styles', () => {
    const d = new FortDashboard();

    // Create two nodes with children
    const child1 = document.createElement('div');
    child1.className = 'node-children';
    child1.style.display = 'none';
    document.body.appendChild(child1);

    const child2 = document.createElement('div');
    child2.className = 'node-children';
    child2.style.display = 'none';
    document.body.appendChild(child2);

    // toggles
    const toggle1 = document.createElement('button');
    toggle1.className = 'node-toggle';
    document.body.appendChild(toggle1);

    const toggle2 = document.createElement('button');
    toggle2.className = 'node-toggle';
    document.body.appendChild(toggle2);

    d.expandAllHierarchy();
    expect(child1.style.display).toBe('block');
    expect(child2.style.display).toBe('block');

    d.collapseAllHierarchy();
    expect(child1.style.display).toBe('none');
    expect(child2.style.display).toBe('none');

    // cleanup
    document.body.removeChild(child1);
    document.body.removeChild(child2);
    document.body.removeChild(toggle1);
    document.body.removeChild(toggle2);
  });
});
