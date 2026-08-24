const cron = require('node-cron');
const cacheService = require('../src/services/cache.service');
const { logger } = require('../config/logger');

// Run daily to clean up expired cache
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Running cache cleanup job');
    // Cache cleanup logic
    // NodeCache automatically cleans expired items
    // Redis has TTL built in
    logger.info('Cache cleanup completed');
  } catch (error) {
    logger.error('Cache cleanup error:', error);
  }
});