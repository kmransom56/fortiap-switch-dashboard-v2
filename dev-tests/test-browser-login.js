require('dotenv').config();
const https = require('https');
const axios = require('axios');

async function testBrowserStyleLogin() {
  console.log('Testing FortiGate login using browser-style authentication flow...');

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

    // Step 1: GET the login page to establish session
    console.log('\nStep 1: GET login page to establish session');
    const loginPageUrl = `https://${host}:${port}/`;

    const getResponse = await axios({
      method: 'get',
      url: loginPageUrl,
      httpsAgent,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      maxRedirects: 0,
      validateStatus: null
    });

    console.log(`GET response status: ${getResponse.status}`);

    if (getResponse.headers['set-cookie']) {
      console.log('Session cookies from GET:');
      getResponse.headers['set-cookie'].forEach((cookie, index) => {
        console.log(`  ${index + 1}: ${cookie}`);
      });
    }

    // Step 2: POST login credentials
    console.log('\nStep 2: POST login credentials');
    const loginUrl = `https://${host}:${port}/logincheck`;

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', encodeURIComponent(password));  // URL encode the password
    formData.append('submit', 'Login');

    // Use cookies from the GET request
    const cookieJar = getResponse.headers['set-cookie'] || [];

    const postResponse = await axios({
      method: 'post',
      url: loginUrl,
      httpsAgent,
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': `https://${host}:${port}/`,
        'Cookie': cookieJar.map(cookie => cookie.split(';')[0]).join('; ')
      },
      maxRedirects: 0,
      validateStatus: null
    });

    console.log(`POST response status: ${postResponse.status}`);
    console.log('POST response headers:', postResponse.headers);

    if (postResponse.headers['set-cookie']) {
      console.log('\nCookies received after login:');
      postResponse.headers['set-cookie'].forEach((cookie, index) => {
        console.log(`  ${index + 1}: ${cookie}`);
      });
    }

    console.log('\nResponse data (first 1000 chars):');
    const responseText = typeof postResponse.data === 'string'
      ? postResponse.data
      : JSON.stringify(postResponse.data);
    console.log(responseText.substring(0, 1000));

    // Check for success indicators
    const isRedirect = postResponse.status === 302 || postResponse.status === 301;
    const hasLocation = postResponse.headers.location;
    const hasAuthCookies = postResponse.headers['set-cookie'] &&
      postResponse.headers['set-cookie'].some(cookie =>
        cookie.includes('APSCOOKIE') || cookie.includes('ccsrftoken')
      );

    const isSuccess = isRedirect || hasLocation || hasAuthCookies ||
      (postResponse.status === 200 && !responseText.includes('<title>FortiGate</title>'));

    console.log(`\nAuthentication result: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

    if (isSuccess) {
      console.log('\n✅ Login appears successful!');
      console.log('Final cookies:', postResponse.headers['set-cookie']);
      if (postResponse.headers.location) {
        console.log('Redirect location:', postResponse.headers.location);
      }
    } else {
      console.log('\n❌ Login failed - still showing login page');
    }

  } catch (error) {
    console.error('Error during browser-style login:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testBrowserStyleLogin();
