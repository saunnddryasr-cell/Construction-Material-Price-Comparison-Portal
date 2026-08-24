// backend/src/controllers/auth.controller.js
const User = require('../models/User.model');
const { generateToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { logger } = require('../config/logger');

class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password, role, profile } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists',
        });
      }

      // Create user
      const user = new User({
        username,
        email,
        password,
        role: role || 'contractor',
        profile,
      });

      await user.save();

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();

      return res.status(201).json({
        success: true,
        data: {
          user,
          token,
          refreshToken,
        },
        message: 'Registration successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated',
        });
      }

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        data: {
          user,
          token,
          refreshToken,
        },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const decoded = require('../middleware/auth.middleware').verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      const newToken = require('../middleware/auth.middleware').generateToken(user);

      return res.status(200).json({
        success: true,
        data: {
          token: newToken,
        },
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No user found with this email',
        });
      }

      // Generate reset token (simplified)
      const resetToken = require('../middleware/auth.middleware').generateToken(user);

      // In production, send email with reset link
      // await emailService.sendPasswordResetEmail(email, resetToken);

      return res.status(200).json({
        success: true,
        message: 'Password reset link sent to your email',
        data: { resetToken }, // Only for development
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
      }

      const decoded = require('../middleware/auth.middleware').verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }

      user.password = newPassword;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const user = req.user;
      user.refreshToken = null;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();