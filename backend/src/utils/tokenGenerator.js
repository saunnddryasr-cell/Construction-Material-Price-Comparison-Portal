/**
 * Token Generator Utility
 * Comprehensive token generation and management utilities
 * Supports JWT, OTP, API Keys, and various token types
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../src/config/logger');

class TokenGenerator {
  /**
   * Default configuration
   */
  static config = {
    jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
    otpLength: 6,
    otpExpiry: 300, // 5 minutes in seconds
    apiKeyLength: 32,
    resetTokenExpiry: 3600, // 1 hour in seconds
    verificationTokenExpiry: 86400, // 24 hours in seconds
    sessionTokenExpiry: 86400, // 24 hours in seconds
    tokenCharset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  };

  // ============================================
  // JWT TOKEN METHODS
  // ============================================

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {string} secret - JWT secret (optional)
   * @param {string|number} expiresIn - Expiry time (optional)
   * @returns {string} - JWT token
   */
  static generateJWT(payload, secret = this.config.jwtSecret, expiresIn = this.config.jwtExpiry) {
    try {
      const token = jwt.sign(payload, secret, { expiresIn });
      return token;
    } catch (error) {
      logger.error('JWT generation failed:', error);
      throw new Error('Failed to generate JWT token');
    }
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload
   * @param {string} secret - JWT refresh secret (optional)
   * @param {string|number} expiresIn - Expiry time (optional)
   * @returns {string} - JWT refresh token
   */
  static generateRefreshToken(payload, secret = this.config.jwtRefreshSecret, expiresIn = this.config.jwtRefreshExpiry) {
    try {
      const token = jwt.sign(payload, secret, { expiresIn });
      return token;
    } catch (error) {
      logger.error('Refresh token generation failed:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @param {string} secret - JWT secret (optional)
   * @returns {Object} - Decoded token payload
   */
  static verifyJWT(token, secret = this.config.jwtSecret) {
    try {
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify JWT refresh token
   * @param {string} token - JWT refresh token to verify
   * @param {string} secret - JWT refresh secret (optional)
   * @returns {Object} - Decoded token payload
   */
  static verifyRefreshToken(token, secret = this.config.jwtRefreshSecret) {
    try {
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Decode JWT token without verification
   * @param {string} token - JWT token to decode
   * @returns {Object|null} - Decoded token payload or null
   */
  static decodeJWT(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate JWT token pair (access + refresh)
   * @param {Object} payload - Token payload
   * @returns {Object} - { accessToken, refreshToken }
   */
  static generateTokenPair(payload) {
    const accessToken = this.generateJWT(payload);
    const refreshToken = this.generateRefreshToken({ userId: payload.userId });
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtExpiry,
      refreshExpiresIn: this.config.jwtRefreshExpiry,
    };
  }

  /**
   * Refresh JWT access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @param {Function} getUserFn - Function to get user by ID
   * @returns {Promise<Object>} - New token pair
   */
  static async refreshAccessToken(refreshToken, getUserFn) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      const user = await getUserFn(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      const newToken = this.generateJWT({
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      return {
        accessToken: newToken,
        refreshToken,
        expiresIn: this.config.jwtExpiry,
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Failed to refresh token');
    }
  }

  // ============================================
  // OTP TOKEN METHODS
  // ============================================

  /**
   * Generate OTP (One-Time Password)
   * @param {number} length - OTP length (default: 6)
   * @param {boolean} letters - Include letters (default: false)
   * @returns {string} - Generated OTP
   */
  static generateOTP(length = this.config.otpLength, letters = false) {
    let chars = '0123456789';
    if (letters) {
      chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    
    let otp = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % chars.length;
      otp += chars[index];
    }
    
    return otp;
  }

  /**
   * Generate OTP with expiry
   * @param {Object} data - Data to associate with OTP
   * @param {number} expirySeconds - Expiry in seconds (default: 300)
   * @returns {Object} - { otp, expiresAt }
   */
  static generateOTPWithExpiry(data = {}, expirySeconds = this.config.otpExpiry) {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    
    return {
      otp,
      expiresAt,
      data,
    };
  }

  /**
   * Verify OTP
   * @param {string} otp - OTP to verify
   * @param {string} storedOtp - Stored OTP to compare
   * @param {Date} expiresAt - Expiry timestamp
   * @returns {boolean} - True if valid
   */
  static verifyOTP(otp, storedOtp, expiresAt) {
    if (!otp || !storedOtp || !expiresAt) {
      return false;
    }

    if (otp !== storedOtp) {
      return false;
    }

    if (new Date() > new Date(expiresAt)) {
      return false;
    }

    return true;
  }

  // ============================================
  // API KEY METHODS
  // ============================================

  /**
   * Generate API key
   * @param {number} length - Key length (default: 32)
   * @param {string} prefix - Key prefix (optional)
   * @returns {string} - Generated API key
   */
  static generateAPIKey(length = this.config.apiKeyLength, prefix = '') {
    const chars = this.config.tokenCharset;
    let key = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % chars.length;
      key += chars[index];
    }
    
    return prefix ? `${prefix}_${key}` : key;
  }

  /**
   * Generate API key with hashed version for storage
   * @param {number} length - Key length (default: 32)
   * @param {string} prefix - Key prefix (optional)
   * @returns {Object} - { key, hashedKey }
   */
  static generateAPIKeyWithHash(length = this.config.apiKeyLength, prefix = '') {
    const key = this.generateAPIKey(length, prefix);
    const hashedKey = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');
    
    return { key, hashedKey };
  }

  /**
   * Verify API key against hashed version
   * @param {string} key - API key to verify
   * @param {string} hashedKey - Hashed API key
   * @returns {boolean} - True if valid
   */
  static verifyAPIKey(key, hashedKey) {
    const computedHash = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');
    
    return computedHash === hashedKey;
  }

  // ============================================
  // RESET TOKEN METHODS
  // ============================================

  /**
   * Generate password reset token
   * @param {string} userId - User ID
   * @param {string} secret - Secret key (optional)
   * @param {number} expiresIn - Expiry in seconds (default: 3600)
   * @returns {string} - Reset token
   */
  static generateResetToken(userId, secret = this.config.jwtSecret, expiresIn = this.config.resetTokenExpiry) {
    const timestamp = Math.floor(Date.now() / 1000);
    const expiry = timestamp + expiresIn;
    
    const data = `${userId}:${expiry}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    
    return Buffer.from(`${data}:${signature}`).toString('base64');
  }

  /**
   * Verify password reset token
   * @param {string} token - Reset token
   * @param {string} secret - Secret key (optional)
   * @returns {Object|null} - { userId, expiry } or null
   */
  static verifyResetToken(token, secret = this.config.jwtSecret) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const [userId, expiry, signature] = decoded.split(':');
      
      if (!userId || !expiry || !signature) {
        return null;
      }

      // Check expiry
      const expiryNum = parseInt(expiry);
      if (expiryNum < Math.floor(Date.now() / 1000)) {
        return null;
      }

      // Verify signature
      const data = `${userId}:${expiry}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return null;
      }

      return { userId, expiry: expiryNum };
    } catch (error) {
      logger.error('Reset token verification failed:', error);
      return null;
    }
  }

  // ============================================
  // VERIFICATION TOKEN METHODS
  // ============================================

  /**
   * Generate email verification token
   * @param {string} email - Email address
   * @param {string} secret - Secret key (optional)
   * @param {number} expiresIn - Expiry in seconds (default: 86400)
   * @returns {string} - Verification token
   */
  static generateVerificationToken(email, secret = this.config.jwtSecret, expiresIn = this.config.verificationTokenExpiry) {
    const timestamp = Math.floor(Date.now() / 1000);
    const expiry = timestamp + expiresIn;
    
    const data = `${email}:${expiry}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    
    return Buffer.from(`${data}:${signature}`).toString('base64');
  }

  /**
   * Verify email verification token
   * @param {string} token - Verification token
   * @param {string} secret - Secret key (optional)
   * @returns {Object|null} - { email, expiry } or null
   */
  static verifyVerificationToken(token, secret = this.config.jwtSecret) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const [email, expiry, signature] = decoded.split(':');
      
      if (!email || !expiry || !signature) {
        return null;
      }

      // Check expiry
      const expiryNum = parseInt(expiry);
      if (expiryNum < Math.floor(Date.now() / 1000)) {
        return null;
      }

      // Verify signature
      const data = `${email}:${expiry}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return null;
      }

      return { email, expiry: expiryNum };
    } catch (error) {
      logger.error('Verification token verification failed:', error);
      return null;
    }
  }

  // ============================================
  // SESSION TOKEN METHODS
  // ============================================

  /**
   * Generate session token
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID (optional)
   * @returns {string} - Session token
   */
  static generateSessionToken(userId, sessionId = null) {
    const sid = sessionId || uuidv4();
    const data = `${userId}:${sid}:${Date.now()}`;
    const token = crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
    
    return {
      token,
      sessionId: sid,
      userId,
    };
  }

  /**
   * Generate session token with expiry
   * @param {string} userId - User ID
   * @param {number} expiresIn - Expiry in seconds (default: 86400)
   * @returns {Object} - { token, sessionId, expiresAt }
   */
  static generateSessionTokenWithExpiry(userId, expiresIn = this.config.sessionTokenExpiry) {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const data = `${userId}:${sessionId}:${Date.now()}:${expiresAt.getTime()}`;
    const token = crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
    
    return {
      token,
      sessionId,
      userId,
      expiresAt,
    };
  }

  // ============================================
  // UUID TOKEN METHODS
  // ============================================

  /**
   * Generate UUID v4
   * @returns {string} - UUID v4
   */
  static generateUUID() {
    return uuidv4();
  }

  /**
   * Generate short UUID (8 characters)
   * @returns {string} - Short UUID
   */
  static generateShortUUID() {
    return uuidv4().split('-')[0];
  }

  /**
   * Generate multiple UUIDs
   * @param {number} count - Number of UUIDs to generate
   * @returns {string[]} - Array of UUIDs
   */
  static generateUUIDs(count = 1) {
    const uuids = [];
    for (let i = 0; i < count; i++) {
      uuids.push(this.generateUUID());
    }
    return uuids;
  }

  // ============================================
  // RANDOM TOKEN METHODS
  // ============================================

  /**
   * Generate random token
   * @param {number} length - Token length (default: 32)
   * @param {string} charset - Character set (optional)
   * @returns {string} - Random token
   */
  static generateRandomToken(length = 32, charset = null) {
    const chars = charset || this.config.tokenCharset;
    let token = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % chars.length;
      token += chars[index];
    }
    
    return token;
  }

  /**
   * Generate hex token
   * @param {number} length - Token length in bytes (default: 16)
   * @returns {string} - Hex token
   */
  static generateHexToken(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate base64 token
   * @param {number} length - Token length in bytes (default: 16)
   * @returns {string} - Base64 token
   */
  static generateBase64Token(length = 16) {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Generate URL-safe token
   * @param {number} length - Token length in bytes (default: 16)
   * @returns {string} - URL-safe token
   */
  static generateURLSafeToken(length = 16) {
    return crypto.randomBytes(length)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // ============================================
  // REFERRAL TOKEN METHODS
  // ============================================

  /**
   * Generate referral token
   * @param {string} userId - User ID
   * @param {string} secret - Secret key (optional)
   * @returns {string} - Referral token
   */
  static generateReferralToken(userId, secret = this.config.jwtSecret) {
    const data = `${userId}:${Date.now()}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    
    return Buffer.from(`${userId}:${signature}`).toString('base64');
  }

  /**
   * Decode referral token
   * @param {string} token - Referral token
   * @param {string} secret - Secret key (optional)
   * @returns {Object|null} - { userId, timestamp } or null
   */
  static decodeReferralToken(token, secret = this.config.jwtSecret) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const [userId, signature] = decoded.split(':');
      
      if (!userId || !signature) {
        return null;
      }

      return { userId };
    } catch (error) {
      logger.error('Referral token decode failed:', error);
      return null;
    }
  }

  // ============================================
  // SHARED LINK TOKEN METHODS
  // ============================================

  /**
   * Generate shared link token
   * @param {Object} data - Data to encode
   * @param {number} expiresIn - Expiry in seconds (optional)
   * @param {string} secret - Secret key (optional)
   * @returns {string} - Shared link token
   */
  static generateSharedLinkToken(data, expiresIn = null, secret = this.config.jwtSecret) {
    const timestamp = Date.now();
    const payload = {
      ...data,
      timestamp,
      ...(expiresIn ? { expiresAt: timestamp + expiresIn * 1000 } : {}),
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    return Buffer.from(`${payloadString}:${signature}`).toString('base64');
  }

  /**
   * Verify shared link token
   * @param {string} token - Shared link token
   * @param {string} secret - Secret key (optional)
   * @returns {Object|null} - Decoded data or null
   */
  static verifySharedLinkToken(token, secret = this.config.jwtSecret) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const lastColon = decoded.lastIndexOf(':');
      const payloadString = decoded.substring(0, lastColon);
      const signature = decoded.substring(lastColon + 1);
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return null;
      }
      
      const payload = JSON.parse(payloadString);
      
      // Check expiry
      if (payload.expiresAt && payload.expiresAt < Date.now()) {
        return null;
      }
      
      return payload;
    } catch (error) {
      logger.error('Shared link token verification failed:', error);
      return null;
    }
  }

  // ============================================
  // TOKEN VALIDATION & INFO
  // ============================================

  /**
   * Get token expiry from JWT
   * @param {string} token - JWT token
   * @returns {Date|null} - Expiry date or null
   */
  static getTokenExpiry(token) {
    try {
      const decoded = this.decodeJWT(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} - True if expired
   */
  static isTokenExpired(token) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  }

  /**
   * Get remaining time on token
   * @param {string} token - JWT token
   * @returns {number} - Remaining seconds
   */
  static getTokenRemainingTime(token) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return 0;
    const remaining = (expiry - new Date()) / 1000;
    return Math.max(0, remaining);
  }

  /**
   * Validate token format
   * @param {string} token - Token to validate
   * @param {string} type - Token type ('jwt', 'otp', 'api_key', etc.)
   * @returns {boolean} - True if valid format
   */
  static validateTokenFormat(token, type = 'jwt') {
    if (!token) return false;

    switch (type) {
      case 'jwt':
        // JWT has 3 parts separated by dots
        return token.split('.').length === 3;
      case 'otp':
        return /^\d{4,8}$/.test(token);
      case 'api_key':
        return /^[A-Za-z0-9_]{16,64}$/.test(token);
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
      case 'hex':
        return /^[0-9a-f]+$/i.test(token);
      case 'base64':
        return /^[A-Za-z0-9+/=]+$/.test(token);
      default:
        return true;
    }
  }

  // ============================================
  // BATCH TOKEN GENERATION
  // ============================================

  /**
   * Generate multiple tokens
   * @param {number} count - Number of tokens to generate
   * @param {string} type - Token type ('random', 'hex', 'base64', 'uuid')
   * @param {Object} options - Token generation options
   * @returns {string[]} - Array of tokens
   */
  static generateMultipleTokens(count = 1, type = 'random', options = {}) {
    const tokens = [];
    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'random':
          tokens.push(this.generateRandomToken(options.length, options.charset));
          break;
        case 'hex':
          tokens.push(this.generateHexToken(options.length));
          break;
        case 'base64':
          tokens.push(this.generateBase64Token(options.length));
          break;
        case 'uuid':
          tokens.push(this.generateUUID());
          break;
        case 'short_uuid':
          tokens.push(this.generateShortUUID());
          break;
        default:
          tokens.push(this.generateRandomToken(32));
      }
    }
    return tokens;
  }
}

module.exports = TokenGenerator;