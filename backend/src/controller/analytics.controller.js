// backend/src/controller/analytics.controller.js
const Analytics = require('../models/Analytics.model');
const User = require('../models/User.model');
const Price = require('../models/Price.model');
const Inquiry = require('../models/Inquiry.model');
const Material = require('../models/Material.model');
const Review = require('../models/Review.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');

class AnalyticsController {
  // Get dashboard analytics
  async getDashboardAnalytics(req, res, next) {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;

      let analytics = {};

      if (userRole === 'admin') {
        analytics = await this.getAdminAnalytics();
      } else if (userRole === 'supplier') {
        analytics = await this.getSupplierAnalytics(userId);
      } else {
        analytics = await this.getUserAnalytics(userId);
      }

      return ApiResponse.success(res, {
        analytics,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get admin analytics
  async getAdminAnalytics() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const [
      totalUsers,
      totalSuppliers,
      totalMaterials,
      totalPrices,
      totalInquiries,
      totalReviews,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'supplier', isActive: true }),
      Material.countDocuments({ isActive: true }),
      Price.countDocuments({ isActive: true }),
      Inquiry.countDocuments(),
      Review.countDocuments(),
    ]);

    return {
      overview: {
        totalUsers,
        totalSuppliers,
        totalMaterials,
        totalPrices,
        totalInquiries,
        totalReviews,
      },
      period: {
        start: startDate,
        end: new Date(),
      },
      timestamp: new Date(),
    };
  }

  // Get supplier analytics
  async getSupplierAnalytics(supplierId) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const [totalPrices, totalInquiries, pendingInquiries, respondedInquiries] = await Promise.all([
      Price.countDocuments({ supplierId, isActive: true }),
      Inquiry.countDocuments({ supplierId }),
      Inquiry.countDocuments({ supplierId, status: 'pending' }),
      Inquiry.countDocuments({ supplierId, status: 'responded' }),
    ]);

    return {
      overview: {
        totalPrices,
        totalInquiries,
        pendingInquiries,
        respondedInquiries,
        responseRate: totalInquiries > 0 
          ? ((respondedInquiries / totalInquiries) * 100).toFixed(2)
          : 0,
      },
      period: {
        start: startDate,
        end: new Date(),
      },
      timestamp: new Date(),
    };
  }

  // Get user analytics
  async getUserAnalytics(userId) {
    const [totalInquiries, savedSuppliers] = await Promise.all([
      Inquiry.countDocuments({ userId }),
      User.findById(userId).select('preferences.savedSuppliers'),
    ]);

    return {
      overview: {
        totalInquiries,
        savedSuppliers: savedSuppliers?.preferences?.savedSuppliers?.length || 0,
      },
      timestamp: new Date(),
    };
  }

  // Get price trends
  async getPriceTrends(req, res, next) {
    try {
      const { materialId, days = 30 } = req.query;

      if (!materialId) {
        return ApiResponse.error(res, 'Material ID is required', 400);
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const prices = await Price.find({
        materialId,
        lastUpdated: { $gte: startDate },
        isActive: true,
      })
      .sort({ lastUpdated: 1 })
      .populate('supplierId', 'profile.companyName');

      // Group by date
      const trends = {};
      prices.forEach(price => {
        const date = price.lastUpdated.toISOString().split('T')[0];
        if (!trends[date]) {
          trends[date] = {
            date,
            prices: [],
            suppliers: [],
          };
        }
        trends[date].prices.push(price.price);
        trends[date].suppliers.push(price.supplierId?.profile?.companyName || 'Unknown');
      });

      const result = Object.values(trends).map(day => ({
        date: day.date,
        avgPrice: day.prices.reduce((a, b) => a + b, 0) / day.prices.length,
        minPrice: Math.min(...day.prices),
        maxPrice: Math.max(...day.prices),
        supplierCount: new Set(day.suppliers).size,
        priceCount: day.prices.length,
      }));

      return ApiResponse.success(res, {
        trends: result,
        period: {
          start: startDate,
          end: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get top performing suppliers
  async getTopSuppliers(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const topSuppliers = await Price.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$supplierId',
            priceCount: { $sum: 1 },
            avgPrice: { $avg: '$price' },
          },
        },
        { $sort: { priceCount: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        { $unwind: '$supplier' },
        {
          $project: {
            supplierId: '$_id',
            companyName: '$supplier.profile.companyName',
            priceCount: 1,
            avgPrice: { $round: ['$avgPrice', 2] },
            rating: '$supplier.profile.rating',
            verified: '$supplier.profile.verified',
          },
        },
      ]);

      return ApiResponse.success(res, {
        suppliers: topSuppliers,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get material demand analytics
  async getMaterialDemand(req, res, next) {
    try {
      const demand = await Inquiry.aggregate([
        {
          $group: {
            _id: '$materialId',
            inquiryCount: { $sum: 1 },
          },
        },
        { $sort: { inquiryCount: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'materials',
            localField: '_id',
            foreignField: '_id',
            as: 'material',
          },
        },
        { $unwind: '$material' },
        {
          $project: {
            materialId: '$_id',
            name: '$material.name',
            category: '$material.category',
            inquiryCount: 1,
          },
        },
      ]);

      return ApiResponse.success(res, {
        demand,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();