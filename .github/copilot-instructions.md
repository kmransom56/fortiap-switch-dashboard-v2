# AI Agent Onboarding Guide

Purpose: Quickly onboard AI coding agents to be immediately productive in this codebase.

## Summary

This is a **multi-service Fortinet network monitoring dashboard** with 3D visualization and force-graph topology views.

**Core Services:**
- **Node.js/Express Dashboard** (`server.js`) — REST API, caching, FortiGate integration
- **Client Dashboard** (`app.js`) — DOM-first UI, ~2800 lines, handles rendering and user interactions
- **API Gateway** (`shared/api-gateway.js`) — Routes requests between services and Python discovery
- **Python Discovery** (`babylon_3d/`) — 3D visualization, device model conversion, network mapping
- **WebSocket & Logging** (`config/`) — Real-time updates, structured logging, rate limiting

**Why this matters:** Changes to API contracts, caching logic, or data shapes require coordinated updates across server, gateway, and frontend. The system is designed around resilience—cache fallback and YAML data sources keep the dashboard running even if FortiGate is unavailable.

## Architecture Quick Reference

### Request Flow
1. Browser loads `index.html` → loads `app.js` (browser-side dashboard)
2. `app.js` calls `/api/*` endpoints (served by `server.js`)
3. `server.js` makes HTTPS requests to FortiGate via `makeFortiRequest()`
4. Response is cached in `MemoryCache`, saved to `cache/*.json`, and returned
5. If FortiGate fails, `server.js` falls back to `dashboard_data.yaml`

### Key Components

| File | Purpose | Key Patterns |
|------|---------|--------------|
| `server.js` (1552 lines) | Primary API backend, caching layer, FortiGate HTTPS client | Uses `MemoryCache` class, rate limiters in middleware/, transforms data before caching |
| `app.js` (2841 lines) | Client-side rendering, DOM manipulation, event handling | Class `FortDashboard`, methods like `renderAPTable()`, `switchTab()`, imperative DOM updates |
| `shared/api-gateway.js` | Service router, Python process spawning, configuration loader | Express app that proxies to other services |
| `config/websocket.js` | Real-time broadcast channels, connection tracking | Used for live updates when clients subscribe to device changes |
| `middleware/` | Rate limiting, error handling, input validation | Apply to all routes in `server.js` |
| `cache/` | Fallback JSON files used if API unavailable | Copied from successful FortiGate responses |
| `dashboard_data.yaml` | YAML fallback data for when FortiGate is down | Manually maintained reference data |

## Caching Architecture

The system uses **two dedicated `MemoryCache` instances**:

```javascript
const memoryCache = new MemoryCache(300000);      // 5-minute TTL for API data
const topologyCache = new MemoryCache(60000);     // 1-minute TTL for topology
```

**MemoryCache class** (`server.js` line 145):
- `set(key, value)` — stores with TTL
- `get(key)` — returns value if not expired, else null
- `cleanup()` — removes expired entries (runs every 5 minutes)
- `startCleanup() / stopCleanup()` — lifecycle management

**Usage pattern:**
```javascript
const cached = memoryCache.get('GET:/api/fortiaps');
if (!cached) {
  const data = await makeFortiRequest('/monitor/system/interface');
  memoryCache.set('GET:/api/fortiaps', transformedData);
  saveDataToCache('fortiaps', transformedData);  // Also save to disk
}
```

## Critical Development Workflows

### Local Development
```bash
npm install                                    # Install Node deps
pip install -r babylon_3d/requirements.txt   # Install Python deps
npm run dashboard                              # Start server.js on port 13000
# In another terminal:
python babylon_3d/python_api_service.py       # Start Python service on port 13002
```

### Testing & Validation
```bash
npm test                                       # Jest tests (test/*.test.js)
npm run lint                                   # ESLint check
npm run format                                 # Prettier format
python -m pytest babylon_3d/                  # Python tests (if any)
python test-integration.py                    # Integration tests against real FortiGate
```

### Debugging
- **Browser DevTools:** `app.js` has keyboard shortcuts (Ctrl+D for debug mode, Ctrl+Shift+D for device export)
- **Console logs:** `server.js` uses `logger` from `config/logger.js` (not plain `console.log`)
- **Rate limiter:** Check `middleware/rateLimiter.js` for request limits
- **Error handler:** Centralized error handling in `middleware/errorHandler.js`

### Docker (Production)
```bash
docker-compose up -d                           # Starts all services
npm run docker:build && npm run docker:run    # Alternative
```

## Project-Specific Patterns

### 1. API Response Transformation
Always create small `transformX()` functions between FortiGate response and cache:

```javascript
// Example from server.js
function transformFortiAPData(rawResponse) {
  return rawResponse.results.map(ap => ({
    id: ap.id,
    name: ap.name,
    status: ap.connected ? 'online' : 'offline'
    // ... other fields
  }));
}
```

**Why:** Keeps the API handler readable, makes fallback data shapes consistent, enables easy UI updates.

### 2. Environment Variables
**Canonical source:** `shared/.env.example`

All env vars used by both Node and Python services should be defined there. Update it when:
- Adding a new feature with configuration (e.g., `MAX_DEVICES=100`)
- Changing credential structure (e.g., `FORTIGATE_API_TOKEN` vs username/password)
- Modifying cache TTLs, ports, or service addresses

### 3. Error Handling & Fallback
The dashboard **must remain functional when FortiGate is unavailable**:

```javascript
try {
  const data = await makeFortiRequest('/monitor/system/interface');
  memoryCache.set(cacheKey, data);
} catch (err) {
  console.error('FortiGate request failed:', err);
  // Fall back to cache or YAML
  const fallback = memoryCache.get(cacheKey) || loadYAMLData('fortiaps');
  res.json(fallback);
}
```

This pattern is non-negotiable—the UI should show stale data rather than a blank dashboard.

### 4. Cross-Service Communication
When changes touch multiple services:

| Change Type | Files to Update | Notes |
|-------------|-----------------|-------|
| New FortiGate API endpoint | `server.js` handler + `app.js` fetch call + test | Consider if gateway should own it |
| New cached field | `server.js` transform + `cache/*.json` + `dashboard_data.yaml` | Keep shapes in sync |
| New environment variable | `shared/.env.example` + `README.md` + `.env` files | Test in Docker |
| Breaking API response change | `server.js` endpoint + `app.js` parser + all integration tests | Major version bump |

## Hot Spots to Watch

1. **Cache invalidation timing** — TTLs are per-endpoint. Audit if adding frequent-update endpoints (battery level, signal strength).
2. **WebSocket broadcasts** — `config/websocket.js` sends updates to connected clients. Test with multiple browser tabs open.
3. **FortiGate API breaking changes** — New firmware versions may change endpoint responses. Add version-aware parsing if needed.
4. **Memory leaks in app.js** — 2800-line DOM-first file; watch for orphaned event listeners and circular references.
5. **Rate limiter bypass** — Check if `/health`, `/config` endpoints should have tighter limits.

## First-Edit Checklist

1. **Understand the flow:** Trace from `app.js` fetch → `server.js` route → `makeFortiRequest()` → cache/fallback
2. **Inspect the transform:** Find the relevant `transformX()` function; understand data shape
3. **Check cache key:** Look for how the endpoint cache key is constructed (usually `METHOD:path`)
4. **Update tests:** Add a test in `test/server.unit.test.js` or `test/api-endpoints.test.js`
5. **Verify fallback:** Ensure `dashboard_data.yaml` or `cache/*.json` has matching fallback data
6. **Lint & test:** `npm run lint && npm test` before pushing
7. **Manual test:** Use dev-tests (e.g., `node dev-tests/test-api.js`) to validate against a real FortiGate

## Common Patterns by File

### server.js Endpoint Pattern
```javascript
app.get('/api/fortiaps', asyncHandler(async (req, res) => {
  const cacheKey = 'GET:/api/fortiaps';
  const cached = memoryCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const raw = await makeFortiRequest('/monitor/system/interface/select?include=FortiAP');
    const transformed = transformFortiAPData(raw);
    memoryCache.set(cacheKey, transformed);
    saveDataToCache('fortiaps', transformed);
    res.json(transformed);
  } catch (err) {
    res.json(memoryCache.get(cacheKey) || fallbackAPData);
  }
}));
```

### app.js Data Loading Pattern
```javascript
async loadData() {
  try {
    const [aps, switches] = await Promise.all([
      fetch('/api/fortiaps').then(r => r.json()),
      fetch('/api/fortiswitches').then(r => r.json())
    ]);
    this.data = { aps, switches };
    this.render();
  } catch (err) {
    console.error('Load failed, using fallback:', err);
    this.loadFallbackData();
  }
}
```

## Service Ownership (Decision Tree)

- **New FortiGate endpoint?** → `server.js` + test in `test/api-endpoints.test.js`
- **New UI visualization?** → `app.js` + update `index.html` markup
- **3D model processing?** → `babylon_3d/` + Python scripts
- **Multi-service routing logic?** → `shared/api-gateway.js`
- **Real-time updates?** → `config/websocket.js` + client subscription in `app.js`

## Questions & Escalations

- "Should I add this endpoint to the gateway or server?" → Check if other services depend on it; prefer `server.js` unless Python discovery needs it.
- "What FortiGate API version are we targeting?" → Check `test-integration.py` for version-specific tests.
- "Can I add a new npm dependency?" → Check `package.json` for security/size concerns; get team approval first.