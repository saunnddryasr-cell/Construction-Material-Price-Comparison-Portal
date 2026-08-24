const Price = require('../models/Price.model');
const Material = require('../models/Material.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');
const { ValidationError } = require('../utils/errorCodes');

class PriceController {
  // Update or create price
  async updatePrice(req, res, next) {
    try {
      const { materialId, price, stockQuantity, location, unit } = req.body;
      const supplierId = req.user._id;

      // Validate material exists
      const material = await Material.findById(materialId);
      if (!material) {
        throw new ValidationError('Material not found');
      }

      // Find existing price
      let priceRecord = await Price.findOne({
        supplierId,
        materialId,
        'location.city': location.city,
        'location.state': location.state
      });

      if (priceRecord) {
        // Update existing
        priceRecord.price = price;
        priceRecord.stockQuantity = stockQuantity;
        priceRecord.unit = unit || material.unit;
        priceRecord.lastUpdated = new Date();
        priceRecord.addPriceHistory();
        await priceRecord.save();
      } else {
        // Create new
        priceRecord = new Price({
          supplierId,
          materialId,
          price,
          unit: unit || material.unit,
          location,
          stockQuantity
        });
        priceRecord.addPriceHistory();
        await priceRecord.save();
      }

      logger.info(`Price updated for material ${materialId} by supplier ${supplierId}`);
      
      return ApiResponse.success(res, {
        price: priceRecord,
        message: 'Price updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get price comparison
  async comparePrices(req, res, next) {
    try {
      const { materialId, city, state, sortBy = 'price' } = req.query;
      
      // Validate
      if (!materialId) {
        throw new ValidationError('Material ID is required');
      }
      if (!city || !state) {
        throw new ValidationError('Location (city and state) is required');
      }

      const prices = await Price.findBestPrices(materialId, { city, state });

      // Calculate statistics
      const stats = this.calculateStatistics(prices);
      
      // Sort results
      const sortedPrices = this.sortResults(prices, sortBy);

      return ApiResponse.success(res, {
        material: await Material.findById(materialId),
        location: { city, state },
        totalSuppliers: prices.length,
        stats,
        suppliers: sortedPrices,
        timestamp: new Date()
      });
    } catch (error) {
      next(error);
    }
  }

  // Get price history
  async getPriceHistory(req, res, next) {
    try {
      const { materialId, supplierId } = req.params;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const prices = await Price.findOne({
        materialId,
        supplierId
      }).select('priceHistory');

      if (!prices) {
        return ApiResponse.success(res, {
          history: [],
          message: 'No price history found'
        });
      }

      const history = prices.priceHistory
        .filter(entry => entry.timestamp >= startDate)
        .sort((a, b) => a.timestamp - b.timestamp);

      return ApiResponse.success(res, {
        history,
        count: history.length,
        dateRange: {
          start: startDate,
          end: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk update prices
  async bulkUpdatePrices(req, res, next) {
    try {
      const { prices } = req.body;
      const supplierId = req.user._id;

      if (!Array.isArray(prices) || prices.length === 0) {
        throw new ValidationError('Prices array is required');
      }

      const results = [];
      for (const priceData of prices) {
        try {
          const result = await this.updatePriceInternal({
            ...priceData,
            supplierId
          });
          results.push(result);
        } catch (error) {
          results.push({
            materialId: priceData.materialId,
            error: error.message
          });
        }
      }

      return ApiResponse.success(res, {
        results,
        totalProcessed: prices.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  calculateStatistics(prices) {
    if (!prices || prices.length === 0) return null;

    const sortedPrices = prices.map(p => p.price).sort((a, b) => a - b);
    const sum = sortedPrices.reduce((a, b) => a + b, 0);

    return {
      count: prices.length,
      min: sortedPrices[0],
      max: sortedPrices[sortedPrices.length - 1],
      avg: parseFloat((sum / prices.length).toFixed(2)),
      median: this.calculateMedian(sortedPrices),
      range: sortedPrices[sortedPrices.length - 1] - sortedPrices[0]
    };
  }

  calculateMedian(sortedPrices) {
    const mid = Math.floor(sortedPrices.length / 2);
    if (sortedPrices.length % 2 === 0) {
      return (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;
    }
    return sortedPrices[mid];
  }

  sortResults(prices, sortBy) {
    const sortMap = {
      'price': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'rating': (a, b) => (b.supplier?.profile?.rating || 0) - (a.supplier?.profile?.rating || 0),
      'distance': (a, b) => (a.distance || 0) - (b.distance || 0)
    };

    const sortFn = sortMap[sortBy] || sortMap.price;
    return prices.sort(sortFn);
  }

  async updatePriceInternal(data) {
    const { materialId, price, stockQuantity, location, unit, supplierId } = data;

    let priceRecord = await Price.findOne({
      supplierId,
      materialId,
      'location.city': location.city,
      'location.state': location.state
    });

    if (priceRecord) {
      priceRecord.price = price;
      priceRecord.stockQuantity = stockQuantity;
      priceRecord.unit = unit || priceRecord.unit;
      priceRecord.lastUpdated = new Date();
      priceRecord.addPriceHistory();
      await priceRecord.save();
    } else {
      priceRecord = new Price({
        supplierId,
        materialId,
        price,
        unit: unit || 'piece',
        location,
        stockQuantity
      });
      priceRecord.addPriceHistory();
      await priceRecord.save();
    }

    return priceRecord;
  }
}

module.exports = new PriceController();
