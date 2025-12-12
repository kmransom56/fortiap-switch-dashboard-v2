/**
 * Complete Example: Export FortiGate Network Topology to Visio
 * 
 * This example demonstrates how to:
 * 1. Fetch topology data from FortiGate API
 * 2. Build device relationships and connections
 * 3. Export data in formats suitable for Visio
 * 
 * Usage:
 *   node examples/visio-export-example.js
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');

// ============================================================================
// Configuration
// ============================================================================

const config = {
  // Option 1: Use the dashboard API (recommended)
  useDashboardAPI: true,
  dashboardURL: 'http://localhost:13000',
  
  // Option 2: Direct FortiGate API access
  fortigate: {
    host: '192.168.1.1',
    port: 443,
    apiToken: 'YOUR_API_TOKEN_HERE',
    verifySSL: false
  },
  
  // Output options
  output: {
    json: './visio-topology.json',
    csvDevices: './visio-devices.csv',
    csvConnections: './visio-connections.csv',
    visioXML: './visio-diagram.xml'
  }
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch topology from dashboard API
 */
async function fetchFromDashboard() {
  console.log('Fetching topology from dashboard API...');
  
  try {
    const response = await axios.get(`${config.dashboardURL}/api/topology`);
    console.log('✓ Successfully fetched topology from dashboard');
    return response.data;
  } catch (error) {
    console.error('✗ Dashboard API error:', error.message);
    throw error;
  }
}

/**
 * Fetch topology directly from FortiGate
 */
async function fetchFromFortiGate() {
  console.log('Fetching topology from FortiGate API...');
  
  const httpsAgent = new https.Agent({
    rejectUnauthorized: config.fortigate.verifySSL
  });
  
  const baseURL = `https://${config.fortigate.host}:${config.fortigate.port}/api/v2`;
  const headers = {
    'Authorization': `Bearer ${config.fortigate.apiToken}`
  };
  
  try {
    // Fetch all required endpoints in parallel
    const [systemStatus, switches, aps, devices, switchBios] = await Promise.all([
      axios.get(`${baseURL}/monitor/system/status`, { headers, httpsAgent }),
      axios.get(`${baseURL}/monitor/switch-controller/managed-switch/port-stats`, { headers, httpsAgent }),
      axios.get(`${baseURL}/monitor/wifi/managed_ap`, { headers, httpsAgent }),
      axios.get(`${baseURL}/monitor/user/detected-device/query`, { headers, httpsAgent }).catch(() => ({ data: { results: [] } })),
      axios.get(`${baseURL}/monitor/switch-controller/managed-switch/bios`, { headers, httpsAgent }).catch(() => ({ data: { results: [] } }))
    ]);
    
    console.log('✓ Successfully fetched data from FortiGate');
    
    // Build topology structure
    return buildTopologyStructure(
      systemStatus.data.results,
      switches.data.results,
      aps.data.results,
      devices.data.results,
      switchBios.data.results
    );
  } catch (error) {
    console.error('✗ FortiGate API error:', error.message);
    throw error;
  }
}

/**
 * Build topology structure from raw API data
 */
function buildTopologyStructure(systemStatus, switches, aps, devices, switchBios) {
  // Build MAC to switch mapping
  const macToSwitch = {};
  switchBios.forEach(sw => {
    if (sw.bios && sw.bios.burn_in_mac) {
      macToSwitch[sw.bios.burn_in_mac.toLowerCase()] = sw.switch_id;
    }
  });
  
  // Transform switches
  const transformedSwitches = switches.map(sw => ({
    name: sw.name || sw['switch-id'] || 'Unknown',
    serial: sw.serial || 'Unknown',
    ip: sw.ip_address || sw['switch-id'] || 'Unknown',
    model: sw.model || 'FortiSwitch',
    firmware_version: sw.os_version || sw.version || 'Unknown',
    ports: Object.entries(sw.ports || {}).map(([portName, portData]) => ({
      port: portName,
      status: (portData['rx-packets'] > 0 || portData['tx-packets'] > 0) ? 'up' : 'down',
      rx_bytes: portData['rx-bytes'] || 0,
      tx_bytes: portData['tx-bytes'] || 0,
      poe_power: portData.poe_power || 0,
      speed: portData['rx-packets'] > 0 ? '1000M' : '0M'
    }))
  }));
  
  // Transform APs
  const transformedAPs = aps.map(ap => ({
    name: ap.name || ap.wtp_id || 'Unknown',
    serial: ap.serial || 'Unknown',
    ip: ap.local_ipv4_addr || ap.connecting_from || 'Unknown',
    model: ap.os_version?.split('-')[0] || 'FortiAP',
    firmware_version: ap.os_version || 'Unknown',
    status: ap.status === 'connected' ? 'up' : 'down',
    clients: ap.clients || 0,
    ssids: ap.ssid?.map(s => s.list).flat() || []
  }));
  
  // Build device connections
  const connections = devices.map(device => {
    const masterMac = device.master_mac ? device.master_mac.toLowerCase() : null;
    const switchId = masterMac ? macToSwitch[masterMac] : null;
    
    return {
      device_mac: device.mac,
      device_ip: device.ipv4_address,
      device_name: device.hostname,
      port: device.detected_interface,
      switch_id: switchId,
      online: device.is_online
    };
  });
  
  return {
    fortigate: {
      hostname: systemStatus.hostname || config.fortigate.host,
      ip: config.fortigate.host,
      serial: systemStatus.serial || 'Unknown',
      version: systemStatus.version || 'Unknown',
      model: systemStatus.model || 'FortiGate'
    },
    switches: transformedSwitches,
    aps: transformedAPs,
    connections: connections
  };
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export topology as JSON
 */
function exportJSON(topology) {
  const json = JSON.stringify(topology, null, 2);
  fs.writeFileSync(config.output.json, json);
  console.log(`✓ Exported JSON: ${config.output.json}`);
  return json;
}

/**
 * Export devices as CSV for Visio import
 */
function exportDevicesCSV(topology) {
  const rows = [
    ['Name', 'Type', 'IP Address', 'Model', 'Serial', 'Status', 'Firmware']
  ];
  
  // Add FortiGate
  rows.push([
    topology.fortigate.hostname,
    'FortiGate',
    topology.fortigate.ip,
    topology.fortigate.model,
    topology.fortigate.serial,
    'up',
    topology.fortigate.version
  ]);
  
  // Add switches
  topology.switches.forEach(sw => {
    rows.push([
      sw.name,
      'FortiSwitch',
      sw.ip_address || sw.ip || 'Unknown',
      sw.model,
      sw.serial,
      sw.ports && sw.ports.some(p => p.status === 'up') ? 'up' : 'down',
      sw.firmware_version
    ]);
  });
  
  // Add APs
  topology.aps.forEach(ap => {
    rows.push([
      ap.name,
      'FortiAP',
      ap.ip_address || ap.ip || 'Unknown',
      ap.model,
      ap.serial,
      ap.status,
      ap.firmware_version
    ]);
  });
  
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  fs.writeFileSync(config.output.csvDevices, csv);
  console.log(`✓ Exported devices CSV: ${config.output.csvDevices}`);
  return csv;
}

/**
 * Export connections as CSV for Visio import
 */
function exportConnectionsCSV(topology) {
  const rows = [
    ['From Device', 'From Interface', 'To Device', 'To Interface', 'Status', 'Type', 'Speed', 'PoE']
  ];
  
  // Add FortiLink connections (FortiGate to Switches)
  topology.switches.forEach(sw => {
    rows.push([
      topology.fortigate.hostname,
      'fortilink',
      sw.name,
      'mgmt',
      'up',
      'FortiLink',
      '1000M',
      'N/A'
    ]);
  });
  
  // Add device connections (Switches to APs/devices)
  if (topology.connections) {
    topology.connections.forEach(conn => {
      if (conn.switch_id && conn.device_name) {
        const switchName = topology.switches.find(s => s.serial === conn.switch_id)?.name || conn.switch_id;
        rows.push([
          switchName,
          conn.port || 'unknown',
          conn.device_name,
          'eth0',
          conn.online ? 'up' : 'down',
          'Ethernet',
          '1000M',
          'Unknown'
        ]);
      }
    });
  }
  
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  fs.writeFileSync(config.output.csvConnections, csv);
  console.log(`✓ Exported connections CSV: ${config.output.csvConnections}`);
  return csv;
}

/**
 * Export as basic Visio XML format
 */
function exportVisioXML(topology) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<VisioDocument xmlns="http://schemas.microsoft.com/visio/2003/core">
  <DocumentProperties>
    <Title>FortiGate Network Topology</Title>
    <Creator>FortiGate Dashboard</Creator>
    <Subject>Network Infrastructure Diagram</Subject>
  </DocumentProperties>
  <Pages>
    <Page ID="0" Name="Network Topology">
      <PageSheet>
        <PageProps>
          <PageWidth>11</PageWidth>
          <PageHeight>8.5</PageHeight>
        </PageProps>
      </PageSheet>
      <Shapes>
`;

  let shapeID = 1;
  let y = 8;
  
  // Add FortiGate shape
  xml += `
        <Shape ID="${shapeID}" Type="Shape" Name="${topology.fortigate.hostname}">
          <XForm>
            <PinX>5.5</PinX>
            <PinY>${y}</PinY>
            <Width>1.5</Width>
            <Height>1</Height>
          </XForm>
          <Text>${topology.fortigate.hostname}\n${topology.fortigate.ip}</Text>
        </Shape>
`;
  shapeID++;
  y -= 2;
  
  // Add switch shapes
  let x = 2;
  topology.switches.forEach(sw => {
    xml += `
        <Shape ID="${shapeID}" Type="Shape" Name="${sw.name}">
          <XForm>
            <PinX>${x}</PinX>
            <PinY>${y}</PinY>
            <Width>1.5</Width>
            <Height>1</Height>
          </XForm>
          <Text>${sw.name}\n${sw.ip}</Text>
        </Shape>
`;
    shapeID++;
    x += 2;
  });
  
  y -= 2;
  x = 2;
  
  // Add AP shapes
  topology.aps.forEach(ap => {
    xml += `
        <Shape ID="${shapeID}" Type="Shape" Name="${ap.name}">
          <XForm>
            <PinX>${x}</PinX>
            <PinY>${y}</PinY>
            <Width>1</Width>
            <Height>1</Height>
          </XForm>
          <Text>${ap.name}\n${ap.ip}</Text>
        </Shape>
`;
    shapeID++;
    x += 2;
  });
  
  xml += `
      </Shapes>
    </Page>
  </Pages>
</VisioDocument>
`;
  
  fs.writeFileSync(config.output.visioXML, xml);
  console.log(`✓ Exported Visio XML: ${config.output.visioXML}`);
  return xml;
}

/**
 * Print topology summary to console
 */
function printSummary(topology) {
  console.log('\n' + '='.repeat(70));
  console.log('NETWORK TOPOLOGY SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n🔥 FortiGate: ${topology.fortigate.hostname}`);
  console.log(`   IP: ${topology.fortigate.ip}`);
  console.log(`   Model: ${topology.fortigate.model}`);
  console.log(`   Version: ${topology.fortigate.version}`);
  
  console.log(`\n🔀 FortiSwitches: ${topology.switches.length}`);
  topology.switches.forEach(sw => {
    const portsUp = sw.ports.filter(p => p.status === 'up').length;
    console.log(`   • ${sw.name} (${sw.ip}) - ${portsUp}/${sw.ports.length} ports up`);
  });
  
  console.log(`\n📡 FortiAPs: ${topology.aps.length}`);
  topology.aps.forEach(ap => {
    console.log(`   • ${ap.name} (${ap.ip}) - ${ap.clients} clients - ${ap.status}`);
  });
  
  if (topology.connections && topology.connections.length > 0) {
    console.log(`\n🔗 Detected Connections: ${topology.connections.length}`);
    const onlineCount = topology.connections.filter(c => c.online).length;
    console.log(`   Online: ${onlineCount} | Offline: ${topology.connections.length - onlineCount}`);
  }
  
  console.log('\n' + '='.repeat(70));
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('\n🚀 FortiGate Network Topology Export for Visio\n');
  
  try {
    // Step 1: Fetch topology data
    let topology;
    if (config.useDashboardAPI) {
      topology = await fetchFromDashboard();
    } else {
      topology = await fetchFromFortiGate();
    }
    
    // Step 2: Print summary
    printSummary(topology);
    
    // Step 3: Export in multiple formats
    console.log('\n📤 Exporting topology data...\n');
    exportJSON(topology);
    exportDevicesCSV(topology);
    exportConnectionsCSV(topology);
    exportVisioXML(topology);
    
    console.log('\n✅ Export complete! Files ready for Visio import.\n');
    console.log('Next steps:');
    console.log('1. Open Microsoft Visio');
    console.log('2. Import CSV files or use XML directly');
    console.log('3. Apply network stencils and styling');
    console.log('4. Customize layout and connections\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('• Check if dashboard server is running (npm start)');
    console.error('• Verify FortiGate API token is correct');
    console.error('• Ensure FortiGate is accessible from this machine');
    console.error('• Check firewall rules allow HTTPS traffic\n');
    process.exit(1);
  }
}

// Run the export
if (require.main === module) {
  main();
}

// Export functions for use as module
module.exports = {
  fetchFromDashboard,
  fetchFromFortiGate,
  exportJSON,
  exportDevicesCSV,
  exportConnectionsCSV,
  exportVisioXML
};
