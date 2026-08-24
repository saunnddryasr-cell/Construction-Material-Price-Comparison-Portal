const Favorite = require('../models/Favorite.model');
const User = require('../models/User.model');
const Material = require('../models/Material.model');
const { logger } = require('../config/logger');
const { ValidationError, NotFoundError } = require('../utils/errorCodes');

class FavoriteService {
  /**
   * Add a favorite
   */
  async addFavorite(userId, targetId, type, options = {}) {
    // Validate target exists
    await this.validateTarget(targetId, type);

    // Check if already exists
    const existing = await Favorite.findOne({
      userId,
      targetId,
      type,
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate if inactive
        existing.isActive = true;
        existing.lastInteraction = new Date();
        await existing.save();
        return existing;
      }
      throw new ValidationError('Item already in favorites');
    }

    const favorite = new Favorite({
      userId,
      targetId,
      type,
      metadata: options.metadata || {},
      notifications: options.notifications || {},
      priority: options.priority || 3,
    });

    await favorite.save();

    logger.info(`Favorite added: User ${userId}, ${type} ${targetId}`);

    return favorite;
  }

  /**
   * Remove a favorite
   */
  async removeFavorite(userId, targetId, type) {
    const favorite = await Favorite.findOne({
      userId,
      targetId,
      type,
    });

    if (!favorite) {
      throw new NotFoundError('Favorite not found');
    }

    favorite.isActive = false;
    await favorite.save();

    logger.info(`Favorite removed: User ${userId}, ${type} ${targetId}`);

    return { message: 'Favorite removed successfully' };
  }

  /**
   * Get all favorites for a user
   */
  async getUserFavorites(userId, type = null) {
    return Favorite.getFavoritesForUser(userId, type);
  }

  /**
   * Get favorite by ID
   */
  async getFavoriteById(id, userId) {
    const favorite = await Favorite.findOne({
      _id: id,
      userId,
      isActive: true,
    }).populate('target');

    if (!favorite) {
      throw new NotFoundError('Favorite not found');
    }

    return favorite;
  }

  /**
   * Update favorite
   */
  async updateFavorite(id, userId, updates) {
    const favorite = await Favorite.findOne({
      _id: id,
      userId,
      isActive: true,
    });

    if (!favorite) {
      throw new NotFoundError('Favorite not found');
    }

    // Update allowed fields
    const allowedUpdates = [
      'priority',
      'metadata.notes',
      'metadata.userRating',
      'metadata.tags',
      'metadata.targetPrice',
      'notifications.priceAlerts',
      'notifications.availabilityAlerts',
      'notifications.promotionalAlerts',
    ];

    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        const keys = field.split('.');
        if (keys.length === 1) {
          favorite[field] = updates[field];
        } else {
          let target = favorite;
          for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
          }
          target[keys[keys.length - 1]] = updates[field];
        }
      }
    }

    await favorite.save();

    logger.info(`Favorite updated: ${id}`);

    return favorite;
  }

  /**
   * Validate target exists
   */
  async validateTarget(targetId, type) {
    let exists = false;
    
    if (type === 'supplier') {
      const user = await User.findOne({
        _id: targetId,
        role: 'supplier',
        isActive: true,
      });
      exists = !!user;
    } else if (type === 'material') {
      const material = await Material.findOne({
        _id: targetId,
        isActive: true,
      });
      exists = !!material;
    }

    if (!exists) {
      throw new NotFoundError(`${type} not found`);
    }
  }

  /**
   * Get favorite count for a target
   */
  async getFavoriteCount(targetId, type) {
    return Favorite.getFavoriteCount(targetId, type);
  }

  /**
   * Check if user has favorited
   */
  async isFavorited(userId, targetId, type) {
    return Favorite.isFavorited(userId, targetId, type);
  }

  /**
   * Get top favorites
   */
  async getTopFavorites(userId, limit = 10) {
    return Favorite.getTopFavorites(userId, limit);
  }

  /**
   * Get favorites by tags
   */
  async getFavoritesByTags(userId, tags) {
    return Favorite.getFavoritesByTags(userId, tags);
  }

  /**
   * Get user's tags
   */
  async getUserTags(userId) {
    return Favorite.getUserTags(userId);
  }

  /**
   * Get favorites with price alerts
   */
  async getFavoritesWithPriceAlerts(userId) {
    return Favorite.getFavoritesWithPriceAlerts(userId);
  }

  /**
   * Bulk add favorites
   */
  async bulkAdd(userId, items) {
    const validatedItems = [];

    for (const item of items) {
      await this.validateTarget(item.targetId, item.type);
      validatedItems.push(item);
    }

    return Favorite.bulkAdd(userId, validatedItems);
  }

  /**
   * Update interaction
   */
  async updateInteraction(favoriteId) {
    const favorite = await Favorite.findById(favoriteId);
    if (favorite) {
      await favorite.updateInteraction();
    }
  }

  /**
   * Get favorites with pagination
   */
  async getFavoritesPaginated(userId, type = null, page = 1, limit = 20) {
    const match = { userId, isActive: true };
    if (type) {
      match.type = type;
    }

    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      Favorite.find(match)
        .populate('target')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Favorite.countDocuments(match),
    ]);

    return {
      favorites,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recommended favorites based on user's existing favorites
   */
  async getRecommendations(userId, limit = 10) {
    // Get user's favorite tags
    const tags = await Favorite.getUserTags(userId);
    const tagNames = tags.map(t => t.tag);

    if (tagNames.length === 0) {
      // If no tags, return most popular favorites
      return this.getMostPopularFavorites(limit);
    }

    // Find other users with similar favorites
    const similarUsers = await Favorite.aggregate([
      { $match: { 
        userId: { $ne: new mongoose.Types.ObjectId(userId) },
        isActive: true,
        'metadata.tags': { $in: tagNames },
      }},
      { $group: {
        _id: '$userId',
        matchCount: { $sum: 1 },
      }},
      { $sort: { matchCount: -1 } },
      { $limit: 5 },
    ]);

    if (similarUsers.length === 0) {
      return this.getMostPopularFavorites(limit);
    }

    const similarUserIds = similarUsers.map(u => u._id);

    // Get favorites from similar users that the current user doesn't have
    const recommendations = await Favorite.aggregate([
      { $match: {
        userId: { $in: similarUserIds },
        isActive: true,
        targetId: { $nin: await this.getUserFavoritedTargetIds(userId) },
      }},
      { $group: {
        _id: '$targetId',
        type: { $first: '$type' },
        count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: '_id',
          as: 'material',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      {
        $addFields: {
          target: {
            $cond: [
              { $eq: ['$type', 'material'] },
              { $arrayElemAt: ['$material', 0] },
              { $arrayElemAt: ['$supplier', 0] },
            ],
          },
        },
      },
      { $project: { material: 0, supplier: 0 } },
    ]);

    return recommendations;
  }

  /**
   * Get most popular favorites
   */
  async getMostPopularFavorites(limit = 10) {
    const popular = await Favorite.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$targetId',
        type: { $first: '$type' },
        count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: '_id',
          as: 'material',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      {
        $addFields: {
          target: {
            $cond: [
              { $eq: ['$type', 'material'] },
              { $arrayElemAt: ['$material', 0] },
              { $arrayElemAt: ['$supplier', 0] },
            ],
          },
        },
      },
      { $project: { material: 0, supplier: 0 } },
    ]);

    return popular;
  }

  /**
   * Get user's favorited target IDs
   */
  async getUserFavoritedTargetIds(userId) {
    const favorites = await Favorite.find({
      userId,
      isActive: true,
    }).select('targetId');
    
    return favorites.map(f => f.targetId);
  }
}

module.exports = new FavoriteService();