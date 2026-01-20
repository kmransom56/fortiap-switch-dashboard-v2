/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting for API endpoints to prevent abuse:
 * - General API limit: 100 requests per minute per IP
 * - Strict limit for expensive operations: 20 requests per minute per IP
 * - Authentication endpoints: 5 requests per minute per IP
 */

const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * General API rate limiter
 * Applies to most API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Strict rate limiter for expensive operations
 * Use for topology calculations, large data fetches, etc.
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many requests for this resource, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many requests for this resource, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Authentication rate limiter
 * Very strict limit for login/auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Health check rate limiter (more lenient)
 * For monitoring systems that check frequently
 */
const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Health check rate limit exceeded', {
      ip: req.ip
    });

    res.status(429).json({
      error: 'Too many health check requests'
    });
  }
});

module.exports = {
  apiLimiter,
  strictLimiter,
  authLimiter,
  healthCheckLimiter
};
