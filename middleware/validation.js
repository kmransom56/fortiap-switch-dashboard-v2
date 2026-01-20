/**
 * Input Validation Middleware
 *
 * Provides input validation and sanitization for API endpoints using express-validator
 * Protects against:
 * - XSS attacks
 * - SQL injection
 * - Invalid data types
 * - Malicious input
 */

const { query, validationResult, param } = require('express-validator');
const logger = require('../config/logger');

/**
 * Validation error handler
 * Processes validation errors and returns formatted response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    logger.warn('Validation failed', {
      url: req.url,
      method: req.method,
      errors: errorMessages,
      ip: req.ip
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages
    });
  }

  next();
};

/**
 * Validate pagination parameters
 * Common validation for endpoints that support pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be an integer between 1 and 1000')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100')
    .toInt(),
  handleValidationErrors
];

/**
 * Validate sort parameters
 * Common validation for endpoints that support sorting
 */
const validateSort = [
  query('sortBy')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Sort field must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Sort field must contain only alphanumeric characters, hyphens, and underscores'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either "asc" or "desc"'),
  handleValidationErrors
];

/**
 * Validate filter parameters
 * Common validation for endpoints that support filtering
 */
const validateFilter = [
  query('filter')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Filter must be less than 200 characters'),
  handleValidationErrors
];

/**
 * Validate device serial number parameter
 * Used for endpoints that fetch specific device data
 */
const validateDeviceSerial = [
  param('serial')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Serial number must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Serial number must contain only alphanumeric characters and hyphens'),
  handleValidationErrors
];

/**
 * Validate date range parameters
 * Used for historical data endpoints
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate(),
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be an integer between 1 and 365')
    .toInt(),
  handleValidationErrors
];

/**
 * Validate boolean query parameters
 */
const validateBoolean = (field, defaultValue = false) => [
  query(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean value`)
    .toBoolean(),
  handleValidationErrors
];

/**
 * Sanitize user input
 * Remove potentially dangerous characters
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove potential XSS vectors
        req.query[key] = req.query[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }

  // Sanitize body parameters
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove potential XSS vectors
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }

  next();
};

/**
 * Validate API token (for future authentication endpoints)
 */
const validateApiToken = [
  query('token')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 32, max: 256 })
    .withMessage('API token must be between 32 and 256 characters'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validatePagination,
  validateSort,
  validateFilter,
  validateDeviceSerial,
  validateDateRange,
  validateBoolean,
  sanitizeInput,
  validateApiToken
};
