# FortiAP/Switch Dashboard - Start Guide

## Quick Start

### Starting the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Or directly
node server.js
```

The server will start on **http://localhost:13000**

### Accessing the Dashboard

1. **Main Dashboard**: http://localhost:13000
   - Overview tab: System summary and statistics
   - FortiAPs tab: Access point details and metrics
   - FortiSwitches tab: Switch information and port status
   - Connected Devices tab: All connected network devices
   - Topology tab: Visual network topology
   - 3D View tab: Interactive 3D network visualization

2. **API Documentation**: http://localhost:13000/api-docs
   - Interactive Swagger/OpenAPI documentation
   - Test API endpoints directly from browser

3. **Health Check**: http://localhost:13000/health
   - Server health and uptime information

### API Endpoints

All API endpoints return JSON data:

- `GET /api/fortiaps` - FortiAP access points data
- `GET /api/fortiswitches` - FortiSwitch data
- `GET /api/connected-devices` - Connected devices
- `GET /api/topology` - Network topology
- `GET /api/historical` - Historical data
- `GET /api/status` - FortiGate connection status
- `GET /metrics` - Performance metrics
- `GET /health` - Health check

### WebSocket Real-Time Updates

The dashboard supports real-time updates via WebSocket:

```javascript
// Connect to WebSocket
ws://localhost:13000

// Subscribe to channels
- fortiaps: Real-time FortiAP updates
- fortiswitches: Real-time FortiSwitch updates
- devices: Real-time device updates
- topology: Real-time topology updates
```

## Testing

### Run All Tests

```bash
npm test
```

### Run End-to-End Tests (Application Testing)

```bash
# Run E2E tests (tests actual pages and functionality)
npm test test/e2e.test.js
```

### Run Specific Test Suites

```bash
# Unit tests
npm test test/server.unit.test.js

# API endpoint tests
npm test test/api-endpoints.test.js

# Middleware tests
npm test test/middleware.test.js

# WebSocket tests
npm test test/websocket.test.js
```

### Check Code Quality

```bash
# Run linter
npm run lint

# Run tests with coverage
npm test -- --coverage
```

## Troubleshooting

### Pages Are Blank

**Problem**: When you open http://localhost:13000, the page appears blank or doesn't load.

**Solutions**:

1. **Check if server is running**:
   ```bash
   # Check for running Node processes
   ps aux | grep node

   # If not running, start it
   npm start
   ```

2. **Check for errors in browser console**:
   - Open browser DevTools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab to see if CSS/JS files are loading

3. **Verify static files are being served**:
   - Visit http://localhost:13000/style.css
   - Visit http://localhost:13000/app.js
   - Both should return file contents, not 404

4. **Check server logs**:
   - Look for error messages in terminal where server is running
   - Verify server started successfully on port 13000

5. **Clear browser cache**:
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

### API Not Returning Data

**Problem**: API endpoints return empty arrays or error messages.

**Solutions**:

1. **Check FortiGate connection**:
   ```bash
   # Check API status
   curl http://localhost:13000/api/status
   ```

2. **Verify environment variables**:
   - Check `.env` file exists
   - Verify `FORTIGATE_HOST`, `FORTIGATE_API_KEY` are set correctly

3. **Check cache directory**:
   ```bash
   # Verify cache exists
   ls -la cache/

   # Check for cached data
   cat cache/fortiaps.json
   ```

4. **Use fallback data**:
   - Dashboard uses `dashboard_data.yaml` as fallback
   - Verify this file exists and contains sample data

### Port Already in Use

**Problem**: Error `EADDRINUSE: address already in use 0.0.0.0:13000`

**Solutions**:

```bash
# Find process using port 13000
lsof -i :13000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
PORT=13001 npm start
```

### Tests Pass But Application Doesn't Work

**Problem**: All tests pass but application pages are still blank.

**Explanation**:
- Unit tests run in `NODE_ENV=test` mode
- In test mode, the server doesn't actually start (to avoid port conflicts)
- The application needs to run in development or production mode

**Solution**:
```bash
# Start server in development mode (not test mode)
npm start

# Or explicitly set NODE_ENV
NODE_ENV=development npm start
```

## Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev  # Auto-reloads on file changes
   ```

2. **Open Dashboard**:
   - Navigate to http://localhost:13000

3. **Make Changes**:
   - Edit files in project directory
   - Server auto-reloads (if using npm run dev)
   - Refresh browser to see changes

4. **Run Tests**:
   ```bash
   npm test
   ```

5. **Check Code Quality**:
   ```bash
   npm run lint
   ```

6. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

## Configuration

### Environment Variables (.env)

```bash
# FortiGate Connection
FORTIGATE_HOST=your-fortigate-ip
FORTIGATE_API_KEY=your-api-key

# Server Configuration
PORT=13000
NODE_ENV=development

# CORS (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:13000
```

### Important Files

- `server.js` - Main Express server
- `index.html` - Dashboard UI
- `app.js` - Frontend JavaScript logic
- `style.css` - Dashboard styles
- `config/` - Server configuration files
- `test/` - Test files
- `middleware/` - Express middleware

## Production Deployment

1. **Set environment to production**:
   ```bash
   NODE_ENV=production npm start
   ```

2. **Use process manager** (recommended):
   ```bash
   # Install PM2
   npm install -g pm2

   # Start with PM2
   pm2 start server.js --name fortiap-dashboard

   # Monitor
   pm2 logs fortiap-dashboard

   # Auto-start on system boot
   pm2 startup
   pm2 save
   ```

3. **Configure reverse proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:13000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Support

For issues or questions:
- Check this guide first
- Review test files in `test/` directory for examples
- Check API documentation at http://localhost:13000/api-docs
- Review server logs for error messages
