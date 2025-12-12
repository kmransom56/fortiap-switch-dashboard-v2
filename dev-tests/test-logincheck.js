require('dotenv').config();
const https = require('https');
const axios = require('axios');

async function testLoginCheck() {
  console.log('Testing FortiGate logincheck authentication...');

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

    const url = `https://${host}:${port}/logincheck`;
    console.log(`\nPOST to: ${url}`);

    const data = {
      username: username,
      secretkey: password,
      ajax: '1'
    };

    console.log('Request data:', data);

    // Try different parameter combinations - FortiGate might expect 'password' instead of 'secretkey'
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);  // Try 'password' instead of 'secretkey'
    formData.append('submit', 'Login');     // Some FortiGates expect this
    // formData.append('ajax', '1');

    const response = await axios({
      method: 'post',
      url: url,
      httpsAgent,
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': `https://${host}:${port}/`
      },
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

    console.log('\nResponse data (first 1000 chars):');
    const responseText = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
    console.log(responseText.substring(0, 1000));

    // Check for success indicators
    const isSuccess =
      response.status === 200 &&
      responseText.includes('success') ||
      response.headers.location ||
      (response.headers['set-cookie'] &&
       response.headers['set-cookie'].some(cookie =>
         cookie.includes('APSCOOKIE') || cookie.includes('ccsrftoken')
       ));

    console.log(`\nAuthentication result: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

    if (isSuccess) {
      console.log('\n✅ Login appears successful!');
      console.log('Cookies for API requests:', response.headers['set-cookie']);
    } else {
      console.log('\n❌ Login failed or unclear response');
    }

  } catch (error) {
    console.error('Error during login:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testLoginCheck();
