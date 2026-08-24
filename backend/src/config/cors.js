/**
 * CORS Configuration
 * Centralized CORS settings for the application
 */

const cors= {
  // Development settings
  development: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
    exposedHeaders: ['Authorization', 'X-Refresh-Token', 'X-Total-Count'],
    maxAge: 86400,
  },

  // Production settings
  production: {
    origin: [
      'https://construction-material-portal.com',
      'https://www.construction-material-portal.com',
      'https://api.construction-material-portal.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Refresh-Token',
      'X-API-Key',
      'X-CSRF-Token',
    ],
    exposedHeaders: [
      'Authorization',
      'X-Refresh-Token',
      'X-Total-Count',
      'X-Page',
      'X-Total-Pages',
    ],
    maxAge: 86400,
  },

  // Staging settings
  staging: {
    origin: [
      'https://staging.construction-material-portal.com',
      'https://preview.construction-material-portal.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
    exposedHeaders: ['Authorization', 'X-Refresh-Token'],
    maxAge: 86400,
  },

  // Public API settings (no authentication required)
  public: {
    origin: '*',
    credentials: false,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400,
  },

  // Admin API settings (stricter)
  admin: {
    origin: [
      'https://admin.construction-material-portal.com',
      'https://dashboard.construction-material-portal.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Admin-Key',
      'X-Admin-Token',
    ],
    exposedHeaders: ['Authorization', 'X-Admin-Token'],
    maxAge: 86400,
  },
};

/**
 * Get CORS configuration based on environment
 */
const getCorsConfig = (env = process.env.NODE_ENV) => {
  switch (env) {
    case 'production':
      return corsConfig.production;
    case 'staging':
      return corsConfig.staging;
    case 'development':
    default:
      return corsConfig.development;
  }
};

/**
 * Get CORS configuration for specific route
 */
const getCorsConfigForRoute = (path, env = process.env.NODE_ENV) => {
  if (path.startsWith('/api/public') || path.startsWith('/api/health')) {
    return corsConfig.public;
  }
  if (path.startsWith('/api/admin')) {
    return corsConfig.admin;
  }
  return getCorsConfig(env);
};

module.exports = {
  cors,
  getCorsConfig,
  getCorsConfigForRoute,
};