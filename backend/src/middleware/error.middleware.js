const { logger } = require('../config/logger');

/**
 * Error Middleware
 * Centralized error handling for the application
 */

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logError(err, req);

  // Determine error response
  const errorResponse = formatErrorResponse(err);

  // Send response
  res.status(errorResponse.statusCode).json(errorResponse.body);
};

/**
 * Log error with appropriate level and context
 */
const logError = (err, req) => {
  const logContext = {
    path: req.path,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?._id || req.user?.id || 'unauthenticated',
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };

  // Add request body if available (excluding sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    logContext.body = sanitizedBody;
  }

  // Add query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    logContext.query = req.query;
  }

  // Add params
  if (req.params && Object.keys(req.params).length > 0) {
    logContext.params = req.params;
  }

  // Determine log level based on status code
  const statusCode = err.statusCode || err.status || 500;
  
  if (statusCode >= 500) {
    logger.error(`${err.message}`, {
      ...logContext,
      stack: err.stack,
      error: err,
    });
  } else if (statusCode >= 400) {
    logger.warn(`${err.message}`, {
      ...logContext,
      statusCode,
    });
  } else {
    logger.info(`${err.message}`, logContext);
  }
};

/**
 * Sanitize request body to remove sensitive data
 */
const sanitizeRequestBody = (body) => {
  const sensitiveFields = ['password', 'token', 'refreshToken', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  
  return sanitized;
};

/**
 * Format error response based on error type
 */
const formatErrorResponse = (err) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = err.details || err.errors || null;
  let stack = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message || 'Validation error';
    errors = formatValidationErrors(err);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate key error';
    errors = formatDuplicateKeyError(err);
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = formatMulterError(err);
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request entity too large';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal server error';
    errors = null;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    stack = err.stack;
  }

  // Build response body
  const body = {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: err.path || null,
  };

  if (errors) {
    body.errors = errors;
  }

  if (stack) {
    body.stack = stack;
  }

  return { statusCode, body };
};

/**
 * Format validation errors
 */
const formatValidationErrors = (err) => {
  if (err.details) {
    if (Array.isArray(err.details)) {
      return err.details.map(detail => ({
        field: detail.path || detail.field || detail.param,
        message: detail.message,
        type: detail.type || 'validation',
      }));
    }
    return err.details;
  }

  if (err.errors) {
    if (typeof err.errors === 'object') {
      return Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message,
        type: 'validation',
      }));
    }
    return err.errors;
  }

  return [{ message: err.message }];
};

/**
 * Format duplicate key error
 */
const formatDuplicateKeyError = (err) => {
  const keyPattern = err.keyPattern || {};
  const keyValue = err.keyValue || {};
  
  return Object.keys(keyPattern).map(key => ({
    field: key,
    message: `Duplicate value for ${key}: ${keyValue[key]}`,
    type: 'duplicate',
  }));
};

/**
 * Format multer error
 */
const formatMulterError = (err) => {
  if (err.code === 'FILE_TOO_LARGE') {
    return 'File too large. Maximum file size is 5MB.';
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return 'File too large. Maximum file size is 5MB.';
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return 'Unexpected file field.';
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return 'Too many files.';
  }
  if (err.code === 'LIMIT_PART_COUNT') {
    return 'Too many parts.';
  }
  if (err.code === 'LIMIT_FIELD_KEY') {
    return 'Field name too long.';
  }
  if (err.code === 'LIMIT_FIELD_VALUE') {
    return 'Field value too long.';
  }
  if (err.code === 'LIMIT_FIELD_COUNT') {
    return 'Too many fields.';
  }
  return err.message || 'File upload error';
};

// ============================================
// ASYNC ERROR HANDLER WRAPPER
// ============================================

/**
 * Wraps async controller functions to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Alternative: Wraps async handler with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// ============================================
// 404 NOT FOUND HANDLER
// ============================================

/**
 * 404 handler for routes that don't exist
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.method} ${req.path}`, 404);
  next(error);
};

// ============================================
// UNHANDLED REJECTION HANDLER
// ============================================

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (err) => {
  logger.error('UNHANDLED REJECTION 💥', {
    error: err.message,
    stack: err.stack,
  });
  
  // Gracefully shutdown
  process.exit(1);
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = (err) => {
  logger.error('UNCAUGHT EXCEPTION 💥', {
    error: err.message,
    stack: err.stack,
  });
  
  // Gracefully shutdown
  process.exit(1);
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Error handler
  errorHandler,
  notFoundHandler,
  
  // Wrappers
  catchAsync,
  asyncHandler,
  
  // Custom error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  RateLimitError,
  ServiceUnavailableError,
  
  // Event handlers
  handleUnhandledRejection,
  handleUncaughtException,
};