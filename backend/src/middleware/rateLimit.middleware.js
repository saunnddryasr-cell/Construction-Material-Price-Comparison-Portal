const rateLimit = require('express-rate-limit');

/**
 * Rate Limit Middleware
 * Prevents abuse by limiting the number of requests from a single IP
 */

// ============================================
// GENERAL RATE LIMITER
// ============================================

/**
 * Default rate limiter for all API routes
 * Limits: 100 requests per 15 minutes
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests too
  skipFailedRequests: false, // Count failed requests too
});

// ============================================
// STRICT RATE LIMITER (For Auth Routes)
// ============================================

/**
 * Stricter rate limiter for authentication routes
 * Limits: 5 requests per 15 minutes (to prevent brute force)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// ============================================
// API RATE LIMITER (For API Routes)
// ============================================

/**
 * Rate limiter for API endpoints
 * Limits: 1000 requests per hour
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 requests per hour
  message: {
    success: false,
    message: 'API rate limit exceeded, please try again after 1 hour',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// PRICE UPDATE RATE LIMITER
// ============================================

/**
 * Rate limiter for price update routes
 * Limits: 50 updates per hour (to prevent spam)
 */
const priceUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 price updates per hour
  message: {
    success: false,
    message: 'Price update limit exceeded, please try again after 1 hour',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// INQUIRY RATE LIMITER
// ============================================

/**
 * Rate limiter for inquiry creation
 * Limits: 20 inquiries per hour
 */
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 inquiries per hour
  message: {
    success: false,
    message: 'Too many inquiries sent, please try again after 1 hour',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// DOWNLOAD RATE LIMITER
// ============================================

/**
 * Rate limiter for file downloads
 * Limits: 10 downloads per hour
 */
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 downloads per hour
  message: {
    success: false,
    message: 'Download limit exceeded, please try again after 1 hour',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// ADMIN RATE LIMITER
// ============================================

/**
 * Rate limiter for admin routes
 * Limits: 200 requests per hour
 */
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Limit each IP to 200 admin requests per hour
  message: {
    success: false,
    message: 'Admin rate limit exceeded, please try again after 1 hour',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// SEARCH RATE LIMITER
// ============================================

/**
 * Rate limiter for search endpoints
 * Limits: 30 searches per minute
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: {
    success: false,
    message: 'Too many search requests, please slow down',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// CUSTOM RATE LIMITER WITH DYNAMIC CONFIGURATION
// ============================================

/**
 * Creates a custom rate limiter with specified options
 * @param {Object} options - Rate limiter options
 * @returns {Function} - Rate limiter middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    handler = (req, res) => {
      res.status(statusCode).json({
        success: false,
        message: typeof message === 'string' ? message : message.message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    },
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    statusCode,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    handler,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// ============================================
// SKIP RATE LIMITING FOR SPECIFIC ROUTES
// ============================================

/**
 * Skip rate limiting for specific IPs (whitelist)
 * @param {Array} whitelist - Array of IPs to whitelist
 * @returns {Function} - Middleware to skip rate limiting
 */
const skipRateLimit = (whitelist = []) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (whitelist.includes(ip)) {
      req.skipRateLimit = true;
    }
    next();
  };
};

/**
 * Rate limiter with whitelist support
 */
const createRateLimiterWithWhitelist = (options = {}, whitelist = []) => {
  return [
    skipRateLimit(whitelist),
    (req, res, next) => {
      if (req.skipRateLimit) {
        return next();
      }
      const limiter = createRateLimiter(options);
      limiter(req, res, next);
    },
  ];
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Default limiter
  limiter,
  
  // Specialized limiters
  authLimiter,
  apiLimiter,
  priceUpdateLimiter,
  inquiryLimiter,
  downloadLimiter,
  adminLimiter,
  searchLimiter,
  
  // Factory functions
  createRateLimiter,
  createRateLimiterWithWhitelist,
  skipRateLimit,
};