/**
 * Middleware Unit Tests
 * Tests for custom middleware components
 */

const request = require('supertest');
const express = require('express');
const { sanitizeInput } = require('../middleware/validation');
const { asyncHandler, AppError, notFoundHandler, errorHandler } = require('../middleware/errorHandler');

describe('Middleware Tests', () => {
  describe('Input Sanitization Middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(sanitizeInput);
    });

    test('should remove script tags from query parameters', () => {
      app.get('/test', (req, res) => {
        res.json({ query: req.query });
      });

      return request(app)
        .get('/test?name=<script>alert("xss")</script>test')
        .expect(200)
        .then(response => {
          expect(response.body.query.name).not.toContain('<script>');
          expect(response.body.query.name).toContain('test');
        });
    });

    test('should remove javascript: protocol from input', () => {
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      return request(app)
        .post('/test')
        .send({ url: 'javascript:alert("xss")' })
        .expect(200)
        .then(response => {
          expect(response.body.body.url).not.toContain('javascript:');
        });
    });

    test('should allow normal input through', () => {
      app.get('/test', (req, res) => {
        res.json({ query: req.query });
      });

      return request(app)
        .get('/test?name=JohnDoe&age=30')
        .expect(200)
        .then(response => {
          expect(response.body.query.name).toBe('JohnDoe');
          expect(response.body.query.age).toBe('30');
        });
    });
  });

  describe('Error Handler Middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    test('should handle async errors with asyncHandler', async () => {
      app.get('/test', asyncHandler(async (req, res) => {
        throw new Error('Test error');
      }));

      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Test error');
    });

    test('should handle AppError with custom status code', async () => {
      app.get('/test', asyncHandler(async (req, res) => {
        throw new AppError('Custom error', 400);
      }));

      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(400);

      expect(response.body.message).toBe('Custom error');
    });

    test('should handle 404 not found', async () => {
      app.get('/existing', (req, res) => {
        res.json({ success: true });
      });

      app.use(notFoundHandler);
      app.use(errorHandler);

      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.message).toContain('Route not found');
    });
  });

  describe('Rate Limiter Middleware', () => {
    test('rate limiter module should export correct functions', () => {
      const rateLimiters = require('../middleware/rateLimiter');

      expect(rateLimiters).toHaveProperty('apiLimiter');
      expect(rateLimiters).toHaveProperty('strictLimiter');
      expect(rateLimiters).toHaveProperty('authLimiter');
      expect(rateLimiters).toHaveProperty('healthCheckLimiter');
    });
  });

  describe('Validation Middleware', () => {
    test('validation module should export correct functions', () => {
      const validation = require('../middleware/validation');

      expect(validation).toHaveProperty('handleValidationErrors');
      expect(validation).toHaveProperty('validatePagination');
      expect(validation).toHaveProperty('validateSort');
      expect(validation).toHaveProperty('validateFilter');
      expect(validation).toHaveProperty('sanitizeInput');
    });
  });

  describe('Logger Configuration', () => {
    test('logger should be properly configured', () => {
      const logger = require('../config/logger');

      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('requestLogger');
      expect(logger).toHaveProperty('errorLogger');
      expect(logger).toHaveProperty('logApiCall');
    });
  });
});
