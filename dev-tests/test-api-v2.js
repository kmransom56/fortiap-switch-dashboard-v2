require('dotenv').config();
const https = require('https');
const axios = require('axios');

async function testApiV2Auth() {
  console.log('Testing FortiGate API v2 authentication...');

  const host = process.env.FORTIGATE_HOST;
  const port = process.env.FORTIGATE_PORT;
  const username = process.env.FORTIGATE_USERNAME;
  const password = process.env.FORTIGATE_PASSWORD;

  console.log(`Host: ${host}:${port}`);
  console.log(`Username: ${username}`);

  try {
    // Create HTTPS agent for self-signed certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    const authUrl = `https://${host}:${port}/api/v2/authentication`;
    console.log(`\nPOST to: ${authUrl}`);

    const requestBody = {
      username: username,
      secretkey: password,
      ack_post_disclaimer: true,
      request_key: false
    };

    console.log('Request data:', requestBody);

    const response = await axios({
      method: 'post',
      url: authUrl,
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: JSON.stringify(requestBody),
      maxRedirects: 0,
      validateStatus: null
    });

    console.log(`\nResponse status: ${response.status}`);
    console.log('Response headers:', response.headers);

    if (response.headers['set-cookie']) {
      console.log('\nCookies received:');
      response.headers['set-cookie'].forEach((cookie, index) => {
        console.log(`  ${index + 1}: ${cookie}`);
      });
    }

    console.log('\nResponse data:');
    const responseData = typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data;
    console.log(JSON.stringify(responseData, null, 2));

    // Check for success according to API spec
    const isSuccess =
      response.status === 200 &&
      responseData &&
      responseData.status_code === 5 &&
      responseData.status_message === 'LOGIN_SUCCESS';

    console.log(`\nAuthentication result: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

    if (isSuccess) {
      console.log('\n✅ API v2 Login successful!');
      console.log('Cookies for API requests:', response.headers['set-cookie']);
    } else {
      console.log('\n❌ API v2 Login failed');
      console.log('Error details:', responseData);
    }

  } catch (error) {
    console.error('Error during API v2 authentication:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApiV2Auth();
