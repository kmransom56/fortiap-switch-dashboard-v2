require('dotenv').config();
const https = require('https');
const axios = require('axios');

// Test if FortiGate REST API is enabled and accessible
async function testApiEnabled() {
  console.log('Testing if FortiGate REST API is enabled...');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;

  console.log(`Host: ${host}:${port}`);

  try {
    // Create HTTPS agent for self-signed certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    // Test 1: Check if API endpoint responds at all (without auth)
    console.log('\n=== Test 1: Check if API endpoint is accessible ===');
    const testUrl = `https://${host}:${port}/api/v2/monitor/system/status`;

    try {
      const response = await axios({
        method: 'get',
        url: testUrl,
        httpsAgent,
        headers: {
          'Accept': 'application/json'
        },
        validateStatus: null,
        timeout: 10000
      });

      console.log(`Response status: ${response.status}`);

      if (response.status === 401) {
        console.log('✅ API endpoint is accessible (401 = authentication required)');
        console.log('This confirms REST API is enabled and responding');
      } else if (response.status === 404) {
        console.log('❌ API endpoint not found (404)');
        console.log('REST API might not be enabled on FortiGate');
      } else {
        console.log(`Status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Cannot reach API endpoint:', error.message);
    }

    // Test 2: Check REST API configuration requirements
    console.log('\n=== Test 2: Configuration checklist ===');
    console.log('Please verify in FortiGate:');
    console.log('1. System > Feature Visibility > REST API = Enabled');
    console.log('2. System > Administrators > REST API Admin exists with super_admin profile');
    console.log('3. Token generated from: execute api-user generate-key <admin-name>');
    console.log('4. No trusted host restrictions (or your IP is in trusted hosts)');

    // Test 3: Try with different header formats
    console.log('\n=== Test 3: Testing token format variations ===');
    const tokens = [
      process.env.FORTIGATE_API_TOKEN,
      process.env.FORTINET_API_KEY
    ];

    for (const token of tokens) {
      if (!token) continue;

      console.log(`\nTrying token: ${token.substring(0, 10)}...`);

      try {
        const response = await axios({
          method: 'get',
          url: testUrl,
          httpsAgent,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          validateStatus: null,
          timeout: 10000
        });

        if (response.status === 200) {
          console.log('✅ SUCCESS! This token works!');
          console.log('Use this token:', token);
          break;
        } else {
          console.log(`Status ${response.status}: Token not accepted`);
        }
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testApiEnabled();
