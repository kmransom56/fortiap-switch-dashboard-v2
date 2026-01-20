/**
 * FortiGate Dashboard Backend Server - Optimized Production Version
 * 
 * Features:
 * - Token-based FortiGate API authentication with caching
 * - In-memory caching with TTL and automatic cleanup
 * - Parallel API requests for improved performance
 * - Comprehensive error handling and fallback mechanisms
 * - Network topology computation with device mapping
 * - Performance metrics and health monitoring
 * - YAML fallback data support
 */

require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const axios = require('axios');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');

// Import custom middleware
const logger = require('./config/logger');
const { apiLimiter, strictLimiter, healthCheckLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validation');
const { asyncHandler, notFoundHandler, errorHandler, ExternalServiceError } = require('./middleware/errorHandler');

// Import Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Import WebSocket configuration
const { initializeWebSocket, broadcastToChannel, broadcastToAll, getConnectionStats } = require('./config/websocket');

const app = express();
const port = process.env.DASHBOARD_PORT || 13000;

/**
 * Security middleware
 * Helmet sets various HTTP headers for security
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for D3.js, Babylon.js, and Swagger UI
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Needed for some 3D libraries
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/**
 * CORS configuration
 * Allow requests from specified origins
 */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cors(corsOptions));

/**
 * Request logging middleware
 * Logs all incoming requests
 */
app.use(logger.requestLogger);

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Input sanitization middleware
 * Removes potentially dangerous input
 */
app.use(sanitizeInput);

/**
 * Compression middleware configuration
 * Provides gzip compression for responses over 1KB
 */
app.use(compression({
  filter: (req, res) => {
    // Skip compression if explicitly requested
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

/**
 * FortiGate API configuration from environment variables
 */
const fortiConfig = {
  host: process.env.FORTIGATE_HOST,
  username: process.env.FORTIGATE_USERNAME,
  password: process.env.FORTIGATE_PASSWORD,
  port: process.env.FORTIGATE_PORT || 443,
  apiToken: process.env.FORTIGATE_API_TOKEN,
  tokenExpiry: 60 * 14 // 14 minutes (typical token expiry is 15 minutes)
};

/**
 * Cache directory paths
 */
const cachePath = path.join(__dirname, 'cache');
const fortiApCachePath = path.join(cachePath, 'fortiaps.json');
const fortiSwitchCachePath = path.join(cachePath, 'fortiswitches.json');
const historicalCachePath = path.join(cachePath, 'historical_data.json');

/**
 * Ensure cache directory exists
 */
if (!fs.existsSync(cachePath)) {
  try {
    fs.mkdirSync(cachePath, { recursive: true });
    console.log('Created cache directory:', cachePath);
  } catch (err) {
    console.error('Error creating cache directory:', err.message);
  }
}

/**
 * In-memory cache with TTL (Time To Live) support
 * Automatically removes expired entries
 */
class MemoryCache {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
    this.cleanupInterval = null;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      performanceMetrics.cacheMisses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      performanceMetrics.cacheMisses++;
      return null;
    }

    performanceMetrics.cacheHits++;
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`Cache cleanup: removed ${removed} expired entries`);
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // Every 5 minutes
    }
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl
    };
  }
}

// Initialize caches
const memoryCache = new MemoryCache(300000); // 5 minutes
const topologyCache = new MemoryCache(60000);  // 1 minute

// Start automatic cleanup (skip during tests to avoid asynchronous logs)
if (process.env.NODE_ENV !== 'test') {
  memoryCache.startCleanup();
  topologyCache.startCleanup();
}

/**
 * Performance metrics tracker
 */
const performanceMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  apiCalls: 0,
  averageResponseTime: 0,
  responseTimes: []
};

/**
 * Get FortiGate API authentication headers
 */
function getApiAuth() {
  if (!fortiConfig.apiToken) {
    throw new Error(
      'FORTIGATE_API_TOKEN not configured. ' +
      'Please create a REST API administrator in FortiGate and set the token in .env file.'
    );
  }

  return {
    token: fortiConfig.apiToken,
    type: 'Bearer'
  };
}

/**
 * Make FortiGate API request with caching and error handling
 * Supports GET, POST, PUT, PATCH methods
 */
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
    // Get API authentication
    const auth = getApiAuth();

    // Create HTTPS agent for connection pooling
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !(
        process.env.FORTIGATE_VERIFY_SSL === 'false' ||
        process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
      ),
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10,
      maxFreeSockets: 5
    });

    // Ensure URL has proper API v2 format
    let url = endpoint;
    if (!endpoint.startsWith('/api/v2/')) {
      url = `/api/v2${endpoint}`;
    }

    // Create axios instance
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

    // Prepare request config
    const config = {
      method,
      url: url,
      timeout: 30000
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    // Make the request
    const response = await session.request(config);

    // Handle HTTP errors
    if (response.status >= 400) {
      let errorMsg = response.statusText;
      
      try {
        const errorData = typeof response.data === 'object'
          ? response.data
          : JSON.parse(response.data || '{}');
        
        errorMsg = errorData.error?.message || errorData.msg || 
                  JSON.stringify(errorData) || response.statusText;
      } catch (e) {
        // Keep original error message
      }

      throw new Error(`HTTP ${response.status}: ${errorMsg}`);
    }

    // Parse response
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
    console.error(`Error making FortiOS API request to ${endpoint}:`, error.message);
    
    if (error.response) {
      console.error('Response details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    throw error;
  }
}

/**
 * Load fallback data from cache or YAML file
 */
function loadFallbackData(type) {
  try {
    // First try to load from cache
    const cachedData = loadCachedData(type);
    if (cachedData) {
      console.log(`Using cached ${type} data`);
      return cachedData;
    }

    // Fall back to YAML data
    const filePath = path.join(__dirname, 'dashboard_data.yaml');
    console.log(`Loading fallback ${type} from ${filePath}`);
    
    try {
      const yamlData = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(yamlData) || {};
      return data[type] || [];
    } catch (e) {
      console.warn(`YAML file not found or unreadable: ${filePath}`);
      return [];
    }
  } catch (error) {
    console.error(`Error loading fallback ${type} data:`, error.message);
    return [];
  }
}

/**
 * Load cached data from disk
 */
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
    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }

    const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));

    // Check if cache is valid (not older than 24 hours)
    if (cachedData._timestamp && 
        (Date.now() - cachedData._timestamp) < 24 * 60 * 60 * 1000) {
      console.log(`Valid cached ${type} data found`);
      return cachedData.data;
    }

    console.warn(`Cached ${type} data is older than 24 hours`);
    return null;
  } catch (error) {
    console.error(`Error loading cached ${type}:`, error.message);
    return null;
  }
}

/**
 * Save data to cache file
 */
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
    const cacheData = {
      _timestamp: Date.now(),
      data: data
    };
    
    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));
    console.log(`Cached ${type} data saved to ${cacheFilePath}`);
  } catch (error) {
    console.error(`Error saving ${type} cache:`, error.message);
  }
}

/**
 * Transform FortiAP API response to dashboard format
 */
function transformFortiAPData(aps) {
  return aps.map(ap => ({
    name: ap.name || ap.wtp_id || 'Unknown',
    serial: ap.serial || 'Unknown',
    model: ap.os_version?.split('-')[0] || 'FortiAP',
    ip_address: ap.local_ipv4_addr || ap.connecting_from || 'Unknown',
    firmware_version: ap.os_version || 'Unknown',
    clients_connected: ap.clients || 0,
    status: ap.status === 'connected' ? 'up' : 'down',
    temperature: ap.sensors_temperatures?.[0] || 0,
    last_seen: ap.join_time || new Date().toISOString(),
    interfering_aps: ap.radio?.find(r => r.detected_rogue_aps)?.detected_rogue_aps || 0,
    connection_state: ap.connection_state || 'unknown',
    board_mac: ap.board_mac || 'unknown',
    ssid: ap.ssid?.map(s => s.list).flat() || [],
    channel_utilization_2_4: 0,
    channel_utilization_5: 0
  }));
}

/**
 * Transform FortiSwitch API response to dashboard format
 */
function transformFortiSwitchData(switches) {
  return switches.map(sw => {
    let poe_power_consumption = 0;
    let poe_power_budget = 0;
    let ports_up = 0;
    let ports_total = 0;
    let portsArray = [];

    // Process ports if available
    if (sw.ports && typeof sw.ports === 'object') {
      ports_total = Object.keys(sw.ports).length;

      Object.entries(sw.ports).forEach(([portName, portData]) => {
        // Count active ports
        if (portData['rx-packets'] > 0 || portData['tx-packets'] > 0) {
          ports_up++;
        }

        // Build port object
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

        // Calculate PoE consumption
        if (portData.poe_power) {
          poe_power_consumption += parseFloat(portData.poe_power) || 0;
        }

        if (portData.poe_max) {
          poe_power_budget += parseFloat(portData.poe_max) || 0;
        }
      });
    }

    return {
      name: sw.name || sw['switch-id'] || 'Unknown',
      serial: sw.serial || 'Unknown',
      model: sw.model || 'FortiSwitch',
      ip_address: sw.ip_address || sw['switch-id'] || 'Unknown',
      firmware_version: sw.os_version || sw.version || 'Unknown',
      status: ports_up > 0 ? 'up' : 'down',
      ports_total: ports_total,
      ports_up: ports_up,
      poe_power_consumption: Math.round(poe_power_consumption * 10) / 10,
      poe_power_budget: Math.round(poe_power_budget * 10) / 10,
      poe_power_percentage: poe_power_budget > 0 
        ? Math.round((poe_power_consumption / poe_power_budget) * 100)
        : 0,
      temperature: 0,
      fan_status: 'ok',
      ports: portsArray
    };
  });
}

/**
 * API route: GET FortiAPs
 */
app.get('/api/fortiaps', apiLimiter, asyncHandler(async (req, res) => {
  try {
    const apiData = await makeFortiRequest('/monitor/wifi/managed_ap');

    if (apiData && apiData.results && apiData.results.length > 0) {
      logger.info(`Retrieved ${apiData.results.length} FortiAP devices from API`);
      logger.logApiCall('/monitor/wifi/managed_ap', 'GET', 'success', { count: apiData.results.length });
      const transformedData = transformFortiAPData(apiData.results);
      saveDataToCache('fortiaps', transformedData);

      // Broadcast real-time update to WebSocket clients
      const io = req.app.get('io');
      if (io) {
        broadcastToChannel(io, 'fortiaps', 'fortiaps:update', {
          timestamp: new Date().toISOString(),
          count: transformedData.fortiaps.length,
          data: transformedData
        });
      }

      return res.json(transformedData);
    }

    throw new ExternalServiceError('No FortiAP data in API response');
  } catch (error) {
    logger.warn('FortiAP API call failed, using fallback data', { error: error.message });
    const fallbackData = loadFallbackData('fortiaps');
    return res.json(fallbackData);
  }
}));

/**
 * API route: GET FortiSwitches
 */
app.get('/api/fortiswitches', apiLimiter, asyncHandler(async (req, res) => {
  try {
    const apiData = await makeFortiRequest('/monitor/switch-controller/managed-switch/port-stats');

    if (apiData && apiData.results && apiData.results.length > 0) {
      logger.info(`Retrieved ${apiData.results.length} FortiSwitch devices from API`);
      logger.logApiCall('/monitor/switch-controller/managed-switch/port-stats', 'GET', 'success', { count: apiData.results.length });
      const transformedData = transformFortiSwitchData(apiData.results);
      saveDataToCache('fortiswitches', transformedData);

      // Broadcast real-time update to WebSocket clients
      const io = req.app.get('io');
      if (io) {
        broadcastToChannel(io, 'fortiswitches', 'fortiswitches:update', {
          timestamp: new Date().toISOString(),
          count: transformedData.fortiswitches.length,
          data: transformedData
        });
      }

      return res.json(transformedData);
    }

    throw new ExternalServiceError('No FortiSwitch data in API response');
  } catch (error) {
    logger.warn('FortiSwitch API call failed, using fallback data', { error: error.message });
    const fallbackData = loadFallbackData('fortiswitches');
    return res.json(fallbackData);
  }
}));

/**
 * Transform connected device data from various sources
 */
function transformConnectedDeviceData(device, type = 'detected') {
  return {
    mac: device.mac || 'Unknown',
    ip_address: device.ipv4_address || device.ip || 'Unknown',
    hostname: device.hostname || 'Unknown',
    vendor: device.hardware_vendor || 'Unknown',
    device_type: device.hardware_type || device.device_type || 'Unknown',
    os_name: device.os_name || 'Unknown',
    os_version: device.os_version || 'Unknown',
    is_online: device.is_online !== undefined ? device.is_online : true,
    last_seen: device.last_seen || new Date().toISOString(),
    detected_interface: device.detected_interface || device.interface || 'Unknown',
    connection_type: type, // 'wired', 'wireless', 'detected'
    master_mac: device.master_mac || null,
    switch_id: device.switch_id || null,
    port: device.port || null,
    ap_name: device.ap_name || null,
    ssid: device.ssid || null
  };
}

/**
 * API route: GET connected devices (wired, wireless, and detected)
 */
app.get('/api/connected-devices', async (req, res) => {
  try {
    // Execute all API calls in parallel
    const promises = [
      makeFortiRequest('/monitor/user/device/query').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/user/detected-device/query').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/system/arp').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/wifi/managed_ap').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/switch-controller/managed-switch/port-stats').catch(() => ({ results: [] }))
    ];

    const results = await Promise.allSettled(promises);

    // Extract data
    const userDevices = results[0].status === 'fulfilled' ? results[0].value.results || [] : [];
    const detectedDevices = results[1].status === 'fulfilled' ? results[1].value.results || [] : [];
    const arpEntries = results[2].status === 'fulfilled' ? results[2].value.results || [] : [];
    const apData = results[3].status === 'fulfilled' ? results[3].value.results || [] : [];
    const switchData = results[4].status === 'fulfilled' ? results[4].value.results || [] : [];

    // Filter out Fortinet equipment from user devices
    const clientDevices = userDevices.filter(d => {
      const family = (d.hardware_family || '').toLowerCase();
      return !['fortigate', 'fortiap', 'fortiswitch'].includes(family);
    });

    // Separate wired and wireless devices
    const wiredDevices = [];
    const wirelessDevices = [];
    const detectedOnly = [];

    // Process detected devices
    const detectedMap = new Map();
    detectedDevices.forEach(d => {
      if (d.mac) {
        detectedMap.set(d.mac.toLowerCase(), d);
      }
    });

    // Process ARP entries for IP/MAC mapping
    const arpMap = new Map();
    arpEntries.forEach(entry => {
      const ip = entry.ip || entry.ip_addr;
      const mac = entry.mac;
      if (ip && mac) {
        arpMap.set(mac.toLowerCase(), ip);
      }
    });

    // Process client devices
    clientDevices.forEach(device => {
      const mac = (device.mac || '').toLowerCase();
      const deviceInterface = device.detected_interface || '';
      const isWireless = deviceInterface.includes('wifi') || deviceInterface.includes('wlan') || 
                        device.hardware_family === 'FortiAP' ||
                        (device.master_mac && apData.some(ap => 
                          (ap.board_mac || '').toLowerCase() === (device.master_mac || '').toLowerCase()
                        ));

      const transformed = transformConnectedDeviceData(device, isWireless ? 'wireless' : 'wired');
      
      // Enrich with ARP data
      if (!transformed.ip_address || transformed.ip_address === 'Unknown') {
        const arpIp = arpMap.get(mac);
        if (arpIp) {
          transformed.ip_address = arpIp;
        }
      }

      // Add AP information for wireless devices
      if (isWireless && device.master_mac) {
        const connectedAP = apData.find(ap => 
          (ap.board_mac || '').toLowerCase() === (device.master_mac || '').toLowerCase()
        );
        if (connectedAP) {
          transformed.ap_name = connectedAP.name || connectedAP.wtp_id;
          transformed.ssid = connectedAP.ssid?.map(s => s.list).flat() || [];
        }
      }

      // Add switch/port information for wired devices
      if (!isWireless && device.detected_interface) {
        // Try to match with switch ports
        switchData.forEach(sw => {
          const ports = sw.ports || {};
          Object.keys(ports).forEach(portName => {
            // This is a simplified match - could be improved with MAC table data
            transformed.port = device.detected_interface;
            transformed.switch_id = sw.name || sw['switch-id'];
          });
        });
      }

      if (isWireless) {
        wirelessDevices.push(transformed);
      } else {
        wiredDevices.push(transformed);
      }
    });

    // Add devices that are only in detected list (not in user devices)
    detectedMap.forEach((device, mac) => {
      const existsInClients = clientDevices.some(d => 
        (d.mac || '').toLowerCase() === mac
      );
      
      if (!existsInClients) {
        const transformed = transformConnectedDeviceData(device, 'detected');
        detectedOnly.push(transformed);
      }
    });

    // Combine all devices
    const allDevices = {
      total: wiredDevices.length + wirelessDevices.length + detectedOnly.length,
      wired: wiredDevices,
      wireless: wirelessDevices,
      detected: detectedOnly,
      summary: {
        wired_count: wiredDevices.length,
        wireless_count: wirelessDevices.length,
        detected_count: detectedOnly.length,
        online_count: [...wiredDevices, ...wirelessDevices, ...detectedOnly]
          .filter(d => d.is_online).length
      },
      timestamp: new Date().toISOString()
    };

    logger.info(`Retrieved ${allDevices.total} connected devices (${wiredDevices.length} wired, ${wirelessDevices.length} wireless, ${detectedOnly.length} detected)`);

    // Broadcast real-time update to WebSocket clients
    const io = req.app.get('io');
    if (io) {
      broadcastToChannel(io, 'devices', 'devices:update', {
        timestamp: allDevices.timestamp,
        summary: allDevices.summary,
        data: allDevices
      });
    }

    return res.json(allDevices);
  } catch (error) {
    console.error('Error retrieving connected devices:', error.message);
    return res.json({
      total: 0,
      wired: [],
      wireless: [],
      detected: [],
      summary: {
        wired_count: 0,
        wireless_count: 0,
        detected_count: 0,
        online_count: 0
      },
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API route: GET historical data
 */
app.get('/api/historical', async (req, res) => {
  try {
    const apiData = await makeFortiRequest('/monitor/wifi/ap_status');
    
    if (apiData && apiData.results) {
      console.log(`Retrieved historical data from API`);
      saveDataToCache('historical_data', apiData.results);
      return res.json(apiData.results);
    }

    throw new Error('No historical data in API response');
  } catch (error) {
    console.log('Historical API call failed:', error.message);
    const fallbackData = loadFallbackData('historical_data');
    return res.json(fallbackData);
  }
});

/**
 * API route: GET network topology
 * Uses parallel requests for performance optimization
 */
app.get('/api/topology', async (req, res) => {
  try {
    // Check cache first
    const cachedTopology = topologyCache.get('topology');
    if (cachedTopology) {
      console.log('Returning cached topology data');
      return res.json(cachedTopology);
    }

    // Execute all API calls in parallel
    const promises = [
      makeFortiRequest('/monitor/system/status'),
      makeFortiRequest('/monitor/switch-controller/managed-switch/port-stats'),
      makeFortiRequest('/monitor/wifi/managed_ap'),
      makeFortiRequest('/monitor/system/arp').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/user/detected-device/query').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/switch-controller/managed-switch/bios').catch(() => ({ results: [] })),
      makeFortiRequest('/monitor/user/device/query').catch(() => ({ results: [] }))
    ];

    const results = await Promise.allSettled(promises);

    // Extract data from Promise.allSettled results
    const sysStatusData = results[0].status === 'fulfilled' ? results[0].value : {};
    const switchData = results[1].status === 'fulfilled' ? results[1].value : { results: [] };
    const apData = results[2].status === 'fulfilled' ? results[2].value : { results: [] };
    const arpData = results[3].status === 'fulfilled' ? results[3].value : { results: [] };
    const detectedData = results[4].status === 'fulfilled' ? results[4].value : { results: [] };
    const biosData = results[5].status === 'fulfilled' ? results[5].value : { results: [] };

    // Transform data
    const rawSwitches = switchData.results || [];
    const switches = transformFortiSwitchData(rawSwitches);

    const rawAps = apData.results || [];
    const aps = transformFortiAPData(rawAps);

    const arpResults = arpData.results || [];
    const detectedDevices = detectedData.results || [];
    const userDevices = results[6].status === 'fulfilled' ? results[6].value.results || [] : [];

    // Build MAC to switch map for device tracking
    const switchBios = biosData.results || [];
    const macToSwitchMap = switchBios.reduce((map, sw) => {
      if (sw.switch_id && sw.bios && sw.bios.burn_in_mac) {
        const mac = String(sw.bios.burn_in_mac).toLowerCase();
        map[mac] = sw.switch_id;
      }
      return map;
    }, {});

    console.log(`Switch MAC mapping: ${Object.keys(macToSwitchMap).length} switches mapped`);

    // Normalize detected devices to MAC/port bindings
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

    // Enrich switches with wired client counts
    const enrichedSwitches = switches.map(sw => {
      let wiredTotal = 0;
      
      const ports = (sw.ports || []).map(p => {
        // Match devices by port and switch
        const bindingsForPort = deviceBindings.filter(b => {
          if (b.switch_id && sw.serial) {
            return b.port === p.port && b.switch_id === sw.serial;
          }
          return b.port === p.port;
        });

        const uniqueMacs = new Set(bindingsForPort.map(b => b.mac));
        let wiredClients = uniqueMacs.size;

        // Fallback: check for traffic
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

    // Calculate totals
    const totalWirelessClients = aps.reduce((sum, ap) => sum + (ap.clients_connected || 0), 0);
    const wiredFromArp = arpResults.filter(entry => {
      const ip = entry.ip || entry.ip_addr || '';
      return ip && ip !== fortiConfig.host;
    });

    // Build FortiGate info
    const fortigateInfo = {
      hostname: sysStatusData?.results?.hostname || fortiConfig.host,
      version: sysStatusData?.results?.version || 'Unknown',
      serial: sysStatusData?.results?.serial || 'Unknown',
      ip: fortiConfig.host,
      model: 'FortiGate'
    };

    // Process connected devices for topology
    const clientDevices = userDevices.filter(d => {
      const family = (d.hardware_family || '').toLowerCase();
      return !['fortigate', 'fortiap', 'fortiswitch'].includes(family);
    });

    // Separate wired and wireless devices and map them to switches/APs
    const wiredDevicesForTopology = [];
    const wirelessDevicesForTopology = [];

    clientDevices.forEach(device => {
      const mac = (device.mac || '').toLowerCase();
      const deviceInterface = device.detected_interface || '';
      const isWireless = deviceInterface.includes('wifi') || deviceInterface.includes('wlan') || 
                        device.hardware_family === 'FortiAP' ||
                        (device.master_mac && apData.some(ap => 
                          (ap.board_mac || '').toLowerCase() === (device.master_mac || '').toLowerCase()
                        ));

      const deviceInfo = {
        mac: device.mac || 'Unknown',
        ip_address: device.ipv4_address || 'Unknown',
        hostname: device.hostname || 'Unknown',
        vendor: device.hardware_vendor || 'Unknown',
        device_type: device.hardware_type || device.device_type || 'Unknown',
        is_online: device.is_online !== undefined ? device.is_online : true,
        connection_type: isWireless ? 'wireless' : 'wired'
      };

      if (isWireless) {
        // Find connected AP
        if (device.master_mac) {
          const connectedAP = apData.find(ap => 
            (ap.board_mac || '').toLowerCase() === (device.master_mac || '').toLowerCase()
          );
          if (connectedAP) {
            deviceInfo.ap_name = connectedAP.name || connectedAP.wtp_id;
            deviceInfo.ap_serial = connectedAP.serial;
            wirelessDevicesForTopology.push(deviceInfo);
          }
        }
      } else {
        // Find connected switch/port
        const deviceBinding = deviceBindings.find(b => b.mac === mac);
        if (deviceBinding && deviceBinding.switch_id) {
          const connectedSwitch = enrichedSwitches.find(sw => sw.serial === deviceBinding.switch_id);
          if (connectedSwitch) {
            deviceInfo.switch_id = connectedSwitch.serial;
            deviceInfo.switch_name = connectedSwitch.name;
            deviceInfo.port = deviceBinding.port;
            wiredDevicesForTopology.push(deviceInfo);
          }
        }
      }
    });

    // Assemble topology response
    const topologyData = {
      fortigate: fortigateInfo,
      switches: enrichedSwitches,
      aps,
      connected_devices: {
        wired: wiredDevicesForTopology,
        wireless: wirelessDevicesForTopology
      },
      totals: {
        wired_clients: wiredFromArp.length || enrichedSwitches.reduce((sum, sw) => sum + (sw.wired_clients_total || 0), 0),
        wireless_clients: totalWirelessClients
      },
      timestamp: new Date().toISOString()
    };

    // Cache the topology
    topologyCache.set('topology', topologyData);

    // Broadcast real-time update to WebSocket clients
    const io = req.app.get('io');
    if (io) {
      broadcastToChannel(io, 'topology', 'topology:update', {
        timestamp: topologyData.timestamp,
        totals: topologyData.totals,
        data: topologyData
      });
    }

    return res.json(topologyData);
  } catch (error) {
    console.error('Error building topology:', error.message);

    // Fallback response
    const fallbackSwitches = loadFallbackData('fortiswitches') || [];
    const fallbackAps = loadFallbackData('fortiaps') || [];

    return res.json({
      fortigate: {
        hostname: fortiConfig.host,
        version: 'Unknown',
        serial: 'Unknown',
        ip: fortiConfig.host,
        model: 'FortiGate'
      },
      switches: fallbackSwitches,
      aps: fallbackAps,
      totals: {
        wired_clients: 0,
        wireless_clients: fallbackAps.reduce((sum, ap) => sum + (ap.clients_connected || 0), 0)
      },
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API route: GET FortiGate connection status
 */
app.get('/api/status', async (req, res) => {
  try {
    const apiData = await makeFortiRequest('/monitor/system/status');
    
    if (apiData && apiData.results) {
      return res.json({
        status: 'connected',
        fortigate: {
          version: apiData.results.version || 'Unknown',
          hostname: apiData.results.hostname || fortiConfig.host,
          serial: apiData.results.serial || 'Unknown'
        },
        data_source: 'api',
        last_updated: new Date().toISOString()
      });
    }

    throw new Error('Invalid API response');
  } catch (error) {
    console.log('Status API call failed:', error.message);

    const hasCache = fs.existsSync(fortiApCachePath) || fs.existsSync(fortiSwitchCachePath);

    return res.json({
      status: 'disconnected',
      fortigate: {
        version: 'Unknown',
        hostname: fortiConfig.host,
        serial: 'Unknown'
      },
      data_source: hasCache ? 'cache' : 'embedded',
      error: error.message,
      last_updated: new Date().toISOString()
    });
  }
});

/**
 * API route: GET data source information
 */
app.get('/api/data-source', (req, res) => {
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
    console.error('Error checking cache status:', error.message);
  }

  res.json({
    source: dataSource,
    last_updated: lastUpdated || new Date().toISOString()
  });
});

/**
 * Performance tracking middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  performanceMetrics.requestCount++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    performanceMetrics.responseTimes.push(duration);

    // Keep only last 100 response times for memory efficiency
    if (performanceMetrics.responseTimes.length > 100) {
      performanceMetrics.responseTimes.shift();
    }

    // Calculate average
    performanceMetrics.averageResponseTime =
      performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / 
      performanceMetrics.responseTimes.length;
  });

  next();
});

/**
 * Health check endpoint
 */
app.get('/health', healthCheckLimiter, (req, res) => {
  const uptime = Date.now() - performanceMetrics.startTime;
  const totalRequests = performanceMetrics.cacheHits + performanceMetrics.cacheMisses;
  const cacheHitRate = totalRequests > 0
    ? (performanceMetrics.cacheHits / totalRequests * 100).toFixed(2)
    : 0;

  res.json({
    status: 'healthy',
    uptime: uptime,
    uptimeFormatted: `${Math.floor(uptime / 1000 / 60)}m ${Math.floor((uptime / 1000) % 60)}s`,
    metrics: {
      requestCount: performanceMetrics.requestCount,
      cacheHitRate: `${cacheHitRate}%`,
      apiCalls: performanceMetrics.apiCalls,
      averageResponseTime: `${performanceMetrics.averageResponseTime.toFixed(2)}ms`,
      cacheSize: memoryCache.getStats().size,
      topologyCacheSize: topologyCache.getStats().size
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

/**
 * Metrics endpoint
 */
app.get('/metrics', apiLimiter, (req, res) => {
  res.json(performanceMetrics);
});

/**
 * WebSocket connection statistics endpoint
 */
app.get('/api/websocket/stats', apiLimiter, (req, res) => {
  const stats = getConnectionStats();
  res.json({
    ...stats,
    timestamp: new Date().toISOString()
  });
});

/**
 * API Documentation with Swagger UI
 */
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'FortiAP/Switch Dashboard API',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

/**
 * Swagger JSON endpoint
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * Serve main dashboard page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Serve static files (HTML, CSS, JS)
 */
app.use(express.static(__dirname));

/**
 * 404 Not Found handler
 * Must be added after all routes
 */
app.use(notFoundHandler);

/**
 * Error logging middleware
 */
app.use(logger.errorLogger);

/**
 * Global error handling middleware
 * Must be the last middleware
 */
app.use(errorHandler);

/**
 * Start server
 */
const server = app.listen(port, '0.0.0.0', () => {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`FortiGate Dashboard Server Started`);
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`Server running on: http://0.0.0.0:${port}`);
  logger.info(`Access at: http://localhost:${port}`);
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`API documentation: http://localhost:${port}/api-docs`);
  logger.info(`FortiGate host: ${fortiConfig.host}`);
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Node version: ${process.version}`);
  logger.info('═══════════════════════════════════════════════════════════\n');
});

/**
 * Initialize WebSocket server
 */
const io = initializeWebSocket(server);

// Make io instance available to routes for broadcasting updates
app.set('io', io);

logger.info('WebSocket server ready for real-time updates');
logger.info(`WebSocket endpoint: ws://localhost:${port}`);

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Stop cache cleanup intervals
  memoryCache.stopCleanup();
  topologyCache.stopCleanup();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  
  memoryCache.stopCleanup();
  topologyCache.stopCleanup();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

/**
 * Unhandled rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = server;

// Expose internal helpers for unit tests
try {
  module.exports.MemoryCache = MemoryCache;
  module.exports.loadCachedData = loadCachedData;
  module.exports.loadFallbackData = loadFallbackData;
  module.exports.saveDataToCache = saveDataToCache;
  module.exports.transformFortiAPData = transformFortiAPData;
  module.exports.transformFortiSwitchData = transformFortiSwitchData;
} catch (e) { /* ignore during app boots */ }
