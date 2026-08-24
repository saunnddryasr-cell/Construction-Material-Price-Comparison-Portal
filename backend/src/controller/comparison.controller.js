const Price = require('../models/Price.model');
const Material = require('../models/Material.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');
const { ValidationError, NotFoundError } = require('../utils/errorCodes');
const cacheService = require('../services/cache.service');

class ComparisonController {
  // Compare prices for multiple materials
  async compareMultiple(req, res, next) {
    try {
      const { materialIds, city, state } = req.query;
      
      if (!materialIds) {
        throw new ValidationError('Material IDs are required');
      }

      const ids = materialIds.split(',');
      if (ids.length > 10) {
        throw new ValidationError('Maximum 10 materials can be compared at once');
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          const material = await Material.findById(id);
          if (!material) return null;

          const prices = await Price.findBestPrices(id, { city, state }, 10);
          const stats = await Price.getPriceStatistics(id, { city, state });

          return {
            material,
            prices,
            stats,
            totalSuppliers: prices.length,
          };
        })
      );

      // Filter out null results
      const validResults = results.filter(r => r !== null);

      return ApiResponse.success(res, {
        comparisons: validResults,
        location: { city, state },
        totalCompared: validResults.length,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Compare suppliers for multiple materials
  async compareSuppliers(req, res, next) {
    try {
      const { materialId, city, state, supplierIds } = req.query;

      if (!materialId || !supplierIds) {
        throw new ValidationError('Material ID and Supplier IDs are required');
      }

      const supplierIdArray = supplierIds.split(',');
      if (supplierIdArray.length > 10) {
        throw new ValidationError('Maximum 10 suppliers can be compared at once');
      }

      const material = await Material.findById(materialId);
      if (!material) {
        throw new NotFoundError('Material not found');
      }

      const prices = await Price.find({
        materialId,
        supplierId: { $in: supplierIdArray },
        'location.city': city,
        'location.state': state,
        isActive: true,
        stockQuantity: { $gt: 0 },
      })
      .populate('supplierId', 'profile.companyName profile.rating profile.verified')
      .sort({ price: 1 });

      return ApiResponse.success(res, {
        material,
        location: { city, state },
        suppliers: prices,
        totalSuppliers: prices.length,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get price trends
  async getPriceTrends(req, res, next) {
    try {
      const { materialId, city, state, days = 30 } = req.query;

      if (!materialId) {
        throw new ValidationError('Material ID is required');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const prices = await Price.find({
        materialId,
        'location.city': city,
        'location.state': state,
        isActive: true,
        lastUpdated: { $gte: startDate },
      })
      .populate('supplierId', 'profile.companyName')
      .sort({ lastUpdated: 1 });

      // Group by date
      const trendData = prices.reduce((acc, price) => {
        const date = price.lastUpdated.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            prices: [],
            avgPrice: 0,
            minPrice: 0,
            maxPrice: 0,
          };
        }
        acc[date].prices.push(price.price);
        return acc;
      }, {});

      // Calculate statistics for each date
      const trends = Object.values(trendData).map(day => {
        const sorted = day.prices.sort((a, b) => a - b);
        const sum = day.prices.reduce((a, b) => a + b, 0);
        return {
          date: day.date,
          avgPrice: parseFloat((sum / day.prices.length).toFixed(2)),
          minPrice: sorted[0],
          maxPrice: sorted[sorted.length - 1],
          count: day.prices.length,
        };
      });

      return ApiResponse.success(res, {
        trends,
        period: {
          start: startDate,
          end: new Date(),
        },
        material: await Material.findById(materialId),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get best price recommendations
  async getRecommendations(req, res, next) {
    try {
      const { city, state, limit = 5 } = req.query;

      if (!city || !state) {
        throw new ValidationError('Location (city and state) is required');
      }

      // Get materials with the most price competition
      const pipeline = [
        {
          $match: {
            'location.city': city,
            'location.state': state,
            isActive: true,
            stockQuantity: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: '$materialId',
            supplierCount: { $sum: 1 },
            minPrice: { $min: '$price' },
            avgPrice: { $avg: '$price' },
          },
        },
        { $sort: { supplierCount: -1 } },
        { $limit: parseInt(limit) },
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
            _id: 1,
            supplierCount: 1,
            minPrice: 1,
            avgPrice: 1,
            'material.name': 1,
            'material.category': 1,
            'material.unit': 1,
          },
        },
      ];

      const recommendations = await Price.aggregate(pipeline);

      return ApiResponse.success(res, {
        recommendations,
        location: { city, state },
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ComparisonController();