# Examples Directory

This directory contains practical examples for integrating FortiGate network topology data with external tools like Microsoft Visio.

## 📁 Files

### `visio-export-example.js`
Complete working example that exports FortiGate network topology data in multiple formats suitable for Microsoft Visio.

**Features:**
- Fetches topology from dashboard API or directly from FortiGate
- Exports to JSON, CSV, and Visio XML formats
- Prints topology summary to console
- Includes error handling and troubleshooting tips

**Usage:**
```bash
# Make sure the dashboard is running first
npm start

# Then run the example
node examples/visio-export-example.js
```

**Output Files:**
- `visio-topology.json` - Complete topology in JSON format
- `visio-devices.csv` - All devices (FortiGate, switches, APs)
- `visio-connections.csv` - All connections between devices
- `visio-diagram.xml` - Basic Visio XML format

### `import-to-visio-with-stencils.ps1` ⭐ NEW
Enhanced PowerShell script that automatically uses official Fortinet stencils for devices.

**Features:**
- Automatically loads Fortinet stencils from `shared/fortinet/`
- Maps devices to appropriate stencil shapes
- Supports FortiGate, FortiSwitch, FortiAP icons
- Falls back to basic shapes if stencils not available
- Professional network diagrams with authentic Fortinet icons

**Usage:**
```powershell
# Basic usage (uses topology from current directory)
.\examples\import-to-visio-with-stencils.ps1

# Specify custom paths
.\examples\import-to-visio-with-stencils.ps1 `
  -JsonFile "my-topology.json" `
  -OutputFile "MyNetwork.vsdx" `
  -StencilPath ".\shared\fortinet"
```

**Available Stencils:**
- FortiGate Series (R22 2025Q2)
- FortiSwitch Series (R14 2025Q2)  
- FortiAP Series (R8 2025Q2)
- Fortinet Icons (R2 2025Q2)
- Accessories and Other Products (R4 2021Q3)

### `list-stencil-shapes.ps1`
Utility script to browse all available shapes in Fortinet stencils.

**Features:**
- Lists all shapes in each stencil file
- Shows shape names and types
- Exports to CSV for reference
- Helps you discover available icons

**Usage:**
```powershell
# Browse shapes (display in console)
.\examples\list-stencil-shapes.ps1

# Export to CSV file
.\examples\list-stencil-shapes.ps1 -ExportToFile

# Use custom stencil path
.\examples\list-stencil-shapes.ps1 -StencilPath "C:\path\to\stencils"
```

### `import-to-visio.ps1`
Basic PowerShell script for Visio diagram creation (no stencils).

**Features:**
- Creates diagrams with basic rectangles
- Simpler and faster
- No stencil dependencies

**Usage:**
```powershell
.\examples\import-to-visio.ps1
```

## 🚀 Quick Start

### 1. Start the Dashboard
```bash
npm start
```

### 2. Run the Example
```bash
node examples/visio-export-example.js
```

### 3. Import to Visio
Open Microsoft Visio and import the generated CSV files:
1. File → New → Blank Drawing
2. Data → Link Data to Shapes
3. Select `visio-devices.csv`
4. Use the connection data to draw links

## ⚙️ Configuration

Edit `visio-export-example.js` to customize:

```javascript
const config = {
  // Use dashboard API (recommended)
  useDashboardAPI: true,
  dashboardURL: 'http://localhost:13000',
  
  // Or use direct FortiGate API access
  fortigate: {
    host: '192.168.1.1',
    apiToken: 'YOUR_API_TOKEN_HERE'
  },
  
  // Output file paths
  output: {
    json: './visio-topology.json',
    csvDevices: './visio-devices.csv',
    csvConnections: './visio-connections.csv'
  }
};
```

## 📊 Example Output

### Devices CSV Format
```csv
"Name","Type","IP Address","Model","Serial","Status","Firmware"
"FortiGate-61E","FortiGate","192.168.1.1","FortiGate-61E","FG61E3X16800123","up","v7.4.3"
"Core-Switch-1","FortiSwitch","192.168.1.20","FortiSwitch-524D-FPOE","S524DF4K15000024","up","7.6.4"
"Office-Floor1-AP1","FortiAP","192.168.1.10","FortiAP-431F","FP431FTF20012724","up","7.4.3"
```

### Connections CSV Format
```csv
"From Device","From Interface","To Device","To Interface","Status","Type","Speed","PoE"
"FortiGate-61E","fortilink","Core-Switch-1","mgmt","up","FortiLink","1000M","N/A"
"Core-Switch-1","port1","Office-Floor1-AP1","eth0","up","Ethernet","1000M","Unknown"
```

## 🛠️ Advanced Usage

### Use as a Module
```javascript
const visioExport = require('./examples/visio-export-example');

// Fetch topology
const topology = await visioExport.fetchFromDashboard();

// Export specific formats
visioExport.exportJSON(topology);
visioExport.exportDevicesCSV(topology);
```

### Direct FortiGate API Access
```javascript
// Edit config in the example file
const config = {
  useDashboardAPI: false,
  fortigate: {
    host: '192.168.1.1',
    port: 443,
    apiToken: 'your_token_here',
    verifySSL: false
  }
};
```

## 📚 Related Documentation

- **Full Guide**: `../VISIO_NETWORK_DIAGRAM_GUIDE.md`
- **Quick Reference**: `../QUICK_API_REFERENCE.md`
- **API Documentation**: `../API_DOCUMENTATION.md`
- **Troubleshooting**: `../TOPOLOGY_TROUBLESHOOTING.md`

## 💡 Tips

1. **Start Simple**: Use the dashboard API first - it's easier and more reliable
2. **Test Connection**: Run `curl http://localhost:13000/api/topology` to verify API is working
3. **Check Outputs**: Review the JSON file first to understand the data structure
4. **Customize**: Modify the export functions to match your specific needs

## 🔧 Troubleshooting

### Error: "Dashboard API error: connect ECONNREFUSED"
**Solution**: Make sure the dashboard server is running:
```bash
npm start
```

### Error: "FortiGate API error"
**Solution**: Check your API token and FortiGate connectivity:
```bash
curl -k -H "Authorization: Bearer YOUR_TOKEN" \
  https://192.168.1.1:443/api/v2/monitor/system/status
```

### Empty or Missing Data
**Solution**: 
- Verify FortiGate has managed switches/APs
- Check FortiLink is working
- Review `dashboard_data.yaml` for sample data structure

## 📝 License

Part of the Unified FortiAP/Switch Dashboard project.
