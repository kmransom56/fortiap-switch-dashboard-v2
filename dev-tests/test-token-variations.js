require('dotenv').config();
const https = require('https');
const axios = require('axios');

// Test different token parameter variations
async function testTokenVariations() {
  console.log('Testing different token parameter formats...\n');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;
  const apiToken = process.env.FORTIGATE_API_TOKEN;

  console.log(`Host: ${host}:${port}`);
  console.log(`Token: ${apiToken.substring(0, 10)}...\n`);

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  // Different ways tokens might be passed
  const testCases = [
    {
      name: 'access_token parameter',
      url: `https://${host}:${port}/api/v2/monitor/system/status?access_token=${apiToken}`,
      headers: { 'Accept': 'application/json' }
    },
    {
      name: 'api_key parameter',
      url: `https://${host}:${port}/api/v2/monitor/system/status?api_key=${apiToken}`,
      headers: { 'Accept': 'application/json' }
    },
    {
      name: 'Bearer header',
      url: `https://${host}:${port}/api/v2/monitor/system/status`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    },
    {
      name: 'Token header',
      url: `https://${host}:${port}/api/v2/monitor/system/status`,
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Accept': 'application/json'
      }
    },
    {
      name: 'X-API-Key header',
      url: `https://${host}:${port}/api/v2/monitor/system/status`,
      headers: {
        'X-API-Key': apiToken,
        'Accept': 'application/json'
      }
    },
    {
      name: 'format=json parameter with access_token',
      url: `https://${host}:${port}/api/v2/monitor/system/status?format=json&access_token=${apiToken}`,
      headers: { 'Accept': 'application/json' }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n=== Testing: ${testCase.name} ===`);
    
    try {
      const response = await axios({
        method: 'get',
        url: testCase.url,
        httpsAgent,
        headers: testCase.headers,
        validateStatus: null,
        timeout: 10000
      });

      console.log(`Status: ${response.status}`);

      if (response.status === 200) {
        console.log('✅ SUCCESS! This method works!');
        console.log('Response data keys:', Object.keys(response.data));
        if (response.data.results) {
          console.log('Version:', response.data.results.version);
          console.log('Hostname:', response.data.results.hostname);
        }
        console.log('\n🎯 Use this authentication method in server.js');
        return;
      } else if (response.status === 401) {
        console.log('❌ 401 Unauthorized');
      } else {
        console.log(`Status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n❌ All authentication methods failed');
  console.log('Next steps:');
  console.log('1. Verify api-admin is not disabled:');
  console.log('   config system admin');
  console.log('     edit api-admin');
  console.log('       show full-configuration');
  console.log('   Look for: set status enable (or no "set status disable")');
}

testTokenVariations();
