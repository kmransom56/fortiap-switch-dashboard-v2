# Quick API Reference for Network Diagram Building

## 🚀 Quick Start

### **Single API Call to Get Everything**
```javascript
// Use our unified endpoint
fetch('http://localhost:13000/api/topology')
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## 📡 Direct FortiOS API Endpoints

### **Base Request Format**
```javascript
GET https://{FORTIGATE_IP}:443/api/v2{endpoint}
Headers: { "Authorization": "Bearer {API_TOKEN}" }
```

### **Core Endpoints**

| What You Need | Endpoint | Key Fields |
|---------------|----------|------------|
| **FortiGate Info** | `/monitor/system/status` | `hostname`, `serial`, `version`, `model` |
| **All Switches** | `/monitor/switch-controller/managed-switch/port-stats` | `name`, `serial`, `ports{}` |
| **All Access Points** | `/monitor/wifi/managed_ap` | `name`, `serial`, `local_ipv4_addr`, `clients` |
| **Device Connections** | `/monitor/user/detected-device/query` | `mac`, `detected_interface`, `master_mac` |
| **Switch MAC Addresses** | `/monitor/switch-controller/managed-switch/bios` | `switch_id`, `bios.burn_in_mac` |

---

## 🔗 Building Connections

### **3-Step Process**

```javascript
// Step 1: Get switch MAC addresses
const switchBios = await getFortiData('/monitor/switch-controller/managed-switch/bios');
const macToSwitch = {};
switchBios.results.forEach(sw => {
  macToSwitch[sw.bios.burn_in_mac.toLowerCase()] = sw.switch_id;
});

// Step 2: Get detected devices
const detected = await getFortiData('/monitor/user/detected-device/query');

// Step 3: Match devices to switches
const connections = detected.results.map(device => ({
  device_name: device.hostname,
  device_mac: device.mac,
  connected_to_port: device.detected_interface,
  connected_to_switch: macToSwitch[device.master_mac.toLowerCase()]
}));
```

---

## 📊 Data Structures

### **FortiGate**
```javascript
{
  hostname: "FortiGate-61E",
  ip: "192.168.1.1",
  serial: "FG61E3X16800123",
  model: "FortiGate-61E",
  version: "v7.4.3"
}
```

### **FortiSwitch**
```javascript
{
  name: "Core-Switch-1",
  serial: "S524DF4K15000024",
  ip: "192.168.1.20",
  model: "FortiSwitch-524D-FPOE",
  ports: {
    "port1": { rx_packets: 150234, poe_power: 15.4, status: "up" },
    "port2": { rx_packets: 98765, poe_power: 12.8, status: "up" }
  }
}
```

### **FortiAP**
```javascript
{
  name: "Office-Floor1-AP1",
  serial: "FP431FTF20012724",
  ip: "192.168.1.10",
  model: "FortiAP-431F",
  status: "connected",
  clients: 12,
  ssid: ["Corporate-WiFi", "Guest-WiFi"]
}
```

---

## 🎨 Visio Mapping

### **Device Types**
```
FortiGate   → Red/Orange Rectangle  → Firewall Icon
FortiSwitch → Blue Rectangle        → Switch Icon
FortiAP     → Green Circle          → WiFi Icon
```

### **Connections**
```
FortiGate ←[FortiLink]→ Switches
Switch    ←[port1/2/3]→ APs/Devices
```

---

## 💻 Code Examples

### **Node.js - Get Complete Topology**
```javascript
const axios = require('axios');

async function getTopology() {
  const response = await axios.get('http://localhost:13000/api/topology');
  return response.data;
}

getTopology().then(data => {
  console.log(`Switches: ${data.switches.length}`);
  console.log(`APs: ${data.aps.length}`);
});
```

### **PowerShell - Export to CSV**
```powershell
$Uri = "http://localhost:13000/api/topology"
$Topology = Invoke-RestMethod -Uri $Uri

$Topology.switches | Export-Csv "switches.csv" -NoTypeInformation
$Topology.aps | Export-Csv "aps.csv" -NoTypeInformation
```

### **Python - Draw Connections**
```python
import requests

topology = requests.get('http://localhost:13000/api/topology').json()

for switch in topology['switches']:
    print(f"Switch: {switch['name']}")
    for port in switch['ports']:
        if port.get('connected_device'):
            print(f"  Port {port['port']} → {port['connected_device']['name']}")
```

---

## 🔐 Authentication

### **Get API Token**
1. FortiGate GUI → System → Administrators
2. Create New → REST API Admin
3. Set profile to `prof_admin` (read-only)
4. Copy the generated token

### **Use Token**
```bash
curl -k -H "Authorization: Bearer YOUR_TOKEN" \
  https://192.168.1.1:443/api/v2/monitor/system/status
```

---

## ✅ Quick Tests

### **Test Dashboard API**
```bash
curl http://localhost:13000/api/topology
```

### **Test FortiGate API**
```bash
curl -k -H "Authorization: Bearer TOKEN" \
  https://192.168.1.1:443/api/v2/monitor/system/status
```

### **Test Visio COM (PowerShell)**
```powershell
$Visio = New-Object -ComObject Visio.Application
Write-Host $Visio.Version
$Visio.Quit()
```

---

## 📦 Using Dashboard Endpoints

| Endpoint | Returns | Use For |
|----------|---------|---------|
| `/api/topology` | Complete topology | Full network map |
| `/api/fortiswitches` | Switch list | Switch inventory |
| `/api/fortiaps` | AP list | AP inventory |
| `/api/status` | Connection status | Health check |

---

## 🎯 Visio Integration Steps

1. **Fetch Data**: `GET /api/topology`
2. **Create Shapes**: Map devices to Visio shapes
3. **Draw Connections**: Connect FortiGate → Switches → APs
4. **Add Labels**: Port numbers, IPs, status
5. **Style**: Color-code by status/type

---

## 📚 More Information

- **Full Guide**: `VISIO_NETWORK_DIAGRAM_GUIDE.md`
- **API Docs**: `API_DOCUMENTATION.md`
- **Troubleshooting**: `TOPOLOGY_TROUBLESHOOTING.md`
- **Code**: `server.js` (lines 592-758)

---

**Quick Reference v1.0** | FortiOS 6.4+ | Node.js 18+ | Visio 2016+
