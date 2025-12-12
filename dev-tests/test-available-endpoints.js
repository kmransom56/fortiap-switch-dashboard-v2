require('dotenv').config();
const https = require('https');
const axios = require('axios');

// Test which API endpoints are available on the FortiGate
async function testEndpoints() {
  console.log('Testing available FortiGate API endpoints...\n');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;
  const apiToken = process.env.FORTIGATE_API_TOKEN;

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  // List of endpoints to test
  const endpoints = [
    // System endpoints
    { name: 'System Status', path: '/api/v2/monitor/system/status' },
    
    // FortiAP endpoints
    { name: 'FortiAP Managed APs', path: '/api/v2/monitor/wifi/managed_ap' },
    { name: 'FortiAP Client', path: '/api/v2/monitor/wifi/client' },
    
    // FortiSwitch endpoints (various possibilities)
    { name: 'FortiSwitch Managed Switch', path: '/api/v2/monitor/switch-controller/managed-switch' },
    { name: 'FortiSwitch FSW Managed Switch', path: '/api/v2/monitor/switch-controller/fsw-managed-switch' },
    { name: 'FortiSwitch Summary', path: '/api/v2/monitor/switch-controller/managed-switch/summary' },
    
    // Historical/Stats endpoints
    { name: 'WiFi AP Stats', path: '/api/v2/monitor/wifi/ap_status' },
    { name: 'Switch Stats', path: '/api/v2/monitor/switch-controller/managed-switch/port-stats' }
  ];

  console.log('Testing endpoints:\n');

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: 'get',
        url: `https://${host}:${port}${endpoint.path}`,
        httpsAgent,
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        },
        validateStatus: null,
        timeout: 10000
      });

      if (response.status === 200) {
        console.log(`✅ ${endpoint.name}`);
        console.log(`   Path: ${endpoint.path}`);
        console.log(`   Status: ${response.status}`);
        if (response.data?.results) {
          console.log(`   Results: ${response.data.results.length} items`);
        }
        console.log('');
      } else if (response.status === 404) {
        console.log(`❌ ${endpoint.name}`);
        console.log(`   Path: ${endpoint.path}`);
        console.log(`   Status: 404 (Not Found - endpoint doesn't exist)`);
        console.log('');
      } else {
        console.log(`⚠️  ${endpoint.name}`);
        console.log(`   Path: ${endpoint.path}`);
        console.log(`   Status: ${response.status}`);
        console.log('');
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}`);
      console.log(`   Path: ${endpoint.path}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('\n=== Summary ===');
  console.log('This test shows which API endpoints are available on your FortiGate.');
  console.log('Endpoints returning 404 are not available and should be removed or updated.');
}

testEndpoints();
