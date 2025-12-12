# FortiGate Network Diagram Data Source Guide for Microsoft Visio

## 📋 Overview

This guide provides complete information on obtaining connected device data from FortiOS API to create network diagrams in Microsoft Visio. The data covers FortiGate, FortiSwitch, and FortiAP devices with their interconnections.

---

## 🔌 FortiOS API Endpoints Used

### **Base Configuration**
```javascript
Base URL: https://{FORTIGATE_HOST}:{PORT}/api/v2
Authentication: Bearer Token (REST API Token)
Default Port: 443
```

### **Key Endpoints for Network Mapping**

| Endpoint | Purpose | Data Returned |
|----------|---------|---------------|
| `/monitor/system/status` | FortiGate system info | Hostname, version, serial, model |
| `/monitor/switch-controller/managed-switch/port-stats` | FortiSwitch devices & ports | Switch details, port status, PoE, traffic stats |
| `/monitor/wifi/managed_ap` | FortiAP devices | AP details, clients, status, SSIDs |
| `/monitor/system/arp` | ARP table | Connected devices by IP/MAC |
| `/monitor/user/detected-device/query` | Detected devices | Wired clients with port bindings |
| `/monitor/switch-controller/managed-switch/bios` | Switch BIOS/MAC info | MAC addresses for device mapping |

---

## 🏗️ Complete Network Topology Structure

### **1. FortiGate (Core Firewall)**

**API Endpoint:** `/api/v2/monitor/system/status`

**Sample Response:**
```json
{
  "results": {
    "hostname": "FortiGate-61E",
    "version": "v7.4.3 build2573",
    "serial": "FG61E3X16800123",
    "model": "FortiGate-61E"
  }
}
```

**Visio Mapping:**
```javascript
{
  name: "FortiGate-61E",
  type: "firewall",
  ip: "192.168.1.1",
  model: "FortiGate-61E",
  serial: "FG61E3X16800123",
  firmware_version: "v7.4.3",
  role: "core",
  management_interface: "fortilink"
}
```

---

### **2. FortiSwitch Devices**

**API Endpoint:** `/api/v2/monitor/switch-controller/managed-switch/port-stats`

**Sample Response:**
```json
{
  "results": [
    {
      "name": "Core-Switch-1",
      "switch-id": "192.168.1.20",
      "serial": "S524DF4K15000024",
      "model": "FortiSwitch-524D-FPOE",
      "os_version": "7.6.4",
      "ip_address": "192.168.1.20",
      "ports": {
        "port1": {
          "rx-packets": 150234,
          "tx-packets": 142567,
          "rx-bytes": 98234567,
          "tx-bytes": 87234567,
          "poe_power": 15.4,
          "poe_max": 30.0,
          "poe_capable": true
        },
        "port2": {
          "rx-packets": 98765,
          "tx-packets": 95432,
          "rx-bytes": 67234567,
          "tx-bytes": 65234567,
          "poe_power": 12.8,
          "poe_max": 30.0,
          "poe_capable": true
        }
      }
    }
  ]
}
```

**Visio Mapping:**
```javascript
{
  name: "Core-Switch-1",
  type: "switch",
  ip: "192.168.1.20",
  serial: "S524DF4K15000024",
  model: "FortiSwitch-524D-FPOE",
  firmware_version: "7.6.4",
  ports_total: 24,
  ports_up: 20,
  ports_down: 4,
  poe_power_consumption: 485,
  poe_power_budget: 740,
  poe_power_percentage: 65.5,
  ports: [
    {
      port: "port1",
      status: "up",
      rx_bytes: 98234567,
      tx_bytes: 87234567,
      poe_power: 15.4,
      poe_enabled: true,
      speed: "1000M",
      connected_device: "FortiAP-431F"  // Derived from device detection
    }
  ]
}
```

---

### **3. FortiAP Access Points**

**API Endpoint:** `/api/v2/monitor/wifi/managed_ap`

**Sample Response:**
```json
{
  "results": [
    {
      "name": "Office-Floor1-AP1",
      "wtp_id": "Office-Floor1-AP1",
      "serial": "FP431FTF20012724",
      "os_version": "FAP431F-v7.4.3-build0624",
      "local_ipv4_addr": "192.168.1.10",
      "connecting_from": "192.168.1.10",
      "status": "connected",
      "connection_state": "connected",
      "clients": 12,
      "board_mac": "00:09:0F:12:34:56",
      "join_time": "2025-10-17T10:05:00Z",
      "ssid": [
        {
          "list": ["Corporate-WiFi", "Guest-WiFi"]
        }
      ],
      "radio": [
        {
          "detected_rogue_aps": 3
        }
      ],
      "sensors_temperatures": [45]
    }
  ]
}
```

**Visio Mapping:**
```javascript
{
  name: "Office-Floor1-AP1",
  type: "access_point",
  ip: "192.168.1.10",
  serial: "FP431FTF20012724",
  model: "FortiAP-431F",
  firmware_version: "7.4.3",
  status: "up",
  clients_connected: 12,
  ssids: ["Corporate-WiFi", "Guest-WiFi"],
  board_mac: "00:09:0F:12:34:56",
  temperature: 45,
  interfering_aps: 3,
  last_seen: "2025-10-17T10:05:00Z"
}
```

---

## 🔗 Device Connection Mapping

### **How to Map Connections**

To build the network topology, you need to correlate data from multiple endpoints:

#### **Step 1: Get Switch-to-FortiGate Connection**
- FortiGate manages switches via **FortiLink** interface
- Connection type: `fortilink`

```javascript
Connection: {
  from: "FortiGate-61E",
  to: "Core-Switch-1",
  interface: "fortilink",
  status: "up"
}
```

#### **Step 2: Get Device-to-Port Mapping**

**Endpoint:** `/api/v2/monitor/user/detected-device/query`

**Sample Response:**
```json
{
  "results": [
    {
      "mac": "00:09:0f:12:34:56",
      "ipv4_address": "192.168.1.10",
      "hostname": "Office-Floor1-AP1",
      "detected_interface": "port1",
      "master_mac": "08:5b:0e:ab:cd:ef",
      "is_online": true,
      "last_seen": "2025-10-17T10:05:00Z"
    }
  ]
}
```

#### **Step 3: Get Switch MAC Addresses**

**Endpoint:** `/api/v2/monitor/switch-controller/managed-switch/bios`

**Sample Response:**
```json
{
  "results": [
    {
      "switch_id": "S524DF4K15000024",
      "bios": {
        "burn_in_mac": "08:5b:0e:ab:cd:ef"
      }
    }
  ]
}
```

#### **Step 4: Correlate Data**

```javascript
// Algorithm to build connections:
1. Get all detected devices with their master_mac and port
2. Get all switches with their burn_in_mac (MAC address)
3. Match master_mac from detected devices to burn_in_mac from switches
4. This gives you: Device -> Port -> Switch mapping

Example:
- Device MAC: 00:09:0f:12:34:56 (Office-Floor1-AP1)
- Connected to port: port1
- Master MAC: 08:5b:0e:ab:cd:ef
- Switch with that MAC: Core-Switch-1 (serial: S524DF4K15000024)

Result Connection:
{
  from: "Core-Switch-1",
  port: "port1",
  to: "Office-Floor1-AP1",
  status: "up"
}
```

---

## 📊 Complete Topology Data Structure

This is the final structure used for drawing network diagrams:

```json
{
  "fortigate": {
    "hostname": "FortiGate-61E",
    "ip": "192.168.1.1",
    "model": "FortiGate-61E",
    "serial": "FG61E3X16800123",
    "version": "v7.4.3",
    "fortilink_interface": "fortilink"
  },
  "switches": [
    {
      "name": "Core-Switch-1",
      "serial": "S524DF4K15000024",
      "ip": "192.168.1.20",
      "model": "FortiSwitch-524D-FPOE",
      "firmware_version": "7.6.4",
      "status": "up",
      "ports_total": 24,
      "ports_up": 20,
      "mac_address": "08:5b:0e:ab:cd:ef",
      "ports": [
        {
          "port": "port1",
          "status": "up",
          "speed": "1000M",
          "poe_power": 15.4,
          "connected_device": {
            "type": "fortiap",
            "name": "Office-Floor1-AP1",
            "mac": "00:09:0f:12:34:56",
            "ip": "192.168.1.10"
          }
        }
      ]
    }
  ],
  "access_points": [
    {
      "name": "Office-Floor1-AP1",
      "serial": "FP431FTF20012724",
      "ip": "192.168.1.10",
      "model": "FortiAP-431F",
      "firmware_version": "7.4.3",
      "status": "up",
      "clients_connected": 12,
      "ssids": ["Corporate-WiFi", "Guest-WiFi"],
      "connected_to_switch": "Core-Switch-1",
      "connected_to_port": "port1"
    }
  ],
  "connections": [
    {
      "from": "FortiGate-61E",
      "from_interface": "fortilink",
      "to": "Core-Switch-1",
      "to_interface": "mgmt",
      "connection_type": "fortilink",
      "status": "up"
    },
    {
      "from": "Core-Switch-1",
      "from_interface": "port1",
      "to": "Office-Floor1-AP1",
      "to_interface": "eth0",
      "connection_type": "ethernet",
      "status": "up",
      "poe": true,
      "speed": "1000M"
    }
  ]
}
```

---

## 🎨 Visual Representation for Visio

### **Device Shapes in Visio**

| Device Type | Visio Shape | Color | Icon |
|-------------|-------------|-------|------|
| FortiGate | Firewall rectangle | Red/Orange | Firewall icon |
| FortiSwitch | Switch rectangle | Blue | Switch icon |
| FortiAP | AP circle/oval | Green | WiFi icon |
| Wired Client | Computer icon | Gray | Computer |
| Wireless Client | Laptop icon | Light blue | Laptop/Mobile |

### **Connection Types**

| Connection | Line Style | Label |
|------------|-----------|-------|
| FortiLink | Thick solid line | "FortiLink" |
| Ethernet (up) | Solid line | Port name + speed |
| Ethernet (down) | Dashed line | Port name |
| PoE | Double line | Port + PoE wattage |

---

## 💻 Code Examples

### **Node.js Example: Fetch Complete Topology**

```javascript
const axios = require('axios');
const https = require('https');

const fortiConfig = {
  host: '192.168.1.1',
  port: 443,
  apiToken: 'your_api_token_here'
};

async function makeFortiRequest(endpoint) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  const response = await axios({
    method: 'GET',
    url: `https://${fortiConfig.host}:${fortiConfig.port}/api/v2${endpoint}`,
    headers: {
      'Authorization': `Bearer ${fortiConfig.apiToken}`
    },
    httpsAgent
  });

  return response.data;
}

async function getNetworkTopology() {
  // Fetch all required data in parallel
  const [
    systemStatus,
    switches,
    accessPoints,
    detectedDevices,
    switchBios
  ] = await Promise.all([
    makeFortiRequest('/monitor/system/status'),
    makeFortiRequest('/monitor/switch-controller/managed-switch/port-stats'),
    makeFortiRequest('/monitor/wifi/managed_ap'),
    makeFortiRequest('/monitor/user/detected-device/query'),
    makeFortiRequest('/monitor/switch-controller/managed-switch/bios')
  ]);

  // Build MAC to switch mapping
  const macToSwitch = {};
  switchBios.results.forEach(sw => {
    if (sw.bios && sw.bios.burn_in_mac) {
      macToSwitch[sw.bios.burn_in_mac.toLowerCase()] = sw.switch_id;
    }
  });

  // Map devices to ports
  const deviceConnections = detectedDevices.results.map(device => {
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
      hostname: systemStatus.results.hostname,
      version: systemStatus.results.version,
      serial: systemStatus.results.serial,
      model: systemStatus.results.model
    },
    switches: switches.results,
    access_points: accessPoints.results,
    device_connections: deviceConnections
  };
}

// Usage
getNetworkTopology()
  .then(topology => {
    console.log(JSON.stringify(topology, null, 2));
    // Use this data to create Visio diagram
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### **PowerShell Example: Export to CSV for Visio**

```powershell
# Configuration
$FortiGateHost = "192.168.1.1"
$ApiToken = "your_api_token_here"
$Headers = @{
    "Authorization" = "Bearer $ApiToken"
}

# Ignore SSL certificate warnings
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

# Function to make API calls
function Get-FortiData {
    param($Endpoint)
    $Uri = "https://${FortiGateHost}:443/api/v2$Endpoint"
    $Response = Invoke-RestMethod -Uri $Uri -Headers $Headers -Method Get
    return $Response.results
}

# Get topology data
$Switches = Get-FortiData "/monitor/switch-controller/managed-switch/port-stats"
$AccessPoints = Get-FortiData "/monitor/wifi/managed_ap"
$DetectedDevices = Get-FortiData "/monitor/user/detected-device/query"

# Export switches to CSV
$Switches | Select-Object name, serial, ip_address, model, os_version | 
    Export-Csv -Path "switches.csv" -NoTypeInformation

# Export access points to CSV
$AccessPoints | Select-Object name, serial, local_ipv4_addr, os_version, status, clients | 
    Export-Csv -Path "access_points.csv" -NoTypeInformation

# Export connections to CSV
$Connections = $DetectedDevices | Select-Object `
    @{Name="Device";Expression={$_.hostname}},
    @{Name="MAC";Expression={$_.mac}},
    @{Name="IP";Expression={$_.ipv4_address}},
    @{Name="Port";Expression={$_.detected_interface}},
    @{Name="SwitchMAC";Expression={$_.master_mac}}

$Connections | Export-Csv -Path "connections.csv" -NoTypeInformation

Write-Host "Exported topology data to CSV files:"
Write-Host "- switches.csv"
Write-Host "- access_points.csv"
Write-Host "- connections.csv"
```

---

## 🔐 Authentication Setup

### **Creating FortiGate API Token**

1. **Login to FortiGate Web UI**
2. **Navigate to**: System > Administrators
3. **Create REST API Admin**:
   - Click "Create New" > "REST API Admin"
   - Name: `api-dashboard`
   - Administrator profile: `prof_admin` (read-only recommended)
   - Trusted Hosts: Add your server IP
   - Click "OK" and **copy the generated token immediately**

4. **Set Token in Configuration**:
```env
FORTIGATE_API_TOKEN=your_generated_token_here
```

---

## 📦 Using the Existing Dashboard API

### **Our Topology Endpoint**

The dashboard already provides a unified topology endpoint:

**Endpoint:** `GET http://localhost:13000/api/topology`

**Response Structure:**
```json
{
  "fortigate": { ... },
  "switches": [ ... ],
  "aps": [ ... ],
  "totals": {
    "wired_clients": 45,
    "wireless_clients": 32
  },
  "timestamp": "2025-10-17T14:30:00.000Z"
}
```

**Usage Example:**
```javascript
// Fetch from our API
fetch('http://localhost:13000/api/topology')
  .then(response => response.json())
  .then(topology => {
    // Use topology data for Visio diagram
    createVisioConnections(topology.switches, topology.aps);
  });
```

---

## 🛠️ Visio Integration Approaches

### **Approach 1: Export to Visio XML Format**

```javascript
function exportToVisioXML(topology) {
  // Build Visio XML structure
  const visioXML = `
<?xml version="1.0" encoding="UTF-8"?>
<VisioDocument>
  <Pages>
    <Page>
      <PageSheet>
        <PageProps>
          <PageWidth>11</PageWidth>
          <PageHeight>8.5</PageHeight>
        </PageProps>
      </PageSheet>
      <Shapes>
        ${generateFortiGateShape(topology.fortigate)}
        ${topology.switches.map(sw => generateSwitchShape(sw)).join('\n')}
        ${topology.aps.map(ap => generateAPShape(ap)).join('\n')}
      </Shapes>
      <Connects>
        ${generateConnections(topology)}
      </Connects>
    </Page>
  </Pages>
</VisioDocument>
  `;
  
  return visioXML;
}
```

### **Approach 2: Use Visio COM Automation (Windows)**

```powershell
# PowerShell script using Visio COM
$Visio = New-Object -ComObject Visio.Application
$Visio.Visible = $true
$Document = $Visio.Documents.Add("")
$Page = $Document.Pages.Item(1)

# Load network shapes stencil
$Stencil = $Visio.Documents.OpenEx("Network.vss", 4)
$FirewallMaster = $Stencil.Masters.Item("Firewall")
$SwitchMaster = $Stencil.Masters.Item("Ethernet Switch")

# Get topology data from API
$TopologyJson = Invoke-RestMethod -Uri "http://localhost:13000/api/topology"

# Draw FortiGate
$FortiGateShape = $Page.Drop($FirewallMaster, 4.25, 8)
$FortiGateShape.Text = $TopologyJson.fortigate.hostname

# Draw switches
$x = 2
foreach ($switch in $TopologyJson.switches) {
    $SwitchShape = $Page.Drop($SwitchMaster, $x, 6)
    $SwitchShape.Text = $switch.name
    $x += 2
    
    # Draw connection from FortiGate to Switch
    $Connector = $Page.Drop($Page.Application.ConnectorToolDataObject, 0, 0)
    $Connector.CellsU("BeginX").GlueTo($FortiGateShape.CellsU("PinX"))
    $Connector.CellsU("EndX").GlueTo($SwitchShape.CellsU("PinX"))
}

$Document.SaveAs("C:\NetworkDiagram.vsdx")
```

### **Approach 3: Generate CSV for Visio Import**

```javascript
function exportToCSV(topology) {
  // Devices CSV
  const devicesCsv = [
    ['Name', 'Type', 'IP', 'Model', 'Serial', 'Status'],
    [topology.fortigate.hostname, 'FortiGate', topology.fortigate.ip, 
     topology.fortigate.model, topology.fortigate.serial, 'up'],
    ...topology.switches.map(sw => 
      [sw.name, 'FortiSwitch', sw.ip_address, sw.model, sw.serial, sw.status]),
    ...topology.aps.map(ap => 
      [ap.name, 'FortiAP', ap.ip_address, ap.model, ap.serial, ap.status])
  ].map(row => row.join(',')).join('\n');

  // Connections CSV
  const connectionsCsv = [
    ['From', 'To', 'Port', 'Status', 'Type'],
    [topology.fortigate.hostname, 'All Switches', 'fortilink', 'up', 'FortiLink'],
    ...buildConnectionRows(topology)
  ].map(row => row.join(',')).join('\n');

  return { devicesCsv, connectionsCsv };
}
```

---

## 📚 Additional Resources

### **FortiOS API Documentation**
- Official: https://docs.fortinet.com/document/fortigate/latest/rest-api-reference
- Monitor Endpoints: `/api/v2/monitor/*`
- Configuration Endpoints: `/api/v2/cmdb/*`

### **Dashboard Files Reference**
- Main server: `server.js` (lines 592-758 for topology logic)
- Data transforms: 
  - `transformFortiAPData()` (lines 435-453)
  - `transformFortiSwitchData()` (lines 458-521)
- Sample data: `dashboard_data.yaml`
- API docs: `API_DOCUMENTATION.md`

### **Visio Automation**
- Visio COM Reference: https://learn.microsoft.com/en-us/office/vba/api/visio.shape
- Visio XML Format: https://learn.microsoft.com/en-us/office/client-developer/visio/visio-xml-reference

---

## ✅ Testing Your Integration

### **1. Test API Connectivity**
```bash
# Test FortiGate API
curl -k -H "Authorization: Bearer YOUR_TOKEN" \
  https://192.168.1.1:443/api/v2/monitor/system/status

# Test Dashboard API
curl http://localhost:13000/api/topology
```

### **2. Validate Data Structure**
```javascript
// Check if all required fields are present
const topology = await fetch('http://localhost:13000/api/topology').then(r => r.json());

console.log('FortiGate:', topology.fortigate.hostname);
console.log('Switches:', topology.switches.length);
console.log('APs:', topology.aps.length);
console.log('Connections:', topology.connections?.length || 'Not implemented');
```

### **3. Test Visio Export**
```powershell
# Test PowerShell Visio automation
$Visio = New-Object -ComObject Visio.Application
Write-Host "Visio Version: $($Visio.Version)"
$Visio.Quit()
```

---

## 🎯 Next Steps for Visio Integration

1. **Choose Integration Method**:
   - COM Automation (Windows only, direct control)
   - XML Export (cross-platform, requires Visio to open)
   - CSV Import (simplest, manual steps in Visio)

2. **Create Device Mapping**:
   - Map device types to Visio stencil shapes
   - Define visual layout algorithm (hierarchical, radial, etc.)

3. **Implement Connection Logic**:
   - Draw lines between connected devices
   - Add labels for port numbers and speeds
   - Color-code by connection type or status

4. **Add Metadata**:
   - Attach device properties to shapes
   - Include tooltips with detailed information
   - Add data graphics for status indicators

5. **Automate Updates**:
   - Schedule periodic topology refreshes
   - Update Visio diagram with new devices
   - Highlight changes since last update

---

## 📞 Support

For issues or questions:
- Check `TOPOLOGY_TROUBLESHOOTING.md` for common issues
- Review `API_DOCUMENTATION.md` for endpoint details
- Examine `server.js` for implementation examples
- Test with `dashboard_data.yaml` fallback data

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-30  
**Compatible with:** FortiOS 6.4+, Node.js 18+, Microsoft Visio 2016+
