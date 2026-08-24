const Analytics = require('../src/models/Analytics.model'); // You need to create this model
const User = require('../src/models/User.model');
const Price = require('../src/models/Price.model');
const Inquiry = require('../src/models/Inquiry.model');
const Material = require('../src/models/Material.model');
const Review = require('../src/models/Review.model');
const { logger } = require('../src/config/logger');

class AnalyticsService {
  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(userId, role) {
    let analytics = {};

    if (role === 'admin') {
      analytics = await this.getAdminAnalytics();
    } else if (role === 'supplier') {
      analytics = await this.getSupplierAnalytics(userId);
    } else {
      analytics = await this.getUserAnalytics(userId);
    }

    return analytics;
  }

  /**
   * Get admin analytics
   */
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
      recentActivity,
      priceStats,
      inquiryStats,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'supplier', isActive: true }),
      Material.countDocuments({ isActive: true }),
      Price.countDocuments({ isActive: true }),
      Inquiry.countDocuments(),
      Review.countDocuments(),
      this.getRecentActivity(),
      this.getPriceStatistics(),
      this.getInquiryStatistics(startDate),
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
      priceStats,
      inquiryStats,
      recentActivity,
      timestamp: new Date(),
    };
  }

  /**
   * Get supplier analytics
   */
  async getSupplierAnalytics(supplierId) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const [
      totalPrices,
      totalInquiries,
      inquiryStats,
      performance,
    ] = await Promise.all([
      Price.countDocuments({ supplierId, isActive: true }),
      Inquiry.countDocuments({ supplierId }),
      this.getSupplierInquiryStats(supplierId, startDate),
      this.getSupplierPerformance(supplierId, startDate),
    ]);

    return {
      overview: {
        totalPrices,
        totalInquiries,
        ...inquiryStats,
      },
      performance,
      timestamp: new Date(),
    };
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId) {
    const [
      totalInquiries,
      savedSuppliers,
      totalReviews,
      inquiryStats,
    ] = await Promise.all([
      Inquiry.countDocuments({ userId }),
      User.findById(userId).select('preferences.savedSuppliers'),
      Review.countDocuments({ userId }),
      this.getUserInquiryStats(userId),
    ]);

    return {
      overview: {
        totalInquiries,
        savedSuppliers: savedSuppliers?.preferences?.savedSuppliers?.length || 0,
        totalReviews,
        ...inquiryStats,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 10) {
    const [recentUsers, recentInquiries, recentPrices] = await Promise.all([
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email role createdAt'),
      Inquiry.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('materialId', 'name')
        .populate('userId', 'username'),
      Price.find({ isActive: true })
        .sort({ lastUpdated: -1 })
        .limit(5)
        .populate('materialId', 'name')
        .populate('supplierId', 'profile.companyName'),
    ]);

    return {
      users: recentUsers,
      inquiries: recentInquiries,
      prices: recentPrices,
    };
  }

  /**
   * Get price statistics
   */
  async getPriceStatistics() {
    const stats = await Price.aggregate([
      { $match: { isActive: true, stockQuantity: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          totalPrices: { $sum: 1 },
        },
      },
    ]);

    if (stats.length === 0) {
      return { avgPrice: 0, minPrice: 0, maxPrice: 0, totalPrices: 0 };
    }

    return stats[0];
  }

  /**
   * Get inquiry statistics
   */
  async getInquiryStatistics(startDate) {
    const [total, statusStats, priorityStats] = await Promise.all([
      Inquiry.countDocuments({ createdAt: { $gte: startDate } }),
      Inquiry.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Inquiry.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap = {};
    statusStats.forEach(item => {
      statusMap[item._id] = item.count;
    });

    const priorityMap = {};
    priorityStats.forEach(item => {
      priorityMap[item._id] = item.count;
    });

    return {
      total,
      status: {
        pending: statusMap.pending || 0,
        responded: statusMap.responded || 0,
        accepted: statusMap.accepted || 0,
        rejected: statusMap.rejected || 0,
        closed: statusMap.closed || 0,
      },
      priority: {
        low: priorityMap.low || 0,
        medium: priorityMap.medium || 0,
        high: priorityMap.high || 0,
        urgent: priorityMap.urgent || 0,
      },
    };
  }

  /**
   * Get supplier inquiry stats
   */
  async getSupplierInquiryStats(supplierId, startDate) {
    const [total, pending, responded, accepted, rejected, closed] = await Promise.all([
      Inquiry.countDocuments({ supplierId, createdAt: { $gte: startDate } }),
      Inquiry.countDocuments({ supplierId, status: 'pending', createdAt: { $gte: startDate } }),
      Inquiry.countDocuments({ supplierId, status: 'responded', createdAt: { $gte: startDate } }),
      Inquiry.countDocuments({ supplierId, status: 'accepted', createdAt: { $gte: startDate } }),
      Inquiry.countDocuments({ supplierId, status: 'rejected', createdAt: { $gte: startDate } }),
      Inquiry.countDocuments({ supplierId, status: 'closed', createdAt: { $gte: startDate } }),
    ]);

    return {
      total,
      pending,
      responded,
      accepted,
      rejected,
      closed,
      responseRate: total > 0 
        ? ((responded + accepted + rejected + closed) / total * 100).toFixed(2)
        : 0,
    };
  }

  /**
   * Get supplier performance
   */
  async getSupplierPerformance(supplierId, startDate) {
    const prices = await Price.find({
      supplierId,
      lastUpdated: { $gte: startDate },
    });

    const inquiries = await Inquiry.find({
      supplierId,
      createdAt: { $gte: startDate },
    });

    // Average response time
    const respondedInquiries = inquiries.filter(
      i => i.status !== 'pending' && i.responses && i.responses.length > 0
    );

    let avgResponseTime = 0;
    if (respondedInquiries.length > 0) {
      const totalTime = respondedInquiries.reduce((sum, i) => {
        const responseTime = i.responses[0].timestamp - i.createdAt;
        return sum + responseTime;
      }, 0);
      avgResponseTime = totalTime / respondedInquiries.length / (1000 * 60 * 60); // Hours
    }

    return {
      priceUpdates: prices.length,
      totalInquiries: inquiries.length,
      respondedInquiries: respondedInquiries.length,
      avgResponseTime: avgResponseTime.toFixed(2),
      conversionRate: inquiries.length > 0
        ? (inquiries.filter(i => i.status === 'accepted').length / inquiries.length * 100).toFixed(2)
        : 0,
    };
  }

  /**
   * Get user inquiry stats
   */
  async getUserInquiryStats(userId) {
    const [total, pending, responded, accepted, rejected, closed] = await Promise.all([
      Inquiry.countDocuments({ userId }),
      Inquiry.countDocuments({ userId, status: 'pending' }),
      Inquiry.countDocuments({ userId, status: 'responded' }),
      Inquiry.countDocuments({ userId, status: 'accepted' }),
      Inquiry.countDocuments({ userId, status: 'rejected' }),
      Inquiry.countDocuments({ userId, status: 'closed' }),
    ]);

    return {
      totalInquiries: total,
      inquiryStatus: {
        pending,
        responded,
        accepted,
        rejected,
        closed,
      },
    };
  }

  /**
   * Get price trends
   */
  async getPriceTrends(materialId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

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
      trends[date].suppliers.push(price.supplierId.profile.companyName);
    });

    // Calculate averages
    const result = Object.values(trends).map(day => ({
      date: day.date,
      avgPrice: day.prices.reduce((a, b) => a + b, 0) / day.prices.length,
      minPrice: Math.min(...day.prices),
      maxPrice: Math.max(...day.prices),
      supplierCount: new Set(day.suppliers).size,
      priceCount: day.prices.length,
    }));

    return result;
  }

  /**
   * Get top performing suppliers
   */
  async getTopSuppliers(limit = 10) {
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
      { $limit: limit },
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
          avgPrice: 1,
          rating: '$supplier.profile.rating',
          verified: '$supplier.profile.verified',
        },
      },
    ]);

    return topSuppliers;
  }

  /**
   * Get material demand analytics
   */
  async getMaterialDemand() {
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

    return demand;
  }

  /**
   * Export analytics report
   */
  async exportReport(type, format = 'json') {
    let data = {};

    switch (type) {
      case 'prices':
        data = await this.getPriceStatistics();
        break;
      case 'inquiries':
        data = await this.getInquiryStatistics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        break;
      case 'users':
        data = await this.getAdminAnalytics();
        break;
      default:
        data = {
          prices: await this.getPriceStatistics(),
          inquiries: await this.getInquiryStatistics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          users: await this.getAdminAnalytics(),
        };
    }

    // In production, format as CSV, PDF, etc.
    return {
      type,
      format,
      data,
      generatedAt: new Date(),
    };
  }
}

module.exports = new AnalyticsService();