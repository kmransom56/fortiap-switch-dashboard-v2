/**
 * WebSocket Unit Tests
 * Tests for WebSocket server configuration and functionality
 */

const { initializeWebSocket, broadcastToChannel, broadcastToAll, getConnectionStats } = require('../config/websocket');
const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('WebSocket Configuration', () => {
  let httpServer;
  let io;
  let serverSocket;
  let clientSocket;
  const port = 13999; // Test port

  beforeAll((done) => {
    httpServer = http.createServer();
    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll((done) => {
    if (io) {
      io.close();
    }
    httpServer.close(done);
  });

  beforeEach((done) => {
    io = initializeWebSocket(httpServer);

    io.on('connection', (socket) => {
      serverSocket = socket;
    });

    clientSocket = Client(`http://localhost:${port}`, {
      auth: {
        token: 'test-token',
        clientId: 'test-client-123'
      }
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (serverSocket) {
      serverSocket.disconnect();
    }
  });

  describe('Connection Management', () => {
    test('should establish WebSocket connection', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('should receive connected event', (done) => {
      // Create a new connection to test the connected event
      const testClient = Client(`http://localhost:${port}`, {
        auth: {
          token: 'test-token-2',
          clientId: 'test-client-connected'
        }
      });

      testClient.on('connected', (data) => {
        expect(data).toHaveProperty('socketId');
        expect(data).toHaveProperty('serverTime');
        expect(data).toHaveProperty('message');
        testClient.close();
        done();
      });
    });

    test('should assign clientId to socket', () => {
      expect(serverSocket.clientId).toBe('test-client-123');
    });
  });

  describe('Subscription Management', () => {
    test('should subscribe to channel', (done) => {
      clientSocket.emit('subscribe', { channel: 'fortiaps' });

      clientSocket.on('subscribed', (data) => {
        expect(data.channel).toBe('fortiaps');
        expect(data.message).toContain('Subscribed');
        done();
      });
    });

    test('should unsubscribe from channel', (done) => {
      clientSocket.emit('subscribe', { channel: 'fortiaps' });

      clientSocket.on('subscribed', () => {
        clientSocket.emit('unsubscribe', { channel: 'fortiaps' });
      });

      clientSocket.on('unsubscribed', (data) => {
        expect(data.channel).toBe('fortiaps');
        expect(data.message).toContain('Unsubscribed');
        done();
      });
    });

    test('should handle subscription without channel name', (done) => {
      clientSocket.emit('subscribe', {});

      clientSocket.on('error', (data) => {
        expect(data.message).toContain('Channel name required');
        done();
      });
    });
  });

  describe('Broadcasting', () => {
    test('should broadcast to specific channel', (done) => {
      clientSocket.emit('subscribe', { channel: 'fortiaps' });

      clientSocket.on('subscribed', () => {
        clientSocket.on('fortiaps:update', (data) => {
          expect(data).toHaveProperty('timestamp');
          expect(data).toHaveProperty('count');
          expect(data.count).toBe(5);
          done();
        });

        // Simulate server broadcast
        setTimeout(() => {
          broadcastToChannel(io, 'fortiaps', 'fortiaps:update', {
            timestamp: new Date().toISOString(),
            count: 5
          });
        }, 100);
      });
    });

    test('should broadcast to all clients', (done) => {
      clientSocket.on('test:broadcast', (data) => {
        expect(data.message).toBe('Hello everyone');
        done();
      });

      setTimeout(() => {
        broadcastToAll(io, 'test:broadcast', {
          message: 'Hello everyone'
        });
      }, 100);
    });
  });

  describe('Ping/Pong', () => {
    test('should respond to ping', (done) => {
      clientSocket.emit('ping');

      clientSocket.on('pong', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('number');
        done();
      });
    });
  });

  describe('Data Requests', () => {
    test('should acknowledge fortiaps request', (done) => {
      clientSocket.emit('request:fortiaps');

      clientSocket.on('request:fortiaps:acknowledged', () => {
        done();
      });
    });

    test('should acknowledge fortiswitches request', (done) => {
      clientSocket.emit('request:fortiswitches');

      clientSocket.on('request:fortiswitches:acknowledged', () => {
        done();
      });
    });

    test('should acknowledge devices request', (done) => {
      clientSocket.emit('request:devices');

      clientSocket.on('request:devices:acknowledged', () => {
        done();
      });
    });

    test('should acknowledge topology request', (done) => {
      clientSocket.emit('request:topology');

      clientSocket.on('request:topology:acknowledged', () => {
        done();
      });
    });
  });

  describe('Connection Statistics', () => {
    test('should return connection stats', () => {
      const stats = getConnectionStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeChannels');
      expect(stats).toHaveProperty('channels');
      expect(Array.isArray(stats.channels)).toBe(true);
      expect(typeof stats.totalConnections).toBe('number');
    });

    test('should track channel subscriptions', (done) => {
      clientSocket.emit('subscribe', { channel: 'test-channel' });

      clientSocket.on('subscribed', () => {
        const stats = getConnectionStats();
        const testChannel = stats.channels.find(c => c.name === 'test-channel');
        expect(testChannel).toBeDefined();
        expect(testChannel.subscribers).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle socket errors', (done) => {
      serverSocket.on('error', (error) => {
        expect(error).toBeDefined();
      });

      // Trigger error by emitting invalid event
      clientSocket.emit('invalid:event:name', null);

      setTimeout(done, 500);
    });
  });

  describe('Disconnection', () => {
    test('should handle client disconnection', (done) => {
      const initialStats = getConnectionStats();
      const initialCount = initialStats.totalConnections;

      clientSocket.close();

      setTimeout(() => {
        const stats = getConnectionStats();
        expect(stats.totalConnections).toBeLessThanOrEqual(initialCount);
        done();
      }, 500);
    });
  });
});
