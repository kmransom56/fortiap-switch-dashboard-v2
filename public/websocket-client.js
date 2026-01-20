/**
 * WebSocket Client Handler
 * Connects to the dashboard WebSocket server for real-time updates
 *
 * Usage:
 *   Include Socket.IO client library in HTML:
 *   <script src="/socket.io/socket.io.js"></script>
 *   <script src="/public/websocket-client.js"></script>
 *
 *   Then initialize:
 *   const wsClient = new DashboardWebSocketClient();
 *   wsClient.connect();
 *   wsClient.subscribe('fortiaps', (data) => {
 *     console.log('FortiAP update:', data);
 *   });
 */

class DashboardWebSocketClient {
  constructor(options = {}) {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.subscriptions = new Map();
    this.eventCallbacks = new Map();

    // Connection state callbacks
    this.onConnectCallback = options.onConnect || null;
    this.onDisconnectCallback = options.onDisconnect || null;
    this.onErrorCallback = options.onError || null;
    this.onReconnectCallback = options.onReconnect || null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - Server URL (optional, defaults to current host)
   * @param {object} auth - Authentication options
   */
  connect(url = null, auth = {}) {
    const serverUrl = url || window.location.origin;

    console.log(`[WebSocket] Connecting to ${serverUrl}...`);

    this.socket = io(serverUrl, {
      auth: {
        clientId: this.getClientId(),
        ...auth
      },
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    // Connection established
    this.socket.on('connected', (data) => {
      console.log('[WebSocket] Connected:', data);
      this.connected = true;
      this.reconnectAttempts = 0;

      if (this.onConnectCallback) {
        this.onConnectCallback(data);
      }

      // Resubscribe to channels after reconnection
      this.resubscribeAll();
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.connected = false;

      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(reason);
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      this.reconnectAttempts++;

      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.socket.close();
      }
    });

    // Reconnection
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);

      if (this.onReconnectCallback) {
        this.onReconnectCallback(attemptNumber);
      }
    });

    // Subscription confirmations
    this.socket.on('subscribed', (data) => {
      console.log('[WebSocket] Subscribed to channel:', data.channel);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('[WebSocket] Unsubscribed from channel:', data.channel);
    });

    // Error messages
    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    // Ping/pong for connection monitoring
    this.socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      console.log(`[WebSocket] Ping latency: ${latency}ms`);
    });
  }

  /**
   * Subscribe to a data channel
   * @param {string} channel - Channel name (fortiaps, fortiswitches, devices, topology)
   * @param {function} callback - Callback function for updates
   */
  subscribe(channel, callback) {
    if (!this.socket) {
      console.error('[WebSocket] Not connected. Call connect() first.');
      return;
    }

    // Store subscription
    this.subscriptions.set(channel, true);

    // Setup event listener for this channel's updates
    const eventName = `${channel}:update`;
    this.socket.on(eventName, callback);

    // Store callback for resubscription
    if (!this.eventCallbacks.has(channel)) {
      this.eventCallbacks.set(channel, []);
    }
    this.eventCallbacks.get(channel).push({ eventName, callback });

    // Send subscription request to server
    this.socket.emit('subscribe', { channel });

    console.log(`[WebSocket] Subscribed to ${channel} updates`);
  }

  /**
   * Unsubscribe from a data channel
   * @param {string} channel - Channel name
   */
  unsubscribe(channel) {
    if (!this.socket) {
      return;
    }

    // Remove subscription
    this.subscriptions.delete(channel);

    // Remove event listeners
    const callbacks = this.eventCallbacks.get(channel);
    if (callbacks) {
      callbacks.forEach(({ eventName, callback }) => {
        this.socket.off(eventName, callback);
      });
      this.eventCallbacks.delete(channel);
    }

    // Send unsubscription request to server
    this.socket.emit('unsubscribe', { channel });

    console.log(`[WebSocket] Unsubscribed from ${channel} updates`);
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  resubscribeAll() {
    if (!this.socket) {
      return;
    }

    this.subscriptions.forEach((_, channel) => {
      this.socket.emit('subscribe', { channel });
      console.log(`[WebSocket] Resubscribed to ${channel}`);
    });
  }

  /**
   * Request current data from server
   * @param {string} dataType - Type of data (fortiaps, fortiswitches, devices, topology)
   */
  requestData(dataType) {
    if (!this.socket) {
      return;
    }

    this.socket.emit(`request:${dataType}`);
    console.log(`[WebSocket] Requested ${dataType} data`);
  }

  /**
   * Send ping to server to check connection
   */
  ping() {
    if (!this.socket) {
      return;
    }

    this.socket.emit('ping');
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      console.log('[WebSocket] Disconnected');
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }

  /**
   * Get or create client ID
   * @returns {string}
   */
  getClientId() {
    let clientId = localStorage.getItem('dashboardClientId');
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dashboardClientId', clientId);
    }
    return clientId;
  }

  /**
   * Set connection callback
   * @param {function} callback
   */
  onConnect(callback) {
    this.onConnectCallback = callback;
  }

  /**
   * Set disconnection callback
   * @param {function} callback
   */
  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }

  /**
   * Set error callback
   * @param {function} callback
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Set reconnection callback
   * @param {function} callback
   */
  onReconnect(callback) {
    this.onReconnectCallback = callback;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardWebSocketClient;
}
