require('dotenv').config();
const https = require('https');
const axios = require('axios');

// Test FortiGate token via URL parameter (rest-api-key-url-query enabled)
async function testUrlToken() {
  console.log('Testing FortiGate API token via URL parameter...');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;
  const apiToken = process.env.FORTIGATE_API_TOKEN;

  console.log(`Host: ${host}:${port}`);
  console.log(`Token: ${apiToken.substring(0, 10)}...`);
  console.log('\nNote: FortiGate has rest-api-key-url-query enabled');
  console.log('This means tokens are passed as URL parameters, not headers');

  try {
    // Create HTTPS agent for self-signed certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    // Test with token as URL parameter
    const testUrl = `https://${host}:${port}/api/v2/monitor/system/status?access_token=${apiToken}`;
    console.log(`\nTesting API call with token in URL...`);

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

    if (response.status === 200) {
      console.log('\n✅ SUCCESS! Token authentication via URL parameter works!');
      console.log('Response data keys:', Object.keys(response.data));
      if (response.data.results) {
        console.log('FortiGate version:', response.data.results.version || 'Unknown');
        console.log('FortiGate hostname:', response.data.results.hostname || 'Unknown');
        console.log('FortiGate serial:', response.data.results.serial || 'Unknown');
      }
      
      console.log('\n📝 Server Configuration:');
      console.log('Your FortiGate requires tokens in URL parameters (not headers)');
      console.log('The server.js file needs to be updated to use:');
      console.log('  ${url}?access_token=${token}');
      console.log('instead of:');
      console.log('  Authorization: Bearer ${token}');
      
    } else if (response.status === 401) {
      console.log('\n❌ Still getting 401 - token might be invalid');
      console.log('Try regenerating the token for api-admin');
    } else {
      console.log(`\n❌ Unexpected response: ${response.status}`);
      console.log('Response:', response.data);
    }

  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testUrlToken();
