const cron = require('node-cron');
const Price = require('../src/models/Price.model');
const { logger } = require('../config/logger');

// Run every hour to check for stale prices
cron.schedule('0 * * * *', async () => {
  try {
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - 24);

    const stalePrices = await Price.find({
      lastUpdated: { $lt: staleThreshold },
      isActive: true,
    });

    if (stalePrices.length > 0) {
      // Notify suppliers about stale prices
      logger.info(`Found ${stalePrices.length} stale prices`);
      
      // Group by supplier
      const supplierMap = {};
      for (const price of stalePrices) {
        const supplierId = price.supplierId.toString();
        if (!supplierMap[supplierId]) {
          supplierMap[supplierId] = [];
        }
        supplierMap[supplierId].push(price);
      }

      // Send notifications to suppliers
      // Implementation for sending notifications
    }
  } catch (error) {
    logger.error('Price update job error:', error);
  }
});