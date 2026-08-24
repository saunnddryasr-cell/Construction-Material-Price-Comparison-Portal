const User = require('../models/User.model');
const Price = require('../models/Price.model');
const Review = require('../models/Review.model');
const Inquiry = require('../models/Inquiry.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');
const { NotFoundError } = require('../utils/errorCodes');
const { ROLES } = require('../utils/constants');

class SupplierController {
  // Get all suppliers
  async getSuppliers(req, res, next) {
    try {
      const { page = 1, limit = 20, search, city, state, verified, rating } = req.query;
      
      const query = {
        role: ROLES.SUPPLIER,
        isActive: true,
      };

      if (verified === 'true') {
        query['profile.verified'] = true;
      }
      if (city) {
        query['profile.address.city'] = { $regex: city, $options: 'i' };
      }
      if (state) {
        query['profile.address.state'] = { $regex: state, $options: 'i' };
      }
      if (rating) {
        query['profile.rating'] = { $gte: parseFloat(rating) };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let suppliers = await User.find(query)
        .select('username email profile phone')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ 'profile.rating': -1 });

      const total = await User.countDocuments(query);

      // Get supplier statistics
      const suppliersWithStats = await Promise.all(
        suppliers.map(async (supplier) => {
          const materialCount = await Price.distinct('materialId', {
            supplierId: supplier._id,
            isActive: true,
          });
          
          const reviewStats = await Review.getAverageRating(supplier._id);
          
          return {
            ...supplier.toObject(),
            materialCount: materialCount.length,
            reviewStats,
          };
        })
      );

      return ApiResponse.success(res, {
        suppliers: suppliersWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get supplier by ID
  async getSupplierById(req, res, next) {
    try {
      const { id } = req.params;
      
      const supplier = await User.findOne({
        _id: id,
        role: ROLES.SUPPLIER,
        isActive: true,
      }).select('username email profile phone');

      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }

      // Get materials and prices
      const prices = await Price.find({
        supplierId: supplier._id,
        isActive: true,
      })
      .populate('materialId', 'name category unit description specifications images')
      .sort({ 'materialId.category': 1 });

      // Get reviews
      const reviews = await Review.getRecentReviews(supplier._id, 10);
      const reviewStats = await Review.getAverageRating(supplier._id);

      return ApiResponse.success(res, {
        supplier,
        prices,
        reviews,
        reviewStats,
        totalMaterials: prices.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get supplier dashboard stats
  async getDashboardStats(req, res, next) {
    try {
      const supplierId = req.user._id;

      const materialCount = await Price.distinct('materialId', {
        supplierId,
        isActive: true,
      });

      const totalPrices = await Price.countDocuments({
        supplierId,
        isActive: true,
      });

      const inquiries = await Inquiry.getInquiriesForSupplier(supplierId);
      const pendingInquiries = inquiries.filter(i => i.status === 'pending');

      const recentInquiries = inquiries.slice(0, 5);

      const reviewStats = await Review.getAverageRating(supplierId);

      return ApiResponse.success(res, {
        materialCount: materialCount.length,
        totalPrices,
        inquiriesCount: inquiries.length,
        pendingInquiries: pendingInquiries.length,
        recentInquiries,
        reviewStats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get supplier analytics
  async getAnalytics(req, res, next) {
    try {
      const supplierId = req.user._id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Price history
      const priceHistory = await Price.find({
        supplierId,
        lastUpdated: { $gte: startDate },
      })
      .populate('materialId', 'name')
      .sort({ lastUpdated: 1 });

      // Inquiry trends
      const inquiryTrends = await Inquiry.aggregate([
        { $match: { supplierId: new mongoose.Types.ObjectId(supplierId) } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]);

      return ApiResponse.success(res, {
        priceHistory,
        inquiryTrends,
        period: {
          start: startDate,
          end: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SupplierController();