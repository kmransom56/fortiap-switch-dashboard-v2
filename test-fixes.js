#!/usr/bin/env node
/**
 * Test script to verify all API endpoints and functionality
 * Runs validation checks on the dashboard fixes
 */

const http = require('http');

const tests = [
  { method: 'GET', path: '/api/fortiaps', name: 'FortiAPs List' },
  { method: 'GET', path: '/api/fortiswitches', name: 'FortiSwitches List' },
  { method: 'GET', path: '/api/stats', name: 'Statistics Endpoint' },
  { method: 'GET', path: '/api/alerts', name: 'Alerts Endpoint' },
  { method: 'GET', path: '/api/connected-devices', name: 'Connected Devices' },
  { method: 'GET', path: '/api/historical', name: 'Historical Data' },
  { method: 'GET', path: '/api/topology', name: 'Topology Data' },
  { method: 'GET', path: '/api/status', name: 'API Status' },
  { method: 'GET', path: '/api/data-source', name: 'Data Source Info' },
  { method: 'GET', path: '/health', name: 'Health Check' }
];

const PORT = process.env.DASHBOARD_PORT || 13000;
const HOST = 'localhost';

console.log('\n🧪 Dashboard Endpoint Tests');
console.log('=' .repeat(50));
console.log(`Testing endpoints on ${HOST}:${PORT}\n`);

let passed = 0;
let failed = 0;
let skipped = 0;

async function testEndpoint(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: test.path,
      method: test.method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      const statusOk = res.statusCode >= 200 && res.statusCode < 400;
      const icon = statusOk ? '✓' : '✗';
      const status = `${res.statusCode} ${http.STATUS_CODES[res.statusCode]}`;
      
      console.log(`${icon} ${test.name.padEnd(25)} ${status}`);
      
      if (statusOk) {
        passed++;
      } else {
        failed++;
      }
      
      res.on('data', () => {}); // drain response
      res.on('end', () => resolve());
    });

    req.on('timeout', () => {
      console.log(`⏱ ${test.name.padEnd(25)} TIMEOUT`);
      skipped++;
      req.destroy();
      resolve();
    });

    req.on('error', (err) => {
      console.log(`✗ ${test.name.padEnd(25)} ERROR: ${err.code}`);
      if (err.code === 'ECONNREFUSED') {
        console.log(`  → Server not running on ${HOST}:${PORT}`);
        process.exit(1);
      }
      failed++;
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  for (const test of tests) {
    await testEndpoint(test);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  if (failed === 0) {
    console.log('✓ All endpoints are working!\n');
    return 0;
  } else {
    console.log('✗ Some endpoints failed. Check server logs.\n');
    return 1;
  }
}

// Check app.js for required methods
console.log('\n🔍 Code Quality Checks');
console.log('='.repeat(50));

const fs = require('fs');
const appJsContent = fs.readFileSync('./app.js', 'utf8');

const requiredMethods = [
  { name: 'toggleTheme', pattern: /toggleTheme\s*\(\s*\)\s*{/ },
  { name: 'setupWebSocket', pattern: /setupWebSocket\s*\(\s*\)\s*{/ },
  { name: 'setupAutoRefresh', pattern: /setupAutoRefresh\s*\(\s*\)\s*{/ },
  { name: 'refreshData', pattern: /async\s+refreshData\s*\(\s*\)\s*{/ },
  { name: 'handleDeviceStatusUpdate', pattern: /handleDeviceStatusUpdate\s*\(\s*data\s*\)\s*{/ },
  { name: 'handleConnectedDevicesUpdate', pattern: /handleConnectedDevicesUpdate\s*\(\s*data\s*\)\s*{/ },
  { name: 'handleTopologyUpdate', pattern: /handleTopologyUpdate\s*\(\s*data\s*\)\s*{/ },
  { name: 'handleStatsUpdate', pattern: /handleStatsUpdate\s*\(\s*data\s*\)\s*{/ }
];

let methodsPassed = 0;
let methodsFailed = 0;

requiredMethods.forEach(method => {
  if (method.pattern.test(appJsContent)) {
    console.log(`✓ Method: ${method.name}`);
    methodsPassed++;
  } else {
    console.log(`✗ Missing: ${method.name}`);
    methodsFailed++;
  }
});

// Check for socket.io in HTML
const htmlContent = fs.readFileSync('./index.html', 'utf8');
if (htmlContent.includes('socket.io')) {
  console.log('✓ Socket.IO client library loaded');
  methodsPassed++;
} else {
  console.log('✗ Socket.IO client library not found');
  methodsFailed++;
}

// Check API calls in loadData
const apiCalls = [
  { name: '/api/fortiaps', pattern: /fetch\(['"]\/api\/fortiaps['"]/ },
  { name: '/api/fortiswitches', pattern: /fetch\(['"]\/api\/fortiswitches['"]/ },
  { name: '/api/stats', pattern: /fetch\(['"]\/api\/stats['"]/ },
  { name: '/api/alerts', pattern: /fetch\(['"]\/api\/alerts['"]/ },
  { name: '/api/connected-devices', pattern: /fetch\(['"]\/api\/connected-devices['"]/ }
];

console.log('\nAPI Calls in loadData:');
apiCalls.forEach(call => {
  if (call.pattern.test(appJsContent)) {
    console.log(`✓ Loading: ${call.name}`);
    methodsPassed++;
  } else {
    console.log(`✗ Not loading: ${call.name}`);
    methodsFailed++;
  }
});

console.log('\n' + '='.repeat(50));
console.log(`Code checks: ${methodsPassed} passed, ${methodsFailed} failed\n`);

if (methodsFailed > 0) {
  console.log('⚠  Some code checks failed. Review app.js.\n');
  process.exit(1);
}

console.log('\n🚀 Running endpoint tests...\n');
await runTests();
