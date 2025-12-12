# Unified FortiAP/Switch Dashboard Architecture

## 🏗️ Architecture Overview

The Unified FortiAP/Switch Dashboard integrates multiple visualization technologies and data sources into a cohesive platform for network monitoring and management.

### **Core Components**

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Architecture                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Shared API    │  │   3D Model      │  │   Combined      │ │
│  │   Gateway       │  │   Library       │  │   Dashboard     │ │
│  │                 │  │                 │  │                 │ │
│  │ • Node.js       │  │ • Authentic     │  │ • 2D Charts     │ │
│  │ • Python Bridge │  │   FortiGate     │  │ • 3D Topology   │ │
│  │ • Cache Layer   │  │   Models        │  │ • Hybrid View   │ │
│  │ • Config Mgmt   │  │ • Device Mapping│  │ • Advanced      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   FortiGate     │
                    │   Network       │
                    └─────────────────┘
```

---

## 🔄 Shared API Gateway

### **Purpose**
Acts as the central hub that bridges Node.js dashboard components with Python discovery services.

### **Key Features**
- **Multi-service coordination**: Manages API Gateway, Dashboard, and Babylon 3D services
- **Unified caching**: Shared cache layer for all components
- **Configuration management**: Centralized environment variable handling
- **Python bridge**: Seamless integration with Python discovery services

### **API Endpoints**
```
GET  /health                    - Service health status
GET  /config                    - Configuration information
GET  /api/topology              - Network topology data
GET  /api/3d-models             - 3D model library
POST /api/discover              - Trigger device discovery
POST /api/convert/vss           - VSS to SVG conversion
GET  /api/dashboard-data        - Combined dashboard data
GET  /api/3d-visualization      - 3D visualization data
```

### **Configuration**
```bash
# Service Ports
SHARED_API_PORT=13001
DASHBOARD_PORT=13000
BABYLON_3D_PORT=3001
PYTHON_API_PORT=13002

# Cache Settings
CACHE_TTL=300000
CACHE_CLEANUP_INTERVAL=60000

# Visualization Limits
MAX_SWITCHES=50
MAX_ACCESS_POINTS=100
MAX_ENDPOINTS=500
```

---

## 🎨 3D Model Library

### **Purpose**
Provides a shared, extensible library of authentic FortiGate 3D models for visualization.

### **Model Registry**
```javascript
{
  "fortigate-61e": {
    "name": "FortiGate-61E",
    "type": "firewall",
    "file": "fortigate-61e.glb",
    "metadata": {
      "vendor": "Fortinet",
      "category": "firewall",
      "ports": 8,
      "rack_units": 1
    }
  },
  "fortiswitch-124e-poe": { /* Switch model */ },
  "fortiap-231f": { /* Access Point model */ }
}
```

### **Device Mapping Logic**
- **Automatic detection**: Maps devices to models based on type, vendor, and model
- **Fallback hierarchy**: Exact match → Type match → Generic endpoint
- **Extensible**: Easy to add new models and device types

### **Model Management**
```javascript
// Add new model
await modelLibrary.addModel({
  name: 'FortiSwitch-148F',
  type: 'switch',
  file: 'fortiswitch-148f.glb',
  metadata: { ports: 48, poe_ports: 48 }
});

// Get model for device
const model = modelLibrary.getModelForDevice({
  type: 'switch',
  vendor: 'Fortinet',
  model: 'FortiSwitch-148F'
});
```

---

## 📊 Combined Dashboard

### **Visualization Types**

#### **1. Overview Dashboard**
- **Device statistics**: Total, online, offline devices
- **2D charts**: Device status, performance metrics, network traffic
- **Real-time updates**: Live data with configurable refresh intervals

#### **2. 3D Topology**
- **Interactive 3D scene**: Babylon.js powered visualization
- **Authentic models**: Real FortiGate device representations
- **Device interaction**: Click devices for detailed information
- **Keyboard controls**: R (reset), F (fullscreen), S (screenshot)

#### **3. Hybrid View**
- **Split interface**: 2D charts alongside 3D topology
- **Correlated data**: synchronized information across visualizations
- **Flexible layouts**: Horizontal or vertical arrangement

#### **4. Advanced Features**
- **Analytics panel**: Device trends, performance metrics, network health
- **VSS conversion**: Import Visio diagrams for network documentation
- **Discovery controls**: Configurable device discovery parameters
- **Performance monitoring**: API response times, error rates, uptime

### **User Interface**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: View Switcher | Visualization Switcher | Data Source │
├─────────────────────────────────────────────────────────────┤
│ Sidebar │ Main Dashboard Area                               │
│ - Filters│                                                 │
│ - Settings│  [Selected View Content]                        │
│ - Stats  │                                                 │
├─────────────────────────────────────────────────────────────┤
│ Controls Panel: Refresh | Live Toggle | Export | Layout    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Unified Configuration

### **Environment Variables**
```bash
# FortiGate Connection
FORTIGATE_HOST=192.168.1.99
FORTIGATE_USERNAME=admin
FORTIGATE_PASSWORD=secure_password
VERIFY_SSL=false

# Service Configuration
SHARED_API_PORT=13001
DASHBOARD_PORT=13000
BABYLON_3D_PORT=3001

# Performance Settings
CACHE_TTL=300000
COMPRESSION_LEVEL=6
RATE_LIMIT_REQUESTS=100

# Development Settings
NODE_ENV=development
DEBUG_MODE=false
HOT_RELOAD=true
```

### **Configuration Hierarchy**
1. **Environment variables** (highest priority)
2. **.env files** (shared/.env, babylon_3d/.env)
3. **Default values** (fallback)

---

## 🐳 Docker Deployment

### **Multi-Stage Build**
```dockerfile
# Node.js + Python environment
FROM node:18-alpine AS node-builder
RUN apk add --no-cache python3 py3-pip
# Install dependencies and copy application
```

### **Docker Compose Services**
- **api-gateway**: Main application with all services
- **redis**: Optional caching layer
- **nginx**: Optional reverse proxy for production

### **Deployment Commands**
```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js 14+**
- **Python 3.7+**
- **FortiGate** with admin access
- **Optional**: Docker, Redis

### **Installation**
```bash
# 1. Clone and setup
git clone <repository-url>
cd fortiap-switch-dashboard

# 2. Run integration script
chmod +x setup-unified.sh
./setup-unified.sh

# 3. Configure credentials
nano shared/.env

# 4. Start services
./start-dev.sh
```

### **Access Points**
- **Combined Dashboard**: http://localhost:13001
- **Original Dashboard**: http://localhost:13000
- **Babylon 3D**: http://localhost:3001

---

## 📱 Development Workflow

### **Development Mode**
```bash
# Start all services for development
./start-dev.sh

# Individual service development
npm run dev          # API Gateway
npm run dashboard    # Main Dashboard
npm run babylon      # Babylon 3D
```

### **Testing**
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### **Code Quality**
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Build verification
npm run build
```

---

## 🔍 Architecture Benefits

### **Unified Experience**
- **Single configuration**: One place to manage all settings
- **Consistent data**: Shared data sources across visualizations
- **Seamless integration**: Smooth transitions between 2D and 3D views

### **Performance Optimization**
- **Shared caching**: Reduces API calls and improves response times
- **Lazy loading**: 3D models loaded on-demand
- **Compression**: Optimized data transfer

### **Extensibility**
- **Modular design**: Easy to add new visualization types
- **Plugin architecture**: Support for custom device models
- **API-first**: Easy integration with external tools

### **Production Ready**
- **Docker support**: Containerized deployment
- **Health monitoring**: Built-in health checks and metrics
- **Security**: Rate limiting, input validation, secure configuration

---

## 🛠️ Troubleshooting

### **Common Issues**

#### **API Gateway Not Starting**
```bash
# Check configuration
node shared/api-gateway.js --check-config

# Verify environment
cat shared/.env

# Check logs
tail -f logs/api-gateway.log
```

#### **3D Models Not Loading**
```bash
# Verify model files
ls babylon_3d/babylon_app/network-visualizer/assets/models/

# Check model registry
cat shared/model-registry.json

# Test 3D service
curl http://localhost:13001/api/3d-models
```

#### **Python Discovery Issues**
```bash
# Test Python configuration
cd babylon_3d && python3 run_fortigate_discovery.py --config

# Check Python dependencies
pip3 list | grep -E "(requests|aiohttp)"

# Test FortiGate connection
python3 -c "import requests; print(requests.get('https://your-fortigate'))"
```

### **Performance Optimization**
- **Enable Redis**: Configure Redis for better caching
- **Adjust limits**: Tune device limits for your network size
- **Monitor metrics**: Use built-in performance monitoring

---

## 📚 API Reference

### **Shared API Gateway**
See the API endpoints section above for detailed endpoint documentation.

### **3D Model Library**
```javascript
// Model library methods
modelLibrary.addModel(modelData)
modelLibrary.getModelById(modelId)
modelLibrary.getModelsByType(type)
modelLibrary.getModelForDevice(device)
modelLibrary.exportLibrary()
```

### **Dashboard Events**
```javascript
// Event handling
dashboard.switchView('3d-topology')
dashboard.switchVisualization('hybrid')
dashboard.refreshAllData()
dashboard.toggleLiveData()
```

---

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Run `./setup-unified.sh`
3. Create feature branch
4. Make changes
5. Add tests
6. Submit pull request

### **Code Standards**
- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **Python Black**: Python formatting

---

## 📄 License

MIT License - see LICENSE file for details.

---

**Transform your FortiGate network monitoring from separate tools to a unified, powerful platform! 🌐✨**
