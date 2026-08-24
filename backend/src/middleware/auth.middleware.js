const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { logger } = require('../config/logger');

/**
 * Authentication Middleware
 * Handles JWT verification, user authentication, and role-based authorization
 */

// ============================================
// JWT CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Authenticate user using JWT token
 * Verifies token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          timestamp: new Date().toISOString(),
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Please login again.',
        timestamp: new Date().toISOString(),
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
        timestamp: new Date().toISOString(),
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        timestamp: new Date().toISOString(),
      });
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    req.userId = user._id;
    req.userRole = user.role;

    // Update last activity
    user.lastActive = new Date();
    await user.save().catch(err => logger.error('Failed to update lastActive:', err));

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please try again.',
      timestamp: new Date().toISOString(),
    });
  }
};

// ============================================
// OPTIONAL AUTHENTICATION
// ============================================

/**
 * Optional authentication - doesn't require token but attaches user if present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id;
          req.userRole = user.role;
        }
      } catch (error) {
        // Token invalid - just continue without user
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

// ============================================
// ROLE-BASED AUTHORIZATION
// ============================================

/**
 * Authorize users with specific roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

/**
 * Check if user is a supplier
 */
const isSupplier = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== 'supplier' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Supplier access required',
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Check if user is a contractor
 */
const isContractor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== 'contractor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Contractor access required',
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Check if user is an admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Check if user is verified (supplier verified by admin)
 */
const isVerified = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }

  // Admin bypass
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if supplier is verified
  if (req.user.role === 'supplier') {
    const user = await User.findById(req.user._id);
    if (!user.profile.verified) {
      return res.status(403).json({
        success: false,
        message: 'Supplier account must be verified to perform this action',
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

// ============================================
// RESOURCE OWNERSHIP CHECK
// ============================================

/**
 * Check if user owns the resource
 * @param {Function} getResourceId - Function to get resource ID from request
 * @param {Function} getResourceUserId - Function to get user ID from resource
 */
const ownsResource = (getResourceId, getResourceUserId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    // Admin bypass
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const resourceId = getResourceId(req);
      const resourceUserId = await getResourceUserId(resourceId);
      
      if (req.user._id.toString() !== resourceUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check failed:', error);
      return res.status(403).json({
        success: false,
        message: 'Failed to verify resource ownership',
        timestamp: new Date().toISOString(),
      });
    }
  };
};

// ============================================
// PERMISSION CHECK HELPERS
// ============================================

/**
 * Check if user has permission based on role and ownership
 */
const hasPermission = (user, resource, resourceUserId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user._id.toString() === resourceUserId.toString()) return true;
  return false;
};

/**
 * Check if user has specific role
 */
const hasRole = (user, roles) => {
  if (!user) return false;
  return roles.includes(user.role);
};

// ============================================
// TOKEN HELPERS
// ============================================

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Decode token without verification
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiry
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry < new Date();
};

// ============================================
// RATE LIMITING BY ROLE
// ============================================

/**
 * Get rate limit based on user role
 */
const getRateLimitByRole = (user) => {
  if (!user) return 100;
  
  const roleLimits = {
    admin: 1000,
    supplier: 200,
    contractor: 150,
    user: 100,
  };
  
  return roleLimits[user.role] || 100;
};

// ============================================
// CHECK IF USER IS LOGGED IN (Helper)
// ============================================

/**
 * Check if user is logged in (for views/templates)
 */
const isLoggedIn = (req) => {
  return !!req.user;
};

/**
 * Get current user from request
 */
const getCurrentUser = (req) => {
  return req.user || null;
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Authentication
  authenticate,
  optionalAuth,
  
  // Authorization
  authorize,
  isSupplier,
  isContractor,
  isAdmin,
  isVerified,
  ownsResource,
  
  // Permission helpers
  hasPermission,
  hasRole,
  
  // Token helpers
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiry,
  isTokenExpired,
  
  // Rate limiting
  getRateLimitByRole,
  
  // User helpers
  isLoggedIn,
  getCurrentUser,
  
  // Constants
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};