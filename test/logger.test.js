/**
 * Logger Unit Tests
 * Tests for Winston logger configuration
 */

const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

describe('Logger Configuration', () => {
  const logsDir = path.join(__dirname, '..', 'logs');

  afterAll(() => {
    // Cleanup test logs if needed
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      files.forEach(file => {
        if (file.includes('test')) {
          try {
            fs.unlinkSync(path.join(logsDir, file));
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      });
    }
  });

  describe('Logger Instance', () => {
    test('should have required logging methods', () => {
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    test('should have custom logging methods', () => {
      expect(logger).toHaveProperty('requestLogger');
      expect(logger).toHaveProperty('errorLogger');
      expect(logger).toHaveProperty('logApiCall');
      expect(logger).toHaveProperty('logCacheOperation');
      expect(logger).toHaveProperty('logPerformance');
    });
  });

  describe('Logging Methods', () => {
    test('should log info messages without errors', () => {
      expect(() => {
        logger.info('Test info message');
      }).not.toThrow();
    });

    test('should log error messages without errors', () => {
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();
    });

    test('should log warning messages without errors', () => {
      expect(() => {
        logger.warn('Test warning message');
      }).not.toThrow();
    });

    test('should log debug messages without errors', () => {
      expect(() => {
        logger.debug('Test debug message');
      }).not.toThrow();
    });
  });

  describe('Custom Logging Methods', () => {
    test('logApiCall should log API calls', () => {
      expect(() => {
        logger.logApiCall('/test/endpoint', 'GET', 'success', { count: 5 });
      }).not.toThrow();
    });

    test('logCacheOperation should log cache operations', () => {
      expect(() => {
        logger.logCacheOperation('get', 'test-key', true);
      }).not.toThrow();
    });

    test('logPerformance should log performance metrics', () => {
      expect(() => {
        logger.logPerformance('response-time', 150, 'ms');
      }).not.toThrow();
    });
  });

  describe('Request Logger Middleware', () => {
    test('should be a function', () => {
      expect(typeof logger.requestLogger).toBe('function');
    });

    test('should have correct middleware signature', () => {
      expect(logger.requestLogger.length).toBe(3); // req, res, next
    });
  });

  describe('Error Logger Middleware', () => {
    test('should be a function', () => {
      expect(typeof logger.errorLogger).toBe('function');
    });

    test('should have correct error middleware signature', () => {
      expect(logger.errorLogger.length).toBe(4); // err, req, res, next
    });
  });
});
