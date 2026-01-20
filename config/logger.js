/**
 * Winston Logger Configuration
 *
 * Provides centralized logging for all services with:
 * - File-based logging with rotation
 * - Console logging with colors
 * - Different log levels per environment
 * - Structured JSON logging for production
 * - Request/response logging
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

// Determine log level based on environment
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create Winston logger instance
const logger = winston.createLogger({
  level,
  format: logFormat,
  defaultMeta: { service: 'fortiap-dashboard' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Console output (skip in test environment)
    ...(process.env.NODE_ENV !== 'test' ? [
      new winston.transports.Console({
        format: consoleFormat
      })
    ] : [])
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

/**
 * Express middleware for request logging
 */
logger.requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    logger[logLevel]('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress
    });
  });

  next();
};

/**
 * Express error logging middleware
 */
logger.errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    ip: req.ip || req.connection.remoteAddress
  });

  next(err);
};

/**
 * Log FortiGate API calls
 */
logger.logApiCall = (endpoint, method = 'GET', status = 'success', details = {}) => {
  logger.info('FortiGate API call', {
    endpoint,
    method,
    status,
    ...details
  });
};

/**
 * Log cache operations
 */
logger.logCacheOperation = (operation, key, hit = true) => {
  logger.debug('Cache operation', {
    operation,
    key,
    hit
  });
};

/**
 * Log performance metrics
 */
logger.logPerformance = (metric, value, unit = 'ms') => {
  logger.info('Performance metric', {
    metric,
    value,
    unit
  });
};

module.exports = logger;
