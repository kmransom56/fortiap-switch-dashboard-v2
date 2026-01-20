/**
 * Error Handling Middleware
 *
 * Provides centralized error handling for the application:
 * - Catches all errors and formats them consistently
 * - Logs errors with appropriate detail levels
 * - Returns user-friendly error messages
 * - Handles different error types appropriately
 * - Prevents sensitive information leakage
 */

const logger = require('../config/logger');

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error', statusCode = 502) {
    super(message, statusCode);
  }
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Handles requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route not found: ${req.method} ${req.url}`);
  next(error);
};

/**
 * Global error handler
 * Catches all errors and formats response
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code is set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Determine if error is operational (expected) or programming error
  const isOperational = err.isOperational || false;

  // Log error with appropriate level
  if (err.statusCode >= 500 || !isOperational) {
    // Server errors and programming errors - log with stack trace
    logger.error('Server error', {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      isOperational
    });
  } else {
    // Client errors - log without stack trace
    logger.warn('Client error', {
      message: err.message,
      statusCode: err.statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  }

  // Prepare error response
  const errorResponse = {
    status: err.status,
    message: err.message
  };

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.error = err;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.message = 'Validation failed';
    errorResponse.details = err.details || err.message;
  }

  if (err.name === 'CastError') {
    errorResponse.message = 'Invalid data format';
    err.statusCode = 400;
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Invalid token';
    err.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Token expired';
    err.statusCode = 401;
  }

  // Handle Axios errors (from FortiGate API calls)
  if (err.isAxiosError) {
    logger.error('FortiGate API error', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      url: err.config?.url
    });

    errorResponse.message = 'External API error';
    err.statusCode = err.response?.status || 502;

    // Don't expose internal API details to client
    if (process.env.NODE_ENV !== 'development') {
      delete errorResponse.stack;
    }
  }

  // Send error response
  res.status(err.statusCode).json(errorResponse);
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise
  });

  // In production, you might want to exit gracefully
  if (process.env.NODE_ENV === 'production') {
    console.error('UNHANDLED REJECTION! Shutting down...');
    process.exit(1);
  }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    message: err.message,
    stack: err.stack
  });

  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  process.exit(1);
});

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  asyncHandler,
  notFoundHandler,
  errorHandler
};
