/**
 * WebSocket Configuration
 * Socket.IO setup for real-time updates
 *
 * Features:
 * - Real-time device status updates
 * - Live connected device tracking
 * - Automatic topology refresh
 * - Connection management with authentication
 * - Room-based broadcasting
 */

const { Server } = require('socket.io');
const logger = require('./logger');

// Track connected clients and their subscriptions
const connectedClients = new Map();
const roomSubscriptions = new Map();

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
function initializeWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Connection middleware for authentication and logging
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const clientId = socket.handshake.auth.clientId || socket.id;

    // Log connection attempt
    logger.info('WebSocket connection attempt', {
      socketId: socket.id,
      clientId,
      address: socket.handshake.address
    });

    // For now, allow all connections (add authentication later)
    socket.clientId = clientId;
    next();
  });

  // Handle new connections
  io.on('connection', (socket) => {
    handleConnection(socket, io);
  });

  logger.info('WebSocket server initialized');

  return io;
}

/**
 * Handle new client connection
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} io - Socket.IO server instance
 */
function handleConnection(socket, io) {
  const clientInfo = {
    socketId: socket.id,
    clientId: socket.clientId,
    connectedAt: new Date(),
    subscriptions: new Set(),
    address: socket.handshake.address
  };

  connectedClients.set(socket.id, clientInfo);

  logger.info('Client connected', {
    socketId: socket.id,
    clientId: socket.clientId,
    totalConnections: connectedClients.size
  });

  // Send welcome message with connection info
  socket.emit('connected', {
    socketId: socket.id,
    serverTime: new Date().toISOString(),
    message: 'Connected to FortiAP/Switch Dashboard WebSocket server'
  });

  // Handle subscription to specific data streams
  socket.on('subscribe', (data) => {
    handleSubscribe(socket, data);
  });

  // Handle unsubscription
  socket.on('unsubscribe', (data) => {
    handleUnsubscribe(socket, data);
  });

  // Handle client requesting current data
  socket.on('request:fortiaps', () => {
    socket.emit('request:fortiaps:acknowledged');
  });

  socket.on('request:fortiswitches', () => {
    socket.emit('request:fortiswitches:acknowledged');
  });

  socket.on('request:devices', () => {
    socket.emit('request:devices:acknowledged');
  });

  socket.on('request:topology', () => {
    socket.emit('request:topology:acknowledged');
  });

  // Handle ping/pong for connection monitoring
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    handleDisconnect(socket, reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error', {
      socketId: socket.id,
      error: error.message
    });
  });
}

/**
 * Handle client subscription to data stream
 * @param {Object} socket - Socket instance
 * @param {Object} data - Subscription data
 */
function handleSubscribe(socket, data) {
  const { channel } = data;

  if (!channel) {
    socket.emit('error', { message: 'Channel name required for subscription' });
    return;
  }

  // Join the room for this channel
  socket.join(channel);

  // Track subscription
  const clientInfo = connectedClients.get(socket.id);
  if (clientInfo) {
    clientInfo.subscriptions.add(channel);
  }

  // Track room subscriptions
  if (!roomSubscriptions.has(channel)) {
    roomSubscriptions.set(channel, new Set());
  }
  roomSubscriptions.get(channel).add(socket.id);

  logger.info('Client subscribed', {
    socketId: socket.id,
    channel,
    roomSize: roomSubscriptions.get(channel).size
  });

  socket.emit('subscribed', {
    channel,
    message: `Subscribed to ${channel} updates`
  });
}

/**
 * Handle client unsubscription
 * @param {Object} socket - Socket instance
 * @param {Object} data - Unsubscription data
 */
function handleUnsubscribe(socket, data) {
  const { channel } = data;

  if (!channel) {
    return;
  }

  // Leave the room
  socket.leave(channel);

  // Remove from tracking
  const clientInfo = connectedClients.get(socket.id);
  if (clientInfo) {
    clientInfo.subscriptions.delete(channel);
  }

  const roomSubs = roomSubscriptions.get(channel);
  if (roomSubs) {
    roomSubs.delete(socket.id);
    if (roomSubs.size === 0) {
      roomSubscriptions.delete(channel);
    }
  }

  logger.info('Client unsubscribed', {
    socketId: socket.id,
    channel
  });

  socket.emit('unsubscribed', {
    channel,
    message: `Unsubscribed from ${channel} updates`
  });
}

/**
 * Handle client disconnection
 * @param {Object} socket - Socket instance
 * @param {string} reason - Disconnect reason
 */
function handleDisconnect(socket, reason) {
  const clientInfo = connectedClients.get(socket.id);

  if (clientInfo) {
    // Clean up room subscriptions
    clientInfo.subscriptions.forEach(channel => {
      const roomSubs = roomSubscriptions.get(channel);
      if (roomSubs) {
        roomSubs.delete(socket.id);
        if (roomSubs.size === 0) {
          roomSubscriptions.delete(channel);
        }
      }
    });

    connectedClients.delete(socket.id);
  }

  logger.info('Client disconnected', {
    socketId: socket.id,
    reason,
    totalConnections: connectedClients.size
  });
}

/**
 * Broadcast update to all clients in a channel
 * @param {Object} io - Socket.IO server instance
 * @param {string} channel - Channel name
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToChannel(io, channel, event, data) {
  io.to(channel).emit(event, data);

  logger.debug('Broadcast to channel', {
    channel,
    event,
    subscriberCount: roomSubscriptions.get(channel)?.size || 0
  });
}

/**
 * Broadcast update to all connected clients
 * @param {Object} io - Socket.IO server instance
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToAll(io, event, data) {
  io.emit(event, data);

  logger.debug('Broadcast to all', {
    event,
    totalConnections: connectedClients.size
  });
}

/**
 * Get connected clients statistics
 * @returns {Object} Connection statistics
 */
function getConnectionStats() {
  return {
    totalConnections: connectedClients.size,
    activeChannels: roomSubscriptions.size,
    channels: Array.from(roomSubscriptions.keys()).map(channel => ({
      name: channel,
      subscribers: roomSubscriptions.get(channel).size
    }))
  };
}

module.exports = {
  initializeWebSocket,
  broadcastToChannel,
  broadcastToAll,
  getConnectionStats
};
