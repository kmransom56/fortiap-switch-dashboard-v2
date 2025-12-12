require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const axios = require('axios');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;

// Enable compression for all responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// FortiGate API configuration
const fortiConfig = {
  host: process.env.FORTIGATE_HOST,
  username: process.env.FORTIGATE_USERNAME,
  password: process.env.FORTIGATE_PASSWORD,
  port: process.env.FORTIGATE_PORT || 443,
  apiToken: process.env.FORTIGATE_API_TOKEN,
  tokenExpiry: 60 * 14, // 14 minutes in seconds (tokens typically expire after 15 minutes)
};

// Cache file paths
const cachePath = path.join(__dirname, 'cache');
const fortiApCachePath = path.join(cachePath, 'fortiaps.json');
const fortiSwitchCachePath = path.join(cachePath, 'fortiswitches.json');
const historicalCachePath = path.join(cachePath, 'historical_data.json');

// Ensure cache directory exists
if (!fs.existsSync(cachePath)) {
  try {
    fs.mkdirSync(cachePath);
    console.log('Created cache directory');
  } catch (err) {
    console.error('Error creating cache directory:', err);
  }
}

// In-memory token storage
let apiToken = {
  value: null,
  expiresAt: 0
};

// In-memory cache with TTL for performance optimization
class MemoryCache {
  constructor(ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      performanceMetrics.cacheMisses++;
      return null;
    }
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      performanceMetrics.cacheMisses++;
      return null;
    }
    
    performanceMetrics.cacheHits++;
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
  
  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const memoryCache = new MemoryCache(300000); // 5 minutes
const topologyCache = new MemoryCache(60000); // 1 minute for topology data

// Clean up cache every 5 minutes
setInterval(() => {
  memoryCache.cleanup();
  topologyCache.cleanup();
}, 300000);

// Utility function for FortiOS token-based authentication
function getApiAuth() {
  // Check if API token is configured
  if (!fortiConfig.apiToken) {
    throw new Error('FORTIGATE_API_TOKEN not configured. Please create a REST API administrator in FortiGate and set the token in .env file.');
  }

  return {
    token: fortiConfig.apiToken,
    type: 'Bearer'
  };
}

// Optimized API request function with caching and connection pooling
async function makeFortiRequest(endpoint, method = 'GET', data = null, useCache = true) {
  const cacheKey = `${method}:${endpoint}`;
  
  // Check cache for GET requests
  if (useCache && method === 'GET') {
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${endpoint}`);
      return cached;
    }
  }

  performanceMetrics.apiCalls++;

  try {
    // Get API authentication (token-based)
    const auth = getApiAuth();

    // Create HTTPS agent for handling self-signed certificates with connection pooling
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !(process.env.FORTIGATE_VERIFY_SSL === 'false' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'),
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10,
      maxFreeSockets: 5
    });

    // Build the request URL - ensure proper API v2 format
    let url = endpoint;
    if (!endpoint.startsWith('/api/v2/')) {
      url = `/api/v2${endpoint}`;
    }

    // Create optimized axios instance
    const session = axios.create({
      baseURL: `https://${fortiConfig.host}:${fortiConfig.port}`,
      headers: {
        'Authorization': `${auth.type} ${auth.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Fortinet-Dashboard/1.0'
      },
      httpsAgent,
      timeout: 30000
    });

    const config = {
      method,
      url: url,
      timeout: 30000
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await session.request(config);

    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error('Authentication failed, please check your API token and permissions.');
      throw new Error(`Authentication failed with status ${response.status}. Please check your API token.`);
    }

    // Check for other API errors
    if (response.status >= 400) {
      let errorMsg = response.statusText;
      try {
        const errorData = typeof response.data === 'object'
          ? response.data
          : JSON.parse(response.data || '{}');
        errorMsg = errorData.error?.message ||
                  errorData.msg ||
                  JSON.stringify(errorData) ||
                  response.statusText;
      } catch (e) {
        errorMsg = response.statusText;
      }
      throw new Error(`API request failed with status ${response.status}: ${errorMsg}`);
    }

    // Return the response data
    let result;
    try {
      if (typeof response.data === 'string') {
        result = JSON.parse(response.data);
      } else {
        result = response.data;
      }
    } catch (e) {
      result = response.data;
    }

    // Cache successful GET requests
    if (useCache && method === 'GET' && result) {
      memoryCache.set(cacheKey, result);
    }

    return result;

  } catch (error) {
    console.error('Error making FortiOS API request:', error.message);
    if (error.response) {
      console.error('Response details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      });
    }
    throw error;
  }
}

// Load fallback data from YAML file
function loadFallbackData(type) {
  try {
    // First try to load from cache
    const cachedData = loadCachedData(type);
    if (cachedData) {
      console.log(`Using cached data for ${type}`);
      return cachedData;
    }
    
    // If no cached data, fall back to YAML
    const filePath = path.join(__dirname, 'dashboard_data.yaml');
    console.log(`Loading fallback data from: ${filePath}`);
    const yamlData = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(yamlData);
    return data[type] || [];
  } catch (error) {
    console.error('Error loading fallback data:', error);
    return [];
  }
}

// Function to load cached data
function loadCachedData(type) {
  let cacheFilePath;
  
  switch (type) {
    case 'fortiaps':
      cacheFilePath = fortiApCachePath;
      break;
    case 'fortiswitches':
      cacheFilePath = fortiSwitchCachePath;
      break;
    case 'historical_data':
      cacheFilePath = historicalCachePath;
      break;
    default:
      return null;
  }
  
  try {
    if (fs.existsSync(cacheFilePath)) {
      const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      
      // Check if cache is valid (not older than 24 hours)
      if (cachedData._timestamp && 
          (Date.now() - cachedData._timestamp) < 24 * 60 * 60 * 1000) {
        delete cachedData._timestamp; // Remove timestamp before returning
        return cachedData.data;
      }
    }
  } catch (error) {
    console.error(`Error loading cached data for ${type}:`, error);
  }
  
  return null;
}

// Function to save data to cache
function saveDataToCache(type, data) {
  let cacheFilePath;
  
  switch (type) {
    case 'fortiaps':
      cacheFilePath = fortiApCachePath;
      break;
    case 'fortiswitches':
      cacheFilePath = fortiSwitchCachePath;
      break;
    case 'historical_data':
      cacheFilePath = historicalCachePath;
      break;
    default:
      return;
  }
  
  try {
    // Add timestamp and save data
    const cacheData = {
      _timestamp: Date.now(),
      data: data
    };
    
    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));
    console.log(`Cached ${type} data saved successfully`);
  } catch (error) {
    console.error(`Error saving ${type} data to cache:`, error);
  }
}

// Transform FortiAP data to frontend format
function transformFortiAPData(aps) {
  return aps.map(ap => ({
    name: ap.name || ap.wtp_id,
    serial: ap.serial,
    model: ap.os_version?.split('-')[0] || 'FortiAP',
    ip_address: ap.local_ipv4_addr || ap.connecting_from,
    firmware_version: ap.os_version,
    clients_connected: ap.clients || 0,
    status: ap.status === 'connected' ? 'up' : 'down',
    temperature: ap.sensors_temperatures?.[0] || 0,
    last_seen: ap.join_time,
    interfering_aps: ap.radio?.find(r => r.detected_rogue_aps)?.detected_rogue_aps || 0,
    connection_state: ap.connection_state,
    board_mac: ap.board_mac,
    ssid: ap.ssid?.map(s => s.list).flat() || []
  }));
}

// API routes
app.get('/api/fortiaps', async (req, res) => {
  try {
    // Try to fetch from FortiGate API first
    const apiData = await makeFortiRequest('/monitor/wifi/managed_ap');
    if (apiData && apiData.results && apiData.results.length > 0) {
      console.log('Successfully retrieved FortiAP data from API');
      const transformedData = transformFortiAPData(apiData.results);
      saveDataToCache('fortiaps', transformedData);
      return res.json(transformedData);
    }
  } catch (error) {
    console.log('API call failed, falling back to cached/YAML data:', error.message);
  }

  // Fallback to cached or YAML data
  const fallbackData = loadFallbackData('fortiaps');
  return res.json(fallbackData);
});

// Transform FortiSwitch data to frontend format
function transformFortiSwitchData(switches) {
  return switches.map(sw => {
    // Calculate POE info and port status
    let poe_power_consumption = 0;
    let poe_power_budget = 0;
    let ports_with_poe = 0;
    let ports_total = 0;
    let ports_up = 0;
    let portsArray = [];
    
    // Convert ports object to array for frontend
    if (sw.ports && typeof sw.ports === 'object') {
      ports_total = Object.keys(sw.ports).length;
      
      Object.entries(sw.ports).forEach(([portName, portData]) => {
        // Count active ports (ports with traffic)
        if (portData['rx-packets'] > 0 || portData['tx-packets'] > 0) {
          ports_up++;
        }
        
        // Build port object for frontend
        const portObj = {
          port: portName,
          status: (portData['rx-packets'] > 0 || portData['tx-packets'] > 0) ? 'up' : 'down',
          'rx-bytes': portData['rx-bytes'] || 0,
          'tx-bytes': portData['tx-bytes'] || 0,
          'rx-packets': portData['rx-packets'] || 0,
          'tx-packets': portData['tx-packets'] || 0,
          poe_power: portData.poe_power || 0,
          poe_max: portData.poe_max || 0,
          poe_capable: portData.poe_capable || false
        };
        
        portsArray.push(portObj);
        
        // Calculate POE if available
        if (portData.poe_power) {
          poe_power_consumption += parseFloat(portData.poe_power) || 0;
          ports_with_poe++;
        }
        if (portData.poe_max) {
          poe_power_budget += parseFloat(portData.poe_max) || 0;
        }
      });
    }
    
    return {
      name: sw.name || sw['switch-id'] || 'Unknown',
      serial: sw.serial,
      model: sw.model || 'FortiSwitch',
      ip_address: sw.ip_address || sw['switch-id'] || 'Unknown',
      firmware_version: sw.os_version || sw.version || 'Unknown',
      status: ports_up > 0 ? 'up' : 'down',
      ports_total: ports_total,
      ports_up: ports_up,
      poe_power_consumption: Math.round(poe_power_consumption * 10) / 10,
      poe_power_budget: Math.round(poe_power_budget * 10) / 10,
      poe_power_percentage: poe_power_budget > 0 ? Math.round((poe_power_consumption / poe_power_budget) * 100) : 0,
      temperature: 0, // Port-stats endpoint doesn't provide temperature
      fan_status: 'ok',
      ports: portsArray
    };
  });
}

app.get('/api/fortiswitches', async (req, res) => {
  try {
    // Try to fetch from FortiGate API using port-stats endpoint (which exists)
    const apiData = await makeFortiRequest('/monitor/switch-controller/managed-switch/port-stats');
    if (apiData && apiData.results && apiData.results.length > 0) {
      console.log('Successfully retrieved FortiSwitch data from API');
      const transformedData = transformFortiSwitchData(apiData.results);
      saveDataToCache('fortiswitches', transformedData);
      return res.json(transformedData);
    }
  } catch (error) {
    console.log('API call failed, falling back to cached/YAML data:', error.message);
  }

  // Fallback to cached or YAML data
  const fallbackData = loadFallbackData('fortiswitches');
  return res.json(fallbackData);
});

app.get('/api/historical', async (req, res) => {
  try {
    // Try to fetch historical data from FortiGate API using ap_status endpoint (which exists)
    const apiData = await makeFortiRequest('/monitor/wifi/ap_status');
    if (apiData && apiData.results) {
      console.log('Successfully retrieved historical data from API');
      saveDataToCache('historical_data', apiData.results);
      return res.json(apiData.results);
    }
  } catch (error) {
    console.log('Historical API call failed, using fallback data:', error.message);
  }

  // Fallback to cached or YAML data
  const fallbackData = loadFallbackData('historical_data');
  res.json(fallbackData);
});

// Optimized Topology endpoint with caching and parallel API requests
app.get('/api/topology', async (req, res) => {
  try {
    // Check cache first
    const cachedTopology = topologyCache.get('topology');
    if (cachedTopology) {
      console.log('Returning cached topology data');
      return res.json(cachedTopology);
    }

    // Execute all API calls in parallel for better performance
    const [
      sysStatus,
      switchApi,
      apApi,
      arpApi,
      detectedApi,
      biosApi
    ] = await Promise.allSettled([
      makeFortiRequest('/monitor/system/status'),
      makeFortiRequest('/monitor/switch-controller/managed-switch/port-stats'),
      makeFortiRequest('/monitor/wifi/managed_ap'),
      makeFortiRequest('/monitor/system/arp').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/user/detected-device/query'),
      makeFortiRequest('/monitor/switch-controller/managed-switch/bios').catch(() => ({ results: [] }))
    ]);

    // Extract results from Promise.allSettled
    const sysStatusData = sysStatus.status === 'fulfilled' ? sysStatus.value : {};
    const switchData = switchApi.status === 'fulfilled' ? switchApi.value : { results: [] };
    const apData = apApi.status === 'fulfilled' ? apApi.value : { results: [] };
    const arpData = arpApi.status === 'fulfilled' ? arpApi.value : { results: [] };
    const detectedData = detectedApi.status === 'fulfilled' ? detectedApi.value : { results: [] };
    const biosData = biosApi.status === 'fulfilled' ? biosApi.value : { results: [] };

    // Process data
    const rawSwitches = (switchData && switchData.results) ? switchData.results : [];
    const switches = transformFortiSwitchData(rawSwitches);
    const rawAps = (apData && apData.results) ? apData.results : [];
    const aps = transformFortiAPData(rawAps);
    const arpResults = (arpData && arpData.results) ? arpData.results : [];
    const detectedDevices = (detectedData && detectedData.results) ? detectedData.results : [];

    // Get switch BIOS info to map master_mac to switch_id (for multi-switch environments)
    let switchBios = (biosData && biosData.results) ? biosData.results : [];
    let macToSwitchMap = {};
    
    macToSwitchMap = switchBios.reduce((map, sw) => {
      if (sw.switch_id && sw.bios && sw.bios.burn_in_mac) {
        const mac = String(sw.bios.burn_in_mac).toLowerCase();
        map[mac] = sw.switch_id;
      }
      return map;
    }, {});
    
    console.log('Switch MAC mapping created:', Object.keys(macToSwitchMap).length, 'switches mapped');

    // Normalize detected devices to MAC/port bindings with switch mapping
    const deviceBindings = detectedDevices
      .filter(d => d.mac && d.detected_interface)
      .map(d => {
        const deviceMac = String(d.mac).toLowerCase();
        const masterMac = d.master_mac ? String(d.master_mac).toLowerCase() : null;
        const switchId = masterMac && macToSwitchMap[masterMac] ? macToSwitchMap[masterMac] : null;
        
        return {
          mac: deviceMac,
          port: d.detected_interface,
          ip: d.ipv4_address,
          hostname: d.hostname,
          online: d.is_online,
          last_seen: d.last_seen,
          master_mac: masterMac,
          switch_id: switchId
        };
      });

    // Compute wired client counts per switch/port based on detected-device bindings with proper switch mapping
    const enrichedSwitches = switches.map(sw => {
      let wiredTotal = 0;
      const ports = (sw.ports || []).map(p => {
        // Match detected devices by both port name AND switch_id for multi-switch environments
        const bindingsForPort = deviceBindings.filter(b => {
          // If we have switch_id mapping, use it for accurate matching
          if (b.switch_id && sw.serial) {
            return b.port === p.port && b.switch_id === sw.serial;
          }
          // Fallback to port-only matching for single-switch or when mapping unavailable
          return b.port === p.port;
        });
        
        const uniqueMacs = new Set(bindingsForPort.map(b => b.mac));
        let wiredClients = uniqueMacs.size;

        // Fallback: if no detected bindings, very simple heuristic based on traffic
        if (wiredClients === 0) {
          const hasTraffic = (p['rx-packets'] || p['tx-packets'] || 0) > 0;
          wiredClients = hasTraffic ? 1 : 0;
        }

        wiredTotal += wiredClients;
        return {
          ...p,
          wired_clients: wiredClients,
          detected_devices: bindingsForPort
        };
      });

      return {
        ...sw,
        ports,
        wired_clients_total: wiredTotal
      };
    });

    const totalWirelessClients = aps.reduce((sum, ap) => sum + (ap.clients_connected || 0), 0);

    // Derive a more accurate global wired client count from ARP table
    const wiredFromArp = arpResults.filter(entry => {
      const ip = entry.ip || entry.ip_addr || '';
      // Exclude FortiGate itself
      if (ip === fortiConfig.host) return false;
      return !!ip;
    });

    const fortigateInfo = {
      hostname: sysStatusData?.results?.hostname || fortiConfig.host,
      version: sysStatusData?.results?.version || 'Unknown',
      serial: sysStatusData?.results?.serial || 'Unknown',
      ip: fortiConfig.host,
    };

    const topologyData = {
      fortigate: fortigateInfo,
      switches: enrichedSwitches,
      aps,
      totals: {
        // Prefer ARP-based count if available, otherwise fall back to heuristic per-switch total
        wired_clients: wiredFromArp.length || enrichedSwitches.reduce((sum, sw) => sum + (sw.wired_clients_total || 0), 0),
        wireless_clients: totalWirelessClients
      }
    };

    // Cache the topology data
    topologyCache.set('topology', topologyData);

    return res.json(topologyData);
  } catch (error) {
    console.error('Error building topology:', error.message);

    // Fallback: use cached / fallback AP and switch data without ARP correlation
    const fallbackSwitches = loadFallbackData('fortiswitches') || [];
    const fallbackAps = loadFallbackData('fortiaps') || [];

    return res.json({
      fortigate: {
        hostname: fortiConfig.host,
        version: 'Unknown',
        serial: 'Unknown',
        ip: fortiConfig.host,
      },
      switches: fallbackSwitches,
      aps: fallbackAps,
      totals: {
        wired_clients: 0,
        wireless_clients: fallbackAps.reduce((sum, ap) => sum + (ap.clients_connected || 0), 0)
      },
      error: error.message
    });
  }
});

// Performance monitoring
const performanceMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  apiCalls: 0,
  averageResponseTime: 0
};

// Middleware to track performance metrics
app.use((req, res, next) => {
  const start = Date.now();
  performanceMetrics.requestCount++;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime * (performanceMetrics.requestCount - 1) + duration) / performanceMetrics.requestCount;
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = Date.now() - performanceMetrics.startTime;
  const cacheHitRate = performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) * 100;
  
  res.json({
    status: 'healthy',
    uptime: uptime,
    uptimeFormatted: `${Math.floor(uptime / 1000 / 60)}m ${Math.floor((uptime / 1000) % 60)}s`,
    metrics: {
      requestCount: performanceMetrics.requestCount,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      apiCalls: performanceMetrics.apiCalls,
      averageResponseTime: `${performanceMetrics.averageResponseTime.toFixed(2)}ms`,
      cacheSize: memoryCache.cache.size,
      topologyCacheSize: topologyCache.cache.size
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

// Performance metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(performanceMetrics);
});
app.get('/api/status', async (req, res) => {
  try {
    // Try to get system status from FortiGate API
    const apiData = await makeFortiRequest('/monitor/system/status');

    if (apiData && apiData.results) {
      res.json({
        status: 'connected',
        fortigate: {
          version: apiData.results.version || 'Unknown',
          hostname: apiData.results.hostname || fortiConfig.host,
          serial: apiData.results.serial || 'Unknown'
        },
        data_source: 'api',
        last_updated: new Date().toISOString()
      });
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.log('Status API call failed:', error.message);

    // Check if we have any cached data
    const hasCache = fs.existsSync(fortiApCachePath) || fs.existsSync(fortiSwitchCachePath);

    res.json({
      status: 'disconnected',
      fortigate: {
        version: 'Unknown',
        hostname: fortiConfig.host,
        serial: 'Unknown'
      },
      data_source: hasCache ? 'cache' : 'embedded',
      error: error.message,
      note: 'Using cached or embedded sample data. Authentication may need resolution.',
      last_updated: new Date().toISOString()
    });
  }
});

// Endpoint to get data source info
app.get('/api/data-source', (req, res) => {
  // Check if we have cached data and when it was last updated
  let dataSource = 'embedded';
  let lastUpdated = null;
  
  try {
    if (fs.existsSync(fortiApCachePath)) {
      const cachedData = JSON.parse(fs.readFileSync(fortiApCachePath, 'utf8'));
      if (cachedData._timestamp) {
        dataSource = 'cached';
        lastUpdated = new Date(cachedData._timestamp).toISOString();
      }
    }
  } catch (error) {
    console.error('Error checking cache status:', error);
  }
  
  res.json({
    source: dataSource,
    last_updated: lastUpdated || new Date().toISOString()
  });
});

// Serve static files
app.use(express.static(__dirname));

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Server accessible at http://localhost:${port}`);
  console.log('FortiGate connection configured for:', fortiConfig.host);
});
