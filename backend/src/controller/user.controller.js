const User = require('../models/User.model');
const Price = require('../models/Price.model');
const Inquiry = require('../models/Inquiry.model');
const Review = require('../models/Review.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');
const { ValidationError, NotFoundError } = require('../utils/errorCodes');

class UserController {
  // Get user profile
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user._id)
        .select('-password -refreshToken');
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return ApiResponse.success(res, { user });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const updates = req.body;
      const user = await User.findById(req.user._id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Allowed updates
      const allowedUpdates = ['username', 'profile'];
      const updateKeys = Object.keys(updates);
      
      const isValidOperation = updateKeys.every(key => allowedUpdates.includes(key));
      if (!isValidOperation) {
        throw new ValidationError('Invalid updates');
      }

      updateKeys.forEach(key => {
        user[key] = updates[key];
      });

      await user.save();

      logger.info(`User profile updated: ${user.email}`);

      return ApiResponse.success(res, {
        user,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      const user = await User.findById(req.user._id).select('+password');
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new ValidationError('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for: ${user.email}`);

      return ApiResponse.success(res, {
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get saved suppliers
  async getSavedSuppliers(req, res, next) {
    try {
      const user = await User.findById(req.user._id)
        .populate({
          path: 'preferences.savedSuppliers',
          select: 'username email profile.companyName profile.rating profile.phone profile.address',
        });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return ApiResponse.success(res, {
        savedSuppliers: user.preferences.savedSuppliers,
      });
    } catch (error) {
      next(error);
    }
  }

  // Save supplier
  async saveSupplier(req, res, next) {
    try {
      const { supplierId } = req.params;
      
      const supplier = await User.findOne({
        _id: supplierId,
        role: 'supplier',
        isActive: true,
      });

      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }

      const user = await User.findById(req.user._id);
      
      const isSaved = user.preferences.savedSuppliers.includes(supplierId);
      
      if (isSaved) {
        user.preferences.savedSuppliers = user.preferences.savedSuppliers.filter(
          id => id.toString() !== supplierId
        );
        await user.save();
        return ApiResponse.success(res, {
          message: 'Supplier removed from saved list',
          isSaved: false,
        });
      } else {
        user.preferences.savedSuppliers.push(supplierId);
        await user.save();
        return ApiResponse.success(res, {
          message: 'Supplier saved successfully',
          isSaved: true,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // Get user inquiries
  async getUserInquiries(req, res, next) {
    try {
      const { status } = req.query;
      const inquiries = await Inquiry.getInquiriesForUser(req.user._id, status);

      return ApiResponse.success(res, {
        inquiries,
        count: inquiries.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user statistics
  async getUserStats(req, res, next) {
    try {
      const userId = req.user._id;

      const inquiries = await Inquiry.countDocuments({ userId });
      const savedSuppliers = (await User.findById(userId)).preferences.savedSuppliers.length;
      const reviews = await Review.countDocuments({ userId });

      return ApiResponse.success(res, {
        totalInquiries: inquiries,
        savedSuppliers,
        totalReviews: reviews,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete account
  async deleteAccount(req, res, next) {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isActive = false;
      await user.save();

      logger.info(`Account deactivated: ${user.email}`);

      return ApiResponse.success(res, {
        message: 'Account deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();