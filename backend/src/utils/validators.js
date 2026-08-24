// backend/src/utils/validators.js
const validator = require('validator');

class Validators {
  /**
   * Validate email address
   */
  static validateEmail(email) {
    const errors = [];

    if (!email) {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    if (typeof email !== 'string') {
      errors.push('Email must be a string');
      return { isValid: false, errors };
    }

    const trimmedEmail = email.trim();

    if (!validator.isEmail(trimmedEmail)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmedEmail,
    };
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone) {
    const errors = [];

    if (!phone) {
      errors.push('Phone number is required');
      return { isValid: false, errors };
    }

    if (typeof phone !== 'string') {
      errors.push('Phone number must be a string');
      return { isValid: false, errors };
    }

    const trimmedPhone = phone.trim();
    const digitsOnly = trimmedPhone.replace(/\D/g, '');

    if (digitsOnly.length !== 10) {
      errors.push('Phone number must be 10 digits');
    }

    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: digitsOnly,
    };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    const errors = [];
    let strengthScore = 0;

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors, strength: 'none' };
    }

    if (typeof password !== 'string') {
      errors.push('Password must be a string');
      return { isValid: false, errors, strength: 'none' };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    } else {
      strengthScore += 1;
    }

    if (password.length >= 12) {
      strengthScore += 1;
    }

    if (/[A-Z]/.test(password)) {
      strengthScore += 1;
    } else {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (/[a-z]/.test(password)) {
      strengthScore += 1;
    } else {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (/\d/.test(password)) {
      strengthScore += 1;
    } else {
      errors.push('Password must contain at least one number');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      strengthScore += 1;
    } else {
      errors.push('Password must contain at least one special character');
    }

    let strength = 'weak';
    if (strengthScore >= 7) strength = 'excellent';
    else if (strengthScore >= 6) strength = 'strong';
    else if (strengthScore >= 4) strength = 'good';
    else if (strengthScore >= 2) strength = 'fair';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: strengthScore,
      maxScore: 7,
      percentage: Math.round((strengthScore / 7) * 100),
    };
  }

  /**
   * Validate GST number (India)
   */
  static validateGST(gst) {
    const errors = [];

    if (!gst) {
      errors.push('GST number is required');
      return { isValid: false, errors };
    }

    if (typeof gst !== 'string') {
      errors.push('GST number must be a string');
      return { isValid: false, errors };
    }

    const trimmedGST = gst.trim().toUpperCase();
    const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstPattern.test(trimmedGST)) {
      errors.push('Invalid GST number format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmedGST,
    };
  }

  /**
   * Validate PAN number (India)
   */
  static validatePAN(pan) {
    const errors = [];

    if (!pan) {
      errors.push('PAN number is required');
      return { isValid: false, errors };
    }

    if (typeof pan !== 'string') {
      errors.push('PAN number must be a string');
      return { isValid: false, errors };
    }

    const trimmedPAN = pan.trim().toUpperCase();
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panPattern.test(trimmedPAN)) {
      errors.push('Invalid PAN number format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmedPAN,
    };
  }

  /**
   * Validate IFSC code
   */
  static validateIFSC(ifsc) {
    const errors = [];

    if (!ifsc) {
      errors.push('IFSC code is required');
      return { isValid: false, errors };
    }

    if (typeof ifsc !== 'string') {
      errors.push('IFSC code must be a string');
      return { isValid: false, errors };
    }

    const trimmedIFSC = ifsc.trim().toUpperCase();
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscPattern.test(trimmedIFSC)) {
      errors.push('Invalid IFSC code format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmedIFSC,
    };
  }

  /**
   * Validate PIN code (India)
   */
  static validatePIN(pincode) {
    const errors = [];

    if (!pincode) {
      errors.push('PIN code is required');
      return { isValid: false, errors };
    }

    if (typeof pincode !== 'string') {
      errors.push('PIN code must be a string');
      return { isValid: false, errors };
    }

    const trimmedPincode = pincode.trim();
    const pincodePattern = /^[0-9]{6}$/;

    if (!pincodePattern.test(trimmedPincode)) {
      errors.push('PIN code must be 6 digits');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmedPincode,
    };
  }

  /**
   * Validate URL
   */
  static validateURL(url) {
    const errors = [];

    if (!url) {
      errors.push('URL is required');
      return { isValid: false, errors };
    }

    if (typeof url !== 'string') {
      errors.push('URL must be a string');
      return { isValid: false, errors };
    }

    const trimmedURL = url.trim();

    if (!validator.isURL(trimmedURL)) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmedURL,
    };
  }

  /**
   * Validate date
   */
  static validateDate(date) {
    const errors = [];

    if (!date) {
      errors.push('Date is required');
      return { isValid: false, errors };
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      errors.push('Invalid date format');
      return { isValid: false, errors };
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: d,
    };
  }

  /**
   * Validate number
   */
  static validateNumber(value, options = {}) {
    const { min, max, integer = false, positive = false } = options;
    const errors = [];

    if (value === undefined || value === null) {
      errors.push('Value is required');
      return { isValid: false, errors };
    }

    const num = Number(value);
    if (isNaN(num)) {
      errors.push('Must be a valid number');
      return { isValid: false, errors };
    }

    if (integer && !Number.isInteger(num)) {
      errors.push('Must be an integer');
    }

    if (positive && num <= 0) {
      errors.push('Must be a positive number');
    }

    if (min !== undefined && num < min) {
      errors.push(`Must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
      errors.push(`Must not exceed ${max}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: num,
    };
  }

  /**
   * Validate enum value
   */
  static validateEnum(value, enumValues) {
    const errors = [];

    if (value === undefined || value === null) {
      errors.push('Value is required');
      return { isValid: false, errors };
    }

    const allowedValues = Array.isArray(enumValues) ? enumValues : Object.values(enumValues);

    if (!allowedValues.includes(value)) {
      errors.push(`Value must be one of: ${allowedValues.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      value,
    };
  }

  /**
   * Validate boolean
   */
  static validateBoolean(value) {
    const errors = [];

    if (value === undefined || value === null) {
      errors.push('Boolean is required');
      return { isValid: false, errors };
    }

    const boolValue = typeof value === 'string'
      ? value.toLowerCase() === 'true' || value === '1'
      : Boolean(value);

    return {
      isValid: true,
      errors: [],
      value: boolValue,
    };
  }

  /**
   * Validate string length
   */
  static validateStringLength(str, options = {}) {
    const { min = 0, max = Infinity, trim = true } = options;
    const errors = [];

    if (str === undefined || str === null) {
      errors.push('String is required');
      return { isValid: false, errors };
    }

    const value = trim ? str.trim() : str;

    if (value.length < min) {
      errors.push(`String must be at least ${min} characters`);
    }

    if (value.length > max) {
      errors.push(`String must not exceed ${max} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      value,
    };
  }

  /**
   * Validate UUID
   */
  static validateUUID(uuid) {
    const errors = [];

    if (!uuid) {
      errors.push('UUID is required');
      return { isValid: false, errors };
    }

    if (!validator.isUUID(uuid)) {
      errors.push('Invalid UUID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: uuid,
    };
  }

  /**
   * Validate JWT token
   */
  static validateJWT(token) {
    const errors = [];

    if (!token) {
      errors.push('JWT token is required');
      return { isValid: false, errors };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      errors.push('Invalid JWT format (must have 3 parts)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: token,
    };
  }
}

module.exports = Validators;