require('dotenv').config();
const https = require('https');
const axios = require('axios');

// Test FortiGate token-based authentication
async function testTokenAuth() {
  console.log('Testing FortiGate token-based authentication...');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;
  const apiToken = process.env.FORTIGATE_API_TOKEN;

  if (!apiToken) {
    console.error('❌ FORTIGATE_API_TOKEN not configured in .env file');
    console.log('Please create a REST API administrator in FortiGate and set the token:');
    console.log('FORTIGATE_API_TOKEN=fcNnhkpH8nNG7wmmnGt0yx178Qdn07');
    return;
  }

  console.log(`Host: ${host}:${port}`);
  console.log(`Token: ${apiToken.substring(0, 10)}...`);

  try {
    // Create HTTPS agent for self-signed certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    // Test different API endpoints with potentially different permission requirements
    const testEndpoints = [
      `https://${host}:${port}/api/v2/monitor/system/status`,
      `https://${host}:${port}/api/v2/cmdb/firewall/address`,
      `https://${host}:${port}/api/v2/monitor/system/time`
    ];

    for (const testUrl of testEndpoints) {
      console.log(`\nTesting API call to: ${testUrl}`);

      try {
        const response = await axios({
          method: 'get',
          url: testUrl,
          httpsAgent,
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          validateStatus: null,
          timeout: 10000
        });

        console.log(`Response status: ${response.status}`);

        if (response.status === 200) {
          console.log('✅ Token authentication successful!');
          console.log('Response data keys:', Object.keys(response.data));
          console.log('FortiGate version:', response.data?.results?.version || 'Unknown');
          console.log('FortiGate hostname:', response.data?.results?.hostname || 'Unknown');
          break; // Stop testing other endpoints if one works
        } else if (response.status === 401 || response.status === 403) {
          console.log('❌ Authentication failed - check permissions for this endpoint');
          console.log('Response data:', response.data);
        } else {
          console.log(`❌ Unexpected response: ${response.status}`);
          console.log('Response:', response.data);
        }
      } catch (endpointError) {
        console.log(`❌ Endpoint failed: ${endpointError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ API call failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection refused - check FortiGate IP/port');
    } else if (error.code === 'ENOTFOUND') {
      console.log('Host not found - check FortiGate hostname/IP');
    }
  }
}

testTokenAuth();
