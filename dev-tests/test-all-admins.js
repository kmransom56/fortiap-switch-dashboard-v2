require('dotenv').config();
const https = require('https');
const axios = require('axios');

// Test all available tokens and admin accounts
async function testAllAdmins() {
  console.log('Testing all available REST API administrators...\n');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;

  // All tokens from .env
  const tokens = [
    { name: 'FORTIGATE_API_TOKEN', value: process.env.FORTIGATE_API_TOKEN },
    { name: 'FORTINET_API_KEY', value: process.env.FORTINET_API_KEY }
  ];

  try {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    console.log('Testing tokens from .env file:\n');

    for (const token of tokens) {
      if (!token.value) {
        console.log(`${token.name}: Not set`);
        continue;
      }

      console.log(`\n=== Testing ${token.name}: ${token.value.substring(0, 10)}... ===`);

      // Test with URL parameter
      const testUrl = `https://${host}:${port}/api/v2/monitor/system/status?access_token=${token.value}`;

      try {
        const response = await axios({
          method: 'get',
          url: testUrl,
          httpsAgent,
          headers: { 'Accept': 'application/json' },
          validateStatus: null,
          timeout: 10000
        });

        console.log(`Status: ${response.status}`);

        if (response.status === 200) {
          console.log('✅ SUCCESS! This token works!');
          console.log('Version:', response.data?.results?.version);
          console.log('Hostname:', response.data?.results?.hostname);
          console.log('\nUse this token in FORTIGATE_API_TOKEN');
          break;
        } else if (response.status === 401) {
          console.log('❌ 401 Unauthorized');
        } else {
          console.log(`❌ Status ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    console.log('\n\n=== Troubleshooting Steps ===');
    console.log('1. SSH into FortiGate and regenerate token:');
    console.log('   execute api-user generate-key api-admin');
    console.log('');
    console.log('2. Verify trusted hosts are removed:');
    console.log('   config system admin');
    console.log('     edit api-admin');
    console.log('       show');
    console.log('   Should show: unset trusthost1');
    console.log('');
    console.log('3. Verify admin profile has permissions:');
    console.log('   config system admin');
    console.log('     edit api-admin');
    console.log('       get accprofile');
    console.log('   Should show: super_admin');
    console.log('');
    console.log('4. Check if API admin is enabled:');
    console.log('   config system admin');
    console.log('     edit api-admin');
    console.log('       get status');
    console.log('   Should NOT show: status disable');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAllAdmins();
