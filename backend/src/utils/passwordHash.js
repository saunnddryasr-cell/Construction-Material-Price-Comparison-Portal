/**
 * Password Hash Utility
 * Comprehensive password hashing and verification utilities
 * Uses bcrypt for secure password hashing
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logger } = require('../src/config/logger');

class PasswordHash {
  /**
   * Default configuration
   */
  static config = {
    saltRounds: 12,
    algorithm: 'bcrypt',
    encoding: 'utf8',
    hashFormat: 'base64',
    pepper: process.env.PASSWORD_PEPPER || '',
  };

  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @param {number} saltRounds - Number of salt rounds (default: 12)
   * @returns {Promise<string>} - Hashed password
   */
  static async hash(password, saltRounds = this.config.saltRounds) {
    try {
      if (!password) {
        throw new Error('Password is required');
      }

      // Apply pepper if configured
      const pepperedPassword = this.applyPepper(password);
      
      // Generate salt
      const salt = await bcrypt.genSalt(saltRounds);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(pepperedPassword, salt);
      
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Hash a password synchronously
   * @param {string} password - Plain text password
   * @param {number} saltRounds - Number of salt rounds (default: 12)
   * @returns {string} - Hashed password
   */
  static hashSync(password, saltRounds = this.config.saltRounds) {
    try {
      if (!password) {
        throw new Error('Password is required');
      }

      // Apply pepper if configured
      const pepperedPassword = this.applyPepper(password);
      
      // Generate salt and hash
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(pepperedPassword, salt);
      
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password to verify
   * @param {string} hashedPassword - Hashed password to compare against
   * @returns {Promise<boolean>} - True if password matches
   */
  static async verify(password, hashedPassword) {
    try {
      if (!password || !hashedPassword) {
        return false;
      }

      // Apply pepper if configured
      const pepperedPassword = this.applyPepper(password);
      
      // Compare password with hash
      const isValid = await bcrypt.compare(pepperedPassword, hashedPassword);
      
      return isValid;
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Verify a password synchronously
   * @param {string} password - Plain text password to verify
   * @param {string} hashedPassword - Hashed password to compare against
   * @returns {boolean} - True if password matches
   */
  static verifySync(password, hashedPassword) {
    try {
      if (!password || !hashedPassword) {
        return false;
      }

      // Apply pepper if configured
      const pepperedPassword = this.applyPepper(password);
      
      // Compare password with hash
      const isValid = bcrypt.compareSync(pepperedPassword, hashedPassword);
      
      return isValid;
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Apply pepper to password if configured
   * @param {string} password - Plain text password
   * @returns {string} - Password with pepper applied
   */
  static applyPepper(password) {
    if (this.config.pepper) {
      return password + this.config.pepper;
    }
    return password;
  }

  /**
   * Generate a random password
   * @param {number} length - Length of password (default: 12)
   * @param {Object} options - Password generation options
   * @returns {string} - Generated password
   */
  static generatePassword(length = 12, options = {}) {
    const {
      uppercase = true,
      lowercase = true,
      numbers = true,
      symbols = true,
      excludeSimilar = false,
      excludeAmbiguous = false,
    } = options;

    let chars = '';
    
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (excludeSimilar) {
      chars = chars.replace(/[ilLI1oO0]/g, '');
    }

    if (excludeAmbiguous) {
      chars = chars.replace(/[{}[\]()/\\|;:'"<>,.?]/g, '');
    }

    if (chars.length === 0) {
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    }

    let password = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % chars.length;
      password += chars[index];
    }

    return password;
  }

  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default: 32)
   * @param {string} encoding - Encoding format (default: 'hex')
   * @returns {string} - Generated token
   */
  static generateToken(length = 32, encoding = 'hex') {
    return crypto.randomBytes(length).toString(encoding);
  }

  /**
   * Generate a one-time password (OTP)
   * @param {number} length - Length of OTP (default: 6)
   * @param {boolean} letters - Include letters (default: false)
   * @returns {string} - Generated OTP
   */
  static generateOTP(length = 6, letters = false) {
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
   * Check password strength
   * @param {string} password - Password to check
   * @returns {Object} - Strength report
   */
  static checkStrength(password) {
    if (!password) {
      return {
        score: 0,
        strength: 'none',
        feedback: ['Password is required'],
      };
    }

    let score = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password should be at least 8 characters');
    }

    if (password.length >= 12) {
      score += 1;
    } else if (password.length >= 8) {
      feedback.push('Password should be at least 12 characters for better security');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one number');
    }

    // Symbol check
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one special character');
    }

    // Common patterns check
    const commonPatterns = [
      'password', '123456', 'qwerty', 'abc123', 'password123',
      'admin', 'welcome', 'letmein', 'monkey', 'dragon',
    ];
    
    const lowerPass = password.toLowerCase();
    if (commonPatterns.some(pattern => lowerPass.includes(pattern))) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid common passwords');
    }

    // Consecutive characters check
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid repeating characters');
    }

    // Keyboard patterns check
    const keyboardPatterns = [
      'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop',
      'asdfghjkl', 'zxcvbnm', '1234567890',
    ];
    
    if (keyboardPatterns.some(pattern => lowerPass.includes(pattern))) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid keyboard patterns');
    }

    // Determine strength
    let strength = 'weak';
    if (score >= 7) strength = 'excellent';
    else if (score >= 6) strength = 'strong';
    else if (score >= 4) strength = 'good';
    else if (score >= 2) strength = 'fair';

    const maxScore = 7;
    const percentage = Math.round((score / maxScore) * 100);

    return {
      score,
      maxScore,
      percentage,
      strength,
      feedback: feedback.length > 0 ? feedback : ['Password is strong'],
      isStrong: strength === 'excellent' || strength === 'strong',
    };
  }

  /**
   * Validate password against requirements
   * @param {string} password - Password to validate
   * @param {Object} requirements - Validation requirements
   * @returns {Object} - Validation result
   */
  static validatePassword(password, requirements = {}) {
    const {
      minLength = 8,
      maxLength = 100,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSymbols = false,
      allowedSymbols = '!@#$%^&*()_+-=[]{}|;:,.<>?',
      customPatterns = [],
    } = requirements;

    const errors = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters`);
    }

    if (password.length > maxLength) {
      errors.push(`Password must not exceed ${maxLength} characters`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSymbols) {
      const symbolRegex = new RegExp(`[${allowedSymbols.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!symbolRegex.test(password)) {
        errors.push(`Password must contain at least one special character (${allowedSymbols})`);
      }
    }

    // Custom pattern validation
    for (const pattern of customPatterns) {
      if (!pattern.regex.test(password)) {
        errors.push(pattern.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Hash a password with HMAC (for additional security)
   * @param {string} password - Password to hash
   * @param {string} secret - Secret key for HMAC
   * @returns {string} - HMAC hashed password
   */
  static hmacHash(password, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(password)
      .digest('hex');
  }

  /**
   * Generate a password reset token
   * @param {string} userId - User ID
   * @param {string} secret - Secret key
   * @param {number} expiresIn - Expiry time in seconds (default: 3600)
   * @returns {string} - Reset token
   */
  static generateResetToken(userId, secret, expiresIn = 3600) {
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
   * Verify a password reset token
   * @param {string} token - Reset token
   * @param {string} secret - Secret key
   * @returns {Object|null} - Decoded token data or null if invalid
   */
  static verifyResetToken(token, secret) {
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
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Upgrade an old hash to a new format
   * @param {string} password - Plain text password
   * @param {string} oldHash - Old hash to compare
   * @param {number} newSaltRounds - New salt rounds
   * @returns {Promise<Object>} - New hash and upgrade status
   */
  static async upgradeHash(password, oldHash, newSaltRounds = 12) {
    try {
      // Check if the hash is already using the new rounds
      const isMatch = await this.verify(password, oldHash);
      
      if (!isMatch) {
        throw new Error('Password does not match old hash');
      }

      // Create new hash with updated rounds
      const newHash = await this.hash(password, newSaltRounds);
      
      return {
        success: true,
        newHash,
        upgraded: true,
        message: 'Password hash upgraded successfully',
      };
    } catch (error) {
      logger.error('Hash upgrade failed:', error);
      return {
        success: false,
        upgraded: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if a hash needs rehashing
   * @param {string} hash - Hashed password
   * @param {number} recommendedRounds - Recommended salt rounds
   * @returns {boolean} - True if hash needs upgrading
   */
  static needsRehash(hash, recommendedRounds = 12) {
    try {
      // Extract salt rounds from the hash
      const parts = hash.split('$');
      if (parts.length >= 4) {
        const rounds = parseInt(parts[2]);
        if (!isNaN(rounds) && rounds < recommendedRounds) {
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Rehash check failed:', error);
      return false;
    }
  }

  /**
   * Get hash algorithm information
   * @param {string} hash - Hashed password
   * @returns {Object} - Algorithm information
   */
  static getHashInfo(hash) {
    try {
      const parts = hash.split('$');
      if (parts.length >= 4) {
        return {
          algorithm: parts[1],
          rounds: parseInt(parts[2]),
          salt: parts[3].substring(0, 22),
          algorithmFull: `bcrypt_${parts[1]}_rounds_${parts[2]}`,
        };
      }
      return null;
    } catch (error) {
      logger.error('Hash info extraction failed:', error);
      return null;
    }
  }

  /**
   * Generate a password hash using multiple algorithms (for migration)
   * @param {string} password - Plain text password
   * @param {Array} algorithms - Algorithms to use
   * @returns {Object} - Hashes for each algorithm
   */
  static async multiHash(password, algorithms = ['bcrypt', 'sha256']) {
    const results = {};

    for (const algo of algorithms) {
      switch (algo) {
        case 'bcrypt':
          results.bcrypt = await this.hash(password);
          break;
        case 'sha256':
          results.sha256 = crypto
            .createHash('sha256')
            .update(password)
            .digest('hex');
          break;
        case 'sha512':
          results.sha512 = crypto
            .createHash('sha512')
            .update(password)
            .digest('hex');
          break;
        default:
          results[algo] = null;
      }
    }

    return results;
  }
}

module.exports = PasswordHash;