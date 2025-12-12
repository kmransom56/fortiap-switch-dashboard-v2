#!/usr/bin/env node
/**
 * Test script to verify FortiGate API connection and device data
 * 
 * Usage: node test-api-connection.js
 */

require('dotenv').config();
const https = require('https');
const axios = require('axios');

const fortiConfig = {
    host: process.env.FORTIGATE_HOST,
    port: process.env.FORTIGATE_PORT || 443,
    apiToken: process.env.FORTIGATE_API_TOKEN,
    verifySSL: process.env.FORTIGATE_VERIFY_SSL !== 'false'
};

async function testConnection() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FortiGate API Connection Test');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check configuration
    if (!fortiConfig.host) {
        console.error('❌ FORTIGATE_HOST not set in .env file');
        process.exit(1);
    }

    if (!fortiConfig.apiToken) {
        console.error('❌ FORTIGATE_API_TOKEN not set in .env file');
        process.exit(1);
    }

    console.log('Configuration:');
    console.log(`  Host: ${fortiConfig.host}`);
    console.log(`  Port: ${fortiConfig.port}`);
    console.log(`  SSL Verify: ${fortiConfig.verifySSL}`);
    console.log(`  Token: ${fortiConfig.apiToken.substring(0, 10)}...`);
    console.log('');

    // Create HTTPS agent
    const httpsAgent = new https.Agent({
        rejectUnauthorized: fortiConfig.verifySSL,
        keepAlive: true
    });

    // Create axios instance
    const session = axios.create({
        baseURL: `https://${fortiConfig.host}:${fortiConfig.port}`,
        headers: {
            'Authorization': `Bearer ${fortiConfig.apiToken}`,
            'Content-Type': 'application/json'
        },
        httpsAgent,
        timeout: 30000
    });

    // Test endpoints
    const endpoints = [
        { name: 'System Status', path: '/api/v2/monitor/system/status' },
        { name: 'FortiAPs', path: '/api/v2/monitor/wifi/managed_ap' },
        { name: 'FortiSwitches', path: '/api/v2/monitor/switch-controller/managed-switch/port-stats' },
        { name: 'Topology', path: '/api/v2/monitor/switch-controller/managed-switch/bios' }
    ];

    const results = {};

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing: ${endpoint.name}...`);
            const response = await session.get(endpoint.path);
            
            if (response.status === 200) {
                console.log(`  ✅ Success (${response.status})`);
                
                // Extract device models if applicable
                if (endpoint.path.includes('managed_ap') && response.data.results) {
                    const models = [...new Set(response.data.results.map(ap => {
                        const model = ap.os_version?.split('-')[0] || 'Unknown';
                        return model;
                    }))];
                    console.log(`  📱 Found ${response.data.results.length} APs`);
                    console.log(`  📋 Models: ${models.join(', ')}`);
                }
                
                if (endpoint.path.includes('managed-switch') && response.data.results) {
                    const models = [...new Set(response.data.results.map(sw => {
                        return sw.model || 'Unknown';
                    }))];
                    console.log(`  🔌 Found ${response.data.results.length} Switches`);
                    console.log(`  📋 Models: ${models.join(', ')}`);
                }
                
                results[endpoint.name] = { success: true, data: response.data };
            } else {
                console.log(`  ⚠️  Unexpected status: ${response.status}`);
                results[endpoint.name] = { success: false, status: response.status };
            }
        } catch (error) {
            console.log(`  ❌ Failed: ${error.message}`);
            if (error.response) {
                console.log(`     Status: ${error.response.status}`);
                console.log(`     Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
            }
            results[endpoint.name] = { success: false, error: error.message };
        }
        console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Test Summary');
    console.log('═══════════════════════════════════════════════════════════');
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    Object.entries(results).forEach(([name, result]) => {
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${name}`);
    });
    
    console.log('');
    console.log(`Results: ${successCount}/${totalCount} endpoints successful`);
    
    if (successCount === totalCount) {
        console.log('🎉 All tests passed! API connection is working.');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Check configuration and API permissions.');
        process.exit(1);
    }
}

// Run tests
testConnection().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
