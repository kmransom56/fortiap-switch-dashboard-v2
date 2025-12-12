require('dotenv').config();
const https = require('https');
const axios = require('axios');

async function testAlternativeAuth() {
  console.log('Testing alternative FortiGate authentication methods...');

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

    // Method 1: Try /login endpoint instead of /logincheck
    console.log('\n=== Method 1: /login endpoint ===');
    try {
      const loginUrl = `https://${host}:${port}/login`;

      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('submit', 'Login');

      const response = await axios({
        method: 'post',
        url: loginUrl,
        httpsAgent,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 0,
        validateStatus: null
      });

      console.log(`Status: ${response.status}`);
      if (response.headers['set-cookie']) {
        console.log('Cookies received:', response.headers['set-cookie']);
      }

      if (response.status === 302 || response.headers.location) {
        console.log('✅ Redirect detected - possible success!');
        console.log('Redirect to:', response.headers.location);
      } else {
        console.log('Response contains login page:', response.data.includes('<title>FortiGate</title>'));

        // Show first 500 chars of response to see what we got
        const responseText = typeof response.data === 'string'
          ? response.data.substring(0, 500)
          : JSON.stringify(response.data).substring(0, 500);
        console.log('Response preview:', responseText + '...');

        // Check for success indicators
        if (response.data.includes('success') || response.data.includes('dashboard') || response.data.includes('main')) {
          console.log('✅ Response contains success indicators!');
        }
      }
    } catch (error) {
      console.log('Method 1 failed:', error.message);
    }

    // Method 2: Try basic authentication with API request
    console.log('\n=== Method 2: Basic Auth with API call ===');
    try {
      const apiUrl = `https://${host}:${port}/api/v2/monitor/system/status`;

      const auth = Buffer.from(`${username}:${password}`).toString('base64');

      const response = await axios({
        method: 'get',
        url: apiUrl,
        httpsAgent,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        validateStatus: null
      });

      console.log(`Status: ${response.status}`);
      if (response.status === 200) {
        console.log('✅ Basic auth API call successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('Basic auth failed with status:', response.status);
      }
    } catch (error) {
      console.log('Method 2 failed:', error.message);
    }

    // Method 3: Try session-based approach with GET first
    console.log('\n=== Method 3: Session-based with GET first ===');
    try {
      // First GET to establish session
      const getUrl = `https://${host}:${port}/login`;
      const getResponse = await axios({
        method: 'get',
        url: getUrl,
        httpsAgent,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 0,
        validateStatus: null
      });

      console.log(`GET status: ${getResponse.status}`);
      const sessionCookies = getResponse.headers['set-cookie'] || [];
      console.log('Session cookies:', sessionCookies);

      // Extract any session ID or CSRF token from the HTML response
      const htmlContent = getResponse.data;
      let csrfToken = '';
      const csrfMatch = htmlContent.match(/name="csrf_token"\s+value="([^"]+)"/);
      if (csrfMatch) {
        csrfToken = csrfMatch[1];
        console.log('Found CSRF token:', csrfToken);
      }

      // Now POST with session cookies
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      if (csrfToken) {
        formData.append('csrf_token', csrfToken);
      }
      formData.append('submit', 'Login');

      const postResponse = await axios({
        method: 'post',
        url: getUrl,
        httpsAgent,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': sessionCookies.map(cookie => cookie.split(';')[0]).join('; ')
        },
        maxRedirects: 0,
        validateStatus: null
      });

      console.log(`POST status: ${postResponse.status}`);
      if (postResponse.headers['set-cookie']) {
        console.log('Post-login cookies:', postResponse.headers['set-cookie']);
      }

      if (postResponse.status === 302 || postResponse.headers.location) {
        console.log('✅ Authentication successful with redirect!');
        console.log('Redirect location:', postResponse.headers.location);
      } else {
        console.log('Still showing login page after POST');
      }
    } catch (error) {
      console.log('Method 3 failed:', error.message);
    }

  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testAlternativeAuth();
