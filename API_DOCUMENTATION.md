# API Documentation

## 📡 Unified FortiAP/Switch Dashboard API

### **Base URLs**
- **API Gateway**: `http://localhost:13001`
- **Python Service**: `http://localhost:13002`
- **Dashboard**: `http://localhost:13000`
- **3D Visualizer**: `http://localhost:3001`

---

## 🔍 Service Information

### **Health Check**
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-28T10:30:00.000Z",
  "services": {
    "api_gateway": "running",
    "python_service": "running",
    "cache": {
      "keys": 5,
      "hits": 42,
      "misses": 8,
      "ksize": 1024,
      "vsize": 2048
    }
  }
}
```

### **Service Information**
```http
GET /
```

**Response:**
```json
{
  "name": "FortiAP/Switch Dashboard API Gateway",
  "version": "2.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "config": "/config",
    "topology": "/api/topology",
    "models": "/api/3d-models",
    "dashboard": "/api/dashboard-data",
    "visualization": "/api/3d-visualization"
  }
}
```

### **Configuration**
```http
GET /config
```

**Response:**
```json
{
  "fortigate": {
    "host": "192.168.1.1",
    "port": 443,
    "verify_ssl": false
  },
  "services": {
    "dashboard_port": 13000,
    "babylon_3d_port": 3001,
    "python_api_port": 13002
  },
  "visualization": {
    "max_switches": 50,
    "max_access_points": 100,
    "max_endpoints": 500
  }
}
```

---

## 🌐 Network Topology

### **Get Network Topology**
```http
GET /api/topology
```

**Response:**
```json
{
  "fortigate": {
    "name": "FortiGate-61E",
    "serial": "FG61E3X16800123",
    "version": "v6.4.5",
    "ip": "192.168.1.1",
    "model": {
      "file": "fortigate.glb",
      "type": "firewall"
    }
  },
  "switches": [
    {
      "name": "FortiSwitch-124E",
      "serial": "FS124E3X16800456",
      "ip": "192.168.1.10",
      "ports": 24,
      "model": {
        "file": "fortiswitch.glb",
        "type": "switch"
      }
    }
  ],
  "access_points": [
    {
      "name": "FortiAP-221E",
      "serial": "FP221E3X16800789",
      "ip": "192.168.1.20",
      "ssid": "Corporate-WiFi",
      "model": {
        "file": "fortiap.glb",
        "type": "access_point"
      }
    }
  ],
  "endpoints": [],
  "models": {
    "firewall": {
      "file": "fortigate.glb",
      "type": "firewall"
    },
    "switch": {
      "file": "fortiswitch.glb",
      "type": "switch"
    },
    "access_point": {
      "file": "fortiap.glb",
      "type": "access_point"
    }
  },
  "visualization_config": {
    "max_switches": 50,
    "max_access_points": 100,
    "max_endpoints": 500
  }
}
```

---

## 🎨 3D Models

### **Get 3D Model Library**
```http
GET /api/3d-models
```

**Response:**
```json
{
  "fortigate": {
    "file": "fortigate.glb",
    "path": "/models/fortigate.glb",
    "size": 2048576,
    "type": "firewall"
  },
  "fortiswitch": {
    "file": "fortiswitch.glb",
    "path": "/models/fortiswitch.glb",
    "size": 1048576,
    "type": "switch"
  },
  "fortiap": {
    "file": "fortiap.glb",
    "path": "/models/fortiap.glb",
    "size": 524288,
    "type": "access_point"
  }
}
```

---

## 📊 Dashboard Data

### **Get Combined Dashboard Data**
```http
GET /api/dashboard-data
```

**Response:**
```json
{
  "topology": {
    "fortigate": {
      "name": "FortiGate-61E",
      "serial": "FG61E3X16800123"
    },
    "switches": [],
    "access_points": [],
    "endpoints": []
  },
  "models": {
    "firewall": { "file": "fortigate.glb", "type": "firewall" },
    "switch": { "file": "fortiswitch.glb", "type": "switch" },
    "access_point": { "file": "fortiap.glb", "type": "access_point" }
  },
  "fortiaps": [],
  "fortiswitches": [],
  "historical": []
}
```

---

## 🎮 3D Visualization

### **Get 3D Visualization Data**
```http
GET /api/3d-visualization
```

**Response:**
```json
{
  "topology": {
    "fortigate": {
      "name": "FortiGate-61E",
      "serial": "FG61E3X16800123",
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "model": {
        "file": "fortigate.glb",
        "type": "firewall"
      }
    },
    "switches": [],
    "access_points": []
  },
  "models": {
    "firewall": { "file": "fortigate.glb", "type": "firewall" },
    "switch": { "file": "fortiswitch.glb", "type": "switch" },
    "access_point": { "file": "fortiap.glb", "type": "access_point" }
  },
  "layout": {
    "camera": {
      "position": { "x": 0, "y": 10, "z": -20 }
    },
    "lighting": {
      "intensity": 0.8
    }
  }
}
```

---

## 🔍 Device Discovery

### **Trigger Device Discovery**
```http
POST /api/discover
Content-Type: application/json

{
  "device_type": "all",
  "timeout": 30,
  "include_endpoints": true
}
```

**Response:**
```json
{
  "status": "discovery_started",
  "discovery_id": "disco_20241128_103000",
  "parameters": {
    "device_type": "all",
    "timeout": 30,
    "include_endpoints": true
  },
  "estimated_completion": "2024-11-28T10:30:30.000Z"
}
```

---

## 📄 File Conversion

### **Convert VSS to SVG**
```http
POST /api/convert/vss
Content-Type: application/json

{
  "vss_file_path": "/path/to/network.vss",
  "output_format": "svg",
  "include_labels": true
}
```

**Response:**
```json
{
  "status": "conversion_started",
  "conversion_id": "conv_20241128_103000",
  "input_file": "/path/to/network.vss",
  "output_format": "svg",
  "estimated_completion": "2024-11-28T10:30:15.000Z"
}
```

---

## 🐍 Python Service Endpoints

The following endpoints are available directly on the Python service (Port 13002):

### **Python Service Topology**
```http
GET http://localhost:13002/topology
```

### **Python Service FortiAPs**
```http
GET http://localhost:13002/fortiaps
```

### **Python Service FortiSwitches**
```http
GET http://localhost:13002/fortiswitches
```

### **Python Service Historical Data**
```http
GET http://localhost:13002/historical
```

### **Python Service Discovery**
```http
POST http://localhost:13002/discover
Content-Type: application/json

{
  "device_type": "all"
}
```

---

## 🚨 Error Handling

### **Standard Error Response**
```json
{
  "error": "Error description",
  "timestamp": "2024-11-28T10:30:00.000Z",
  "status_code": 500
}
```

### **Common Error Codes**

| Status Code | Description | Example |
|-------------|-------------|---------|
| 400 | Bad Request | Invalid JSON in POST body |
| 404 | Not Found | Endpoint doesn't exist |
| 500 | Internal Error | Service unavailable |
| 503 | Service Unavailable | Python service not running |

---

## 🔐 Authentication

Currently, the API does not require authentication. This is planned for future releases:

### **Planned Authentication**
```http
Authorization: Bearer <token>
X-API-Key: <api-key>
```

---

## 📝 Usage Examples

### **JavaScript/Node.js**
```javascript
// Get topology data
const response = await fetch('http://localhost:13001/api/topology');
const topology = await response.json();

// Trigger discovery
const discovery = await fetch('http://localhost:13001/api/discover', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ device_type: 'all' })
});
```

### **Python**
```python
import requests

# Get topology
response = requests.get('http://localhost:13001/api/topology')
topology = response.json()

# Trigger discovery
discovery = requests.post('http://localhost:13001/api/discover', 
                          json={'device_type': 'all'})
```

### **cURL**
```bash
# Get topology
curl http://localhost:13001/api/topology

# Get health status
curl http://localhost:13001/health

# Trigger discovery
curl -X POST http://localhost:13001/api/discover \
  -H "Content-Type: application/json" \
  -d '{"device_type": "all"}'
```

---

## 🔄 WebSocket Events (Planned)

Future versions will support WebSocket connections for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:13001/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

### **Planned Events**
- `device_discovered` - New device found
- `topology_changed` - Network topology updated
- `service_status` - Service health changes
- `configuration_updated` - Settings changed

---

## 📊 Rate Limiting (Planned)

Future versions will implement rate limiting:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638220800
```

---

## 🧪 Testing the API

### **Health Check Test**
```bash
curl -w "\nHTTP Status: %{http_code}\n" \
     http://localhost:13001/health
```

### **Full API Test**
```bash
# Test all endpoints
python test-integration.py

# Manual endpoint testing
for endpoint in "/health" "/api/topology" "/api/3d-models"; do
  echo "Testing: $endpoint"
  curl -s "http://localhost:13001$endpoint" | jq .
done
```

---

## 📚 SDK Libraries (Planned)

Future releases will include official SDK libraries:

- **JavaScript/TypeScript**: `@fortiap/dashboard-sdk`
- **Python**: `fortiap-dashboard-sdk`
- **Go**: `github.com/fortiap/dashboard-sdk-go`

---

**For more information, see the main [README.md](README.md) or run the integration test suite.**
