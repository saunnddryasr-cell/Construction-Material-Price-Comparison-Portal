const NodeCache = require('node-cache');
const { getRedisClient } = require('../config/redis');
const { logger } = require('../config/logger');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300,
      checkperiod: 60,
    });
    this.redis = null;
    this.isRedisAvailable = false;
    
    this.initRedis();
  }

  async initRedis() {
    try {
      this.redis = getRedisClient();
      if (this.redis) {
        await this.redis.ping();
        this.isRedisAvailable = true;
        logger.info('Redis cache enabled');
      }
    } catch (error) {
      logger.warn('Redis unavailable, using memory cache only');
    }
  }

  async get(key) {
    // Try memory cache first
    let value = this.cache.get(key);
    if (value !== undefined) {
      return value;
    }

    // Try Redis if available
    if (this.isRedisAvailable && this.redis) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          value = JSON.parse(redisValue);
          this.cache.set(key, value);
          return value;
        }
      } catch (error) {
        logger.error('Redis get error:', error);
      }
    }

    return null;
  }

  async set(key, value, ttl = 300) {
    // Set in memory cache
    this.cache.set(key, value, ttl);

    // Set in Redis if available
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        logger.error('Redis set error:', error);
      }
    }

    return value;
  }

  async invalidate(key) {
    this.cache.del(key);
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.error('Redis delete error:', error);
      }
    }
  }

  async invalidatePattern(pattern) {
    if (this.isRedisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } catch (error) {
        logger.error('Redis pattern delete error:', error);
      }
    }
  }

  async flush() {
    this.cache.flushAll();
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.flushall();
      } catch (error) {
        logger.error('Redis flush error:', error);
      }
    }
  }
}

module.exports = new CacheService();