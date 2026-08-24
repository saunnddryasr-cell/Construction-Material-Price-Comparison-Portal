const cron = require('node-cron');
const mongoose = require('mongoose');
const { logger } = require('../config/logger');
const User = require('../src/models/User.model');
const Price = require('../src/models/Price.model');
const Material = require('../src/models/Material.model');
const Inquiry = require('../src/models/Inquiry.model');
const Review = require('../src/models/Review.model');
const AuditLog = require('../src/models/AuditLog.model');

// Analytics collection schema (if you want to store analytics data)
const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  metrics: {
    totalUsers: Number,
    totalSuppliers: Number,
    totalContractors: Number,
    activeUsers: Number,
    totalMaterials: Number,
    totalPrices: Number,
    totalInquiries: Number,
    totalReviews: Number,
    avgRating: Number,
    priceUpdates: Number,
    newUsers: Number,
    newSuppliers: Number,
    newMaterials: Number,
    newPrices: Number,
    newInquiries: Number,
    newReviews: Number,
    inquiryResponseRate: Number,
    avgResponseTime: Number, // in hours
    topCategories: [{
      category: String,
      count: Number,
      avgPrice: Number,
    }],
    topSuppliers: [{
      supplierId: mongoose.Schema.Types.ObjectId,
      name: String,
      priceCount: Number,
      avgRating: Number,
    }],
    priceStatistics: {
      avgPrice: Number,
      minPrice: Number,
      maxPrice: Number,
      priceRange: Number,
    },
    locationStats: [{
      city: String,
      state: String,
      supplierCount: Number,
      avgPrice: Number,
    }],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create model if it doesn't exist
let Analytics;
try {
  Analytics = mongoose.model('Analytics');
} catch {
  Analytics = mongoose.model('Analytics', analyticsSchema);
}

class AnalyticsJob {
  constructor() {
    this.isRunning = false;
  }

  // Run daily at midnight
  start() {
    // Daily analytics - runs at 00:00
    cron.schedule('0 0 * * *', async () => {
      await this.generateDailyAnalytics();
    });

    // Weekly analytics - runs on Monday at 01:00
    cron.schedule('0 1 * * 1', async () => {
      await this.generateWeeklyAnalytics();
    });

    // Monthly analytics - runs on 1st of month at 02:00
    cron.schedule('0 2 1 * *', async () => {
      await this.generateMonthlyAnalytics();
    });

    logger.info('Analytics jobs scheduled');
  }

  // Generate daily analytics
  async generateDailyAnalytics() {
    if (this.isRunning) {
      logger.warn('Analytics job already running');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting daily analytics generation...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get all metrics in parallel
      const [
        userStats,
        materialStats,
        priceStats,
        inquiryStats,
        reviewStats,
        categoryStats,
        supplierStats,
        locationStats,
        newStats,
      ] = await Promise.all([
        this.getUserStats(),
        this.getMaterialStats(),
        this.getPriceStats(),
        this.getInquiryStats(yesterday, today),
        this.getReviewStats(),
        this.getCategoryStats(),
        this.getTopSuppliers(),
        this.getLocationStats(),
        this.getNewStats(yesterday, today),
      ]);

      const analyticsData = {
        type: 'daily',
        date: today,
        metrics: {
          ...userStats,
          ...materialStats,
          ...priceStats,
          ...inquiryStats,
          ...reviewStats,
          ...newStats,
          topCategories: categoryStats,
          topSuppliers: supplierStats,
          locationStats: locationStats,
        },
      };

      // Save analytics
      await Analytics.create(analyticsData);

      const duration = Date.now() - startTime;
      logger.info(`Daily analytics generated in ${duration}ms`);

      // Clean up old analytics (keep last 90 days)
      await this.cleanupOldAnalytics(90);

    } catch (error) {
      logger.error('Daily analytics generation failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Get user statistics
  async getUserStats() {
    const [totalUsers, totalSuppliers, totalContractors, activeUsers] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'supplier', isActive: true }),
      User.countDocuments({ role: 'contractor', isActive: true }),
      User.countDocuments({ 
        isActive: true,
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }),
    ]);

    // Calculate supplier verification rate
    const verifiedSuppliers = await User.countDocuments({
      role: 'supplier',
      'profile.verified': true,
      isActive: true,
    });

    return {
      totalUsers,
      totalSuppliers,
      totalContractors,
      activeUsers,
      verifiedSuppliers,
      supplierVerificationRate: totalSuppliers > 0 
        ? parseFloat((verifiedSuppliers / totalSuppliers * 100).toFixed(2))
        : 0,
    };
  }

  // Get material statistics
  async getMaterialStats() {
    const [totalMaterials, categories] = await Promise.all([
      Material.countDocuments({ isActive: true }),
      Material.distinct('category', { isActive: true }),
    ]);

    return {
      totalMaterials,
      totalCategories: categories.length,
    };
  }

  // Get price statistics
  async getPriceStats() {
    const [totalPrices, priceStats] = await Promise.all([
      Price.countDocuments({ isActive: true }),
      Price.aggregate([
        { $match: { isActive: true, stockQuantity: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            priceRange: { $subtract: ['$maxPrice', '$minPrice'] },
          },
        },
      ]),
    ]);

    return {
      totalPrices,
      priceStatistics: priceStats.length > 0 ? {
        avgPrice: parseFloat(priceStats[0].avgPrice.toFixed(2)),
        minPrice: parseFloat(priceStats[0].minPrice.toFixed(2)),
        maxPrice: parseFloat(priceStats[0].maxPrice.toFixed(2)),
        priceRange: parseFloat(priceStats[0].priceRange.toFixed(2)),
      } : {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        priceRange: 0,
      },
    };
  }

  // Get inquiry statistics
  async getInquiryStats(startDate, endDate) {
    const [totalInquiries, statusCounts, responseTime] = await Promise.all([
      Inquiry.countDocuments(),
      Inquiry.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Inquiry.aggregate([
        {
          $match: {
            status: { $in: ['responded', 'accepted', 'rejected', 'closed'] },
            responses: { $exists: true, $not: { $size: 0 } },
          },
        },
        {
          $project: {
            responseTime: {
              $subtract: [
                { $arrayElemAt: ['$responses.timestamp', 0] },
                '$createdAt',
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$responseTime' },
          },
        },
      ]),
    ]);

    const statusMap = {};
    statusCounts.forEach(item => {
      statusMap[item._id] = item.count;
    });

    const totalResponded = (statusMap.responded || 0) + (statusMap.accepted || 0) + 
                          (statusMap.rejected || 0) + (statusMap.closed || 0);

    return {
      totalInquiries,
      inquiryStatus: {
        pending: statusMap.pending || 0,
        responded: statusMap.responded || 0,
        accepted: statusMap.accepted || 0,
        rejected: statusMap.rejected || 0,
        closed: statusMap.closed || 0,
      },
      inquiryResponseRate: totalInquiries > 0 
        ? parseFloat((totalResponded / totalInquiries * 100).toFixed(2))
        : 0,
      avgResponseTime: responseTime.length > 0 
        ? parseFloat((responseTime[0].avgTime / (1000 * 60 * 60)).toFixed(2)) // Convert to hours
        : 0,
    };
  }

  // Get review statistics
  async getReviewStats() {
    const [totalReviews, avgRating] = await Promise.all([
      Review.countDocuments(),
      Review.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const distribution = {};
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    return {
      totalReviews,
      avgRating: avgRating.length > 0 
        ? parseFloat(avgRating[0].avgRating.toFixed(2))
        : 0,
      ratingDistribution: {
        1: distribution[1] || 0,
        2: distribution[2] || 0,
        3: distribution[3] || 0,
        4: distribution[4] || 0,
        5: distribution[5] || 0,
      },
    };
  }

  // Get category statistics
  async getCategoryStats() {
    const categories = await Price.aggregate([
      { $match: { isActive: true, stockQuantity: { $gt: 0 } } },
      {
        $lookup: {
          from: 'materials',
          localField: 'materialId',
          foreignField: '_id',
          as: 'material',
        },
      },
      { $unwind: '$material' },
      {
        $group: {
          _id: '$material.category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return categories;
  }

  // Get top suppliers
  async getTopSuppliers() {
    const suppliers = await Price.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$supplierId',
          priceCount: { $sum: 1 },
        },
      },
      { $sort: { priceCount: -1 } },
      { $limit: 10 },
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
          name: '$supplier.profile.companyName',
          priceCount: 1,
          _id: 0,
        },
      },
    ]);

    // Get ratings for suppliers
    const supplierWithRatings = await Promise.all(
      suppliers.map(async (supplier) => {
        const reviewStats = await Review.getAverageRating(supplier.supplierId);
        return {
          ...supplier,
          avgRating: parseFloat(reviewStats.avgRating.toFixed(2)),
        };
      })
    );

    return supplierWithRatings;
  }

  // Get location statistics
  async getLocationStats() {
    const locations = await Price.aggregate([
      { $match: { isActive: true, stockQuantity: { $gt: 0 } } },
      {
        $group: {
          _id: {
            city: '$location.city',
            state: '$location.state',
          },
          supplierCount: { $addToSet: '$supplierId' },
          avgPrice: { $avg: '$price' },
        },
      },
      {
        $project: {
          city: '$_id.city',
          state: '$_id.state',
          supplierCount: { $size: '$supplierCount' },
          avgPrice: { $round: ['$avgPrice', 2] },
          _id: 0,
        },
      },
      { $sort: { supplierCount: -1 } },
      { $limit: 20 },
    ]);

    return locations;
  }

  // Get new records since yesterday
  async getNewStats(startDate, endDate) {
    const [
      newUsers,
      newSuppliers,
      newMaterials,
      newPrices,
      newInquiries,
      newReviews,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      User.countDocuments({ 
        role: 'supplier',
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      Material.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      Price.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      Inquiry.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      Review.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
    ]);

    // Price updates (not just new prices)
    const priceUpdates = await Price.countDocuments({
      lastUpdated: { $gte: startDate, $lt: endDate },
    });

    return {
      newUsers,
      newSuppliers,
      newMaterials,
      newPrices,
      newInquiries,
      newReviews,
      priceUpdates,
    };
  }

  // Generate weekly analytics
  async generateWeeklyAnalytics() {
    try {
      logger.info('Starting weekly analytics generation...');

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      startOfWeek.setHours(0, 0, 0, 0);

      // Get weekly stats from daily analytics
      const weeklyStats = await Analytics.aggregate([
        {
          $match: {
            type: 'daily',
            date: { $gte: startOfWeek, $lt: today },
          },
        },
        {
          $group: {
            _id: null,
            totalUsers: { $last: '$metrics.totalUsers' },
            totalSuppliers: { $last: '$metrics.totalSuppliers' },
            totalContractors: { $last: '$metrics.totalContractors' },
            activeUsers: { $last: '$metrics.activeUsers' },
            totalMaterials: { $last: '$metrics.totalMaterials' },
            totalPrices: { $last: '$metrics.totalPrices' },
            totalInquiries: { $last: '$metrics.totalInquiries' },
            totalReviews: { $last: '$metrics.totalReviews' },
            avgRating: { $last: '$metrics.avgRating' },
            newUsers: { $sum: '$metrics.newUsers' },
            newSuppliers: { $sum: '$metrics.newSuppliers' },
            newMaterials: { $sum: '$metrics.newMaterials' },
            newPrices: { $sum: '$metrics.newPrices' },
            newInquiries: { $sum: '$metrics.newInquiries' },
            newReviews: { $sum: '$metrics.newReviews' },
            priceUpdates: { $sum: '$metrics.priceUpdates' },
          },
        },
      ]);

      const weeklyData = {
        type: 'weekly',
        date: today,
        metrics: weeklyStats.length > 0 ? weeklyStats[0] : {},
      };

      await Analytics.create(weeklyData);

      logger.info('Weekly analytics generated successfully');

    } catch (error) {
      logger.error('Weekly analytics generation failed:', error);
    }
  }

  // Generate monthly analytics
  async generateMonthlyAnalytics() {
    try {
      logger.info('Starting monthly analytics generation...');

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      // Get monthly stats from daily analytics
      const monthlyStats = await Analytics.aggregate([
        {
          $match: {
            type: 'daily',
            date: { $gte: startOfMonth, $lt: today },
          },
        },
        {
          $group: {
            _id: null,
            totalUsers: { $last: '$metrics.totalUsers' },
            totalSuppliers: { $last: '$metrics.totalSuppliers' },
            totalContractors: { $last: '$metrics.totalContractors' },
            activeUsers: { $last: '$metrics.activeUsers' },
            totalMaterials: { $last: '$metrics.totalMaterials' },
            totalPrices: { $last: '$metrics.totalPrices' },
            totalInquiries: { $last: '$metrics.totalInquiries' },
            totalReviews: { $last: '$metrics.totalReviews' },
            avgRating: { $last: '$metrics.avgRating' },
            newUsers: { $sum: '$metrics.newUsers' },
            newSuppliers: { $sum: '$metrics.newSuppliers' },
            newMaterials: { $sum: '$metrics.newMaterials' },
            newPrices: { $sum: '$metrics.newPrices' },
            newInquiries: { $sum: '$metrics.newInquiries' },
            newReviews: { $sum: '$metrics.newReviews' },
            priceUpdates: { $sum: '$metrics.priceUpdates' },
            inquiryResponseRate: { $avg: '$metrics.inquiryResponseRate' },
            avgResponseTime: { $avg: '$metrics.avgResponseTime' },
          },
        },
      ]);

      // Get monthly growth rates
      const previousMonthStats = await Analytics.findOne({
        type: 'monthly',
        date: { $lt: startOfMonth },
      }).sort({ date: -1 });

      let growthRates = {};
      if (previousMonthStats) {
        const prev = previousMonthStats.metrics;
        const current = monthlyStats.length > 0 ? monthlyStats[0] : {};
        
        growthRates = {
          usersGrowth: prev.totalUsers > 0 
            ? parseFloat(((current.totalUsers - prev.totalUsers) / prev.totalUsers * 100).toFixed(2))
            : 0,
          suppliersGrowth: prev.totalSuppliers > 0
            ? parseFloat(((current.totalSuppliers - prev.totalSuppliers) / prev.totalSuppliers * 100).toFixed(2))
            : 0,
          inquiriesGrowth: prev.totalInquiries > 0
            ? parseFloat(((current.totalInquiries - prev.totalInquiries) / prev.totalInquiries * 100).toFixed(2))
            : 0,
        };
      }

      const monthlyData = {
        type: 'monthly',
        date: today,
        metrics: {
          ...(monthlyStats.length > 0 ? monthlyStats[0] : {}),
          growthRates,
        },
      };

      await Analytics.create(monthlyData);

      logger.info('Monthly analytics generated successfully');

    } catch (error) {
      logger.error('Monthly analytics generation failed:', error);
    }
  }

  // Clean up old analytics data
  async cleanupOldAnalytics(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await Analytics.deleteMany({
        type: 'daily',
        date: { $lt: cutoffDate },
      });

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old analytics records`);
      }
    } catch (error) {
      logger.error('Analytics cleanup failed:', error);
    }
  }

  // Get analytics for dashboard
  async getAnalyticsForDashboard(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await Analytics.find({
        type: 'daily',
        date: { $gte: startDate },
      }).sort({ date: 1 });

      // Format for chart display
      const chartData = analytics.map(item => ({
        date: item.date.toISOString().split('T')[0],
        newUsers: item.metrics.newUsers,
        newSuppliers: item.metrics.newSuppliers,
        newInquiries: item.metrics.newInquiries,
        priceUpdates: item.metrics.priceUpdates,
        totalUsers: item.metrics.totalUsers,
        totalPrices: item.metrics.totalPrices,
      }));

      return chartData;
    } catch (error) {
      logger.error('Failed to get analytics for dashboard:', error);
      return [];
    }
  }

  // Get latest analytics summary
  async getLatestSummary() {
    try {
      const latest = await Analytics.findOne({ type: 'daily' })
        .sort({ date: -1 });

      if (!latest) {
        return null;
      }

      return {
        date: latest.date,
        metrics: latest.metrics,
      };
    } catch (error) {
      logger.error('Failed to get latest analytics summary:', error);
      return null;
    }
  }
}

module.exports = new AnalyticsJob();