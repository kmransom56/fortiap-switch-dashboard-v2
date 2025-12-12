require('dotenv').config();
const https = require('https');
const axios = require('axios');

// Test if REST API feature is enabled on FortiGate
async function testApiFeature() {
  console.log('Testing FortiGate REST API feature status...\n');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;
  const apiToken = process.env.FORTIGATE_API_TOKEN;

  console.log(`Host: ${host}:${port}`);
  console.log(`Token: ${apiToken.substring(0, 10)}...\n`);

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  // Test 1: Try with Authorization header (recommended method)
  console.log('=== Test 1: Using Authorization header (Bearer token) ===');
  try {
    const response = await axios({
      method: 'get',
      url: `https://${host}:${port}/api/v2/monitor/system/status`,
      httpsAgent,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      },
      validateStatus: null,
      timeout: 10000
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log('✅ SUCCESS! API authentication works with Authorization header!');
      console.log('FortiGate Version:', response.data?.results?.version || 'Unknown');
      console.log('Hostname:', response.data?.results?.hostname || 'Unknown');
    } else if (response.status === 401) {
      console.log('❌ 401 Unauthorized with Authorization header');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 2: Try with URL parameter
  console.log('\n=== Test 2: Using URL parameter ===');
  try {
    const response = await axios({
      method: 'get',
      url: `https://${host}:${port}/api/v2/monitor/system/status?access_token=${apiToken}`,
      httpsAgent,
      headers: {
        'Accept': 'application/json'
      },
      validateStatus: null,
      timeout: 10000
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log('✅ SUCCESS! API authentication works with URL parameter!');
      console.log('FortiGate Version:', response.data?.results?.version || 'Unknown');
      console.log('Hostname:', response.data?.results?.hostname || 'Unknown');
    } else if (response.status === 401) {
      console.log('❌ 401 Unauthorized with URL parameter');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n=== Diagnostic Information ===');
  console.log('If both tests fail with 401, check the following in FortiGate CLI:');
  console.log('');
  console.log('1. Verify REST API is enabled:');
  console.log('   config system global');
  console.log('     get rest-api-key-url-query');
  console.log('   end');
  console.log('');
  console.log('2. Check if api-admin account is active:');
  console.log('   diagnose sys api-user list');
  console.log('');
  console.log('3. Verify no admin restrictions:');
  console.log('   config system admin');
  console.log('     edit api-admin');
  console.log('       get');
  console.log('   end');
}

testApiFeature();
