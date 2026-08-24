const User = require('../models/User.model');
const Material = require('../models/Material.model');
const Price = require('../models/Price.model');
const Inquiry = require('../models/Inquiry.model');
const Review = require('../models/Review.model');
const AuditLog = require('../models/AuditLog.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');
const { ValidationError, NotFoundError } = require('../utils/errorCodes');
const { ROLES } = require('../utils/constants');
const emailService = require('../services/email.service');

class AdminController {
  // Get dashboard stats
  async getDashboardStats(req, res, next) {
    try {
      const [
        totalUsers,
        totalSuppliers,
        totalContractors,
        totalMaterials,
        totalPrices,
        totalInquiries,
        pendingInquiries,
        totalReviews,
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        User.countDocuments({ role: ROLES.SUPPLIER, isActive: true }),
        User.countDocuments({ role: ROLES.CONTRACTOR, isActive: true }),
        Material.countDocuments({ isActive: true }),
        Price.countDocuments({ isActive: true }),
        Inquiry.countDocuments(),
        Inquiry.countDocuments({ status: 'pending' }),
        Review.countDocuments(),
      ]);

      // Recent activity
      const recentUsers = await User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email role createdAt');

      const recentInquiries = await Inquiry.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('materialId', 'name')
        .populate('userId', 'username');

      return ApiResponse.success(res, {
        stats: {
          totalUsers,
          totalSuppliers,
          totalContractors,
          totalMaterials,
          totalPrices,
          totalInquiries,
          pendingInquiries,
          totalReviews,
        },
        recentActivity: {
          users: recentUsers,
          inquiries: recentInquiries,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all users (admin only)
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, role, search, verified } = req.query;

      const query = {};
      if (role) {
        query.role = role;
      }
      if (verified === 'true') {
        query['profile.verified'] = true;
      } else if (verified === 'false') {
        query['profile.verified'] = false;
      }
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'profile.companyName': { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const users = await User.find(query)
        .select('-password -refreshToken')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      return ApiResponse.paginated(res, users, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify supplier
  async verifySupplier(req, res, next) {
    try {
      const { id } = req.params;
      const { verified } = req.body;

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.role !== ROLES.SUPPLIER) {
        throw new ValidationError('User is not a supplier');
      }

      user.profile.verified = verified;
      await user.save();

      // Log audit
      await AuditLog.create({
        userId: req.user._id,
        action: 'verify',
        resource: 'supplier',
        resourceId: id,
        changes: {
          before: { verified: !verified },
          after: { verified },
        },
      });

      // Send email notification
      try {
        if (verified) {
          await emailService.sendEmail(user.email, 'Supplier Account Verified', `
            <h1>Your Supplier Account Has Been Verified</h1>
            <p>Congratulations! Your supplier account has been verified.</p>
            <p>You can now:</p>
            <ul>
              <li>Update prices for all materials</li>
              <li>Receive inquiries from contractors</li>
              <li>Build your reputation on the platform</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a>
          `);
        }
      } catch (emailError) {
        logger.error('Email notification failed:', emailError);
      }

      logger.info(`Supplier ${id} verification set to ${verified} by admin ${req.user._id}`);

      return ApiResponse.success(res, {
        user,
        message: `Supplier ${verified ? 'verified' : 'unverified'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete user (admin)
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      if (id === req.user._id.toString()) {
        throw new ValidationError('Cannot delete yourself');
      }

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isActive = false;
      await user.save();

      // Log audit
      await AuditLog.create({
        userId: req.user._id,
        action: 'delete',
        resource: 'user',
        resourceId: id,
        changes: {
          before: { isActive: true },
          after: { isActive: false },
        },
      });

      logger.info(`User ${id} deactivated by admin ${req.user._id}`);

      return ApiResponse.success(res, {
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get audit logs
  async getAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 20, action, resource } = req.query;

      const query = {};
      if (action) {
        query.action = action;
      }
      if (resource) {
        query.resource = resource;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const logs = await AuditLog.find(query)
        .populate('userId', 'username email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ timestamp: -1 });

      const total = await AuditLog.countDocuments(query);

      return ApiResponse.paginated(res, logs, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get system health
  async getSystemHealth(req, res, next) {
    try {
      const mongoose = require('mongoose');
      const memoryUsage = process.memoryUsage();
      
      const health = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          host: mongoose.connection.host,
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        },
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          cpus: require('os').cpus().length,
        },
      };

      return ApiResponse.success(res, health);
    } catch (error) {
      next(error);
    }
  }

  // Generate report
  async generateReport(req, res, next) {
    try {
      const { type, startDate, endDate } = req.query;

      if (!type || !startDate || !endDate) {
        throw new ValidationError('Type, startDate, and endDate are required');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      let report = {};

      switch (type) {
        case 'users':
          report = await this.generateUserReport(start, end);
          break;
        case 'prices':
          report = await this.generatePriceReport(start, end);
          break;
        case 'inquiries':
          report = await this.generateInquiryReport(start, end);
          break;
        default:
          throw new ValidationError('Invalid report type');
      }

      return ApiResponse.success(res, {
        report,
        period: { startDate, endDate },
        generatedAt: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  async generateUserReport(start, end) {
    const totalUsers = await User.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    const newSuppliers = await User.countDocuments({
      role: ROLES.SUPPLIER,
      createdAt: { $gte: start, $lte: end },
    });

    const newContractors = await User.countDocuments({
      role: ROLES.CONTRACTOR,
      createdAt: { $gte: start, $lte: end },
    });

    const verifiedSuppliers = await User.countDocuments({
      role: ROLES.SUPPLIER,
      'profile.verified': true,
      createdAt: { $gte: start, $lte: end },
    });

    return {
      type: 'users',
      totalUsers,
      newSuppliers,
      newContractors,
      verifiedSuppliers,
      growthRate: totalUsers > 0 ? ((newSuppliers + newContractors) / totalUsers * 100).toFixed(2) + '%' : '0%',
    };
  }

  async generatePriceReport(start, end) {
    const totalPrices = await Price.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    const updatedPrices = await Price.countDocuments({
      lastUpdated: { $gte: start, $lte: end },
    });

    const avgPrice = await Price.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avg: { $avg: '$price' } } },
    ]);

    return {
      type: 'prices',
      totalPrices,
      updatedPrices,
      averagePrice: avgPrice.length > 0 ? avgPrice[0].avg : 0,
      updateFrequency: updatedPrices > 0 ? (updatedPrices / 30).toFixed(2) + '/day' : '0/day',
    };
  }

  async generateInquiryReport(start, end) {
    const totalInquiries = await Inquiry.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    const resolved = await Inquiry.countDocuments({
      status: { $in: ['accepted', 'rejected', 'closed'] },
      updatedAt: { $gte: start, $lte: end },
    });

    const avgResponseTime = await Inquiry.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, avgTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } },
    ]);

    return {
      type: 'inquiries',
      totalInquiries,
      resolved,
      resolutionRate: totalInquiries > 0 ? (resolved / totalInquiries * 100).toFixed(2) + '%' : '0%',
      avgResponseTime: avgResponseTime.length > 0 ? avgResponseTime[0].avgTime / (1000 * 60 * 60) + ' hours' : 'N/A',
    };
  }
}

module.exports = new AdminController();