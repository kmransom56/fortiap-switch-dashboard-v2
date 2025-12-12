# FortiAP/Switch Dashboard - Debugging Guide

## Issues Found and Fixed

### ✅ Issue 1: Missing Python Virtual Environment
**Problem**: Python packages couldn't be installed due to externally-managed environment.

**Solution**: Created a virtual environment:
```bash
cd /home/keransom/fortiap-switch-dashboard
python3 -m venv venv
source venv/bin/activate
pip install -r babylon_3d/requirements.txt
```

### ✅ Issue 2: Missing `aiohttp-cors` Dependency
**Problem**: Python service failed with `ModuleNotFoundError: No module named 'aiohttp_cors'`

**Solution**: 
- Installed the missing package: `pip install aiohttp-cors`
- Updated `babylon_3d/requirements.txt` to include `aiohttp-cors>=0.7.0`

### ✅ Issue 3: Missing `.env` Configuration File
**Problem**: Application needs environment configuration for FortiGate connection.

**Solution**: Created `.env` file from template:
```bash
cp shared/.env.example shared/.env
# Edit shared/.env with your FortiGate credentials
```

## Current Status

### ✅ Working Components
- **Node.js Dependencies**: Installed (`node_modules` exists)
- **Python Dependencies**: Installed in virtual environment
- **Configuration**: `.env` file created
- **Integration Tests**: All 6 component tests passing
- **API Gateway**: Starts successfully on port 13001
- **Dashboard Server**: Starts successfully on port 13000

### ⚠️ Services Status
- **API Gateway**: ✅ Ready (port 13001)
- **Dashboard**: ✅ Ready (port 13000)
- **Python Service**: ⚠️ Needs testing (port 13002)
- **Babylon 3D**: ⚠️ Not tested yet (port 3001)

## How to Run the Application

### Option 1: Manual Startup (Recommended for Debugging)

**Terminal 1 - API Gateway:**
```bash
cd /home/keransom/fortiap-switch-dashboard
node shared/api-gateway.js
```

**Terminal 2 - Dashboard:**
```bash
cd /home/keransom/fortiap-switch-dashboard
node server.js
```

**Terminal 3 - Python Service:**
```bash
cd /home/keransom/fortiap-switch-dashboard
source venv/bin/activate
python3 babylon_3d/python_api_service.py
```

**Terminal 4 - Babylon 3D (if needed):**
```bash
cd /home/keransom/fortiap-switch-dashboard/babylon_3d/babylon_app
node server.js
```

### Option 2: Using npm Scripts

```bash
cd /home/keransom/fortiap-switch-dashboard

# Start API Gateway only
npm start

# Start all services (requires concurrently)
npm run combined
```

### Option 3: Docker (if configured)

```bash
docker-compose up -d
```

## Testing the Services

### Run Integration Tests
```bash
cd /home/keransom/fortiap-switch-dashboard
source venv/bin/activate
python3 test-integration.py
```

### Manual Service Checks

**API Gateway:**
```bash
curl http://localhost:13001/health
curl http://localhost:13001/config
```

**Dashboard:**
```bash
curl http://localhost:13000/health
```

**Python Service:**
```bash
curl http://localhost:13002/topology
```

## Common Issues and Solutions

### Issue: Port Already in Use

**Check what's using the port:**
```bash
# Linux/WSL
netstat -tulpn | grep :13001
# Or
lsof -i :13001
```

**Kill the process:**
```bash
kill -9 <PID>
```

### Issue: Python Service Not Starting

**Check Python virtual environment:**
```bash
source venv/bin/activate
which python3  # Should show venv path
pip list | grep aiohttp  # Should show aiohttp and aiohttp-cors
```

**Check Python service directly:**
```bash
cd /home/keransom/fortiap-switch-dashboard
source venv/bin/activate
python3 babylon_3d/python_api_service.py
```

### Issue: Module Not Found Errors

**For Node.js:**
```bash
npm install
```

**For Python:**
```bash
source venv/bin/activate
pip install -r babylon_3d/requirements.txt
```

### Issue: FortiGate Connection Errors

**Check configuration:**
```bash
cat shared/.env | grep FORTIGATE
```

**Test FortiGate connectivity:**
```bash
curl -k https://<FORTIGATE_HOST>:<FORTIGATE_PORT>/api/v2/cmdb/system/status
```

### Issue: Environment Variables Not Loading

**Verify .env file location:**
- Should be at: `shared/.env`
- API Gateway looks for: `shared/.env`
- Python service uses environment variables directly

**Load environment manually:**
```bash
export $(cat shared/.env | xargs)
```

## Debug Mode

### Enable Debug Logging

**For Node.js services:**
```bash
DEBUG=* node shared/api-gateway.js
```

**For Python service:**
```bash
export DEBUG=true
python3 babylon_3d/python_api_service.py
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 13001 | http://localhost:13001 |
| Dashboard | 13000 | http://localhost:13000 |
| Python API | 13002 | http://localhost:13002 |
| Babylon 3D | 3001 | http://localhost:3001 |

## File Structure

```
fortiap-switch-dashboard/
├── shared/
│   ├── api-gateway.js          # Main API Gateway
│   ├── combined-dashboard.js   # Unified dashboard
│   └── .env                    # Configuration (create from .env.example)
├── babylon_3d/
│   ├── python_api_service.py   # Python discovery service
│   └── requirements.txt        # Python dependencies
├── server.js                   # Dashboard server
├── venv/                       # Python virtual environment
└── node_modules/               # Node.js dependencies
```

## Next Steps

1. **Configure FortiGate Connection**: Edit `shared/.env` with your FortiGate credentials
2. **Start Services**: Use manual startup method above
3. **Test Endpoints**: Use curl commands to verify services
4. **Access Dashboard**: Open http://localhost:13000 in browser
5. **Monitor Logs**: Watch terminal output for errors

## Useful Commands

```bash
# Check all services are running
curl http://localhost:13001/health
curl http://localhost:13000/health
curl http://localhost:13002/topology

# View logs
tail -f logs/*.log  # If logging to files

# Restart services
# Stop with Ctrl+C, then restart

# Clean restart
pkill -f "node.*api-gateway"
pkill -f "node.*server.js"
pkill -f "python.*python_api_service"
```

## Getting Help

1. Run integration tests: `python3 test-integration.py`
2. Check service health endpoints
3. Review terminal output for error messages
4. Check this debugging guide
5. Review README.md for architecture details

