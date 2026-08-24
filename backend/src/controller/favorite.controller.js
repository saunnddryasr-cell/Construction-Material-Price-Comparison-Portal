const favoriteService = require('../services/favorite.service');
const { ApiResponse } = require('../utils/apiResponse');
const { ValidationError } = require('../utils/errorCodes');
const { logger } = require('../config/logger');

class FavoriteController {
  /**
   * Add a favorite
   */
  async addFavorite(req, res, next) {
    try {
      const { targetId, type } = req.params;
      const userId = req.user._id;
      const { metadata, notifications, priority } = req.body;

      if (!['supplier', 'material'].includes(type)) {
        throw new ValidationError('Type must be "supplier" or "material"');
      }

      const favorite = await favoriteService.addFavorite(
        userId,
        targetId,
        type,
        { metadata, notifications, priority }
      );

      return ApiResponse.success(res, {
        favorite,
        message: 'Favorite added successfully',
      }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a favorite
   */
  async removeFavorite(req, res, next) {
    try {
      const { targetId, type } = req.params;
      const userId = req.user._id;

      const result = await favoriteService.removeFavorite(userId, targetId, type);

      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's favorites
   */
  async getUserFavorites(req, res, next) {
    try {
      const userId = req.user._id;
      const { type, page = 1, limit = 20 } = req.query;

      const result = await favoriteService.getFavoritesPaginated(
        userId,
        type,
        parseInt(page),
        parseInt(limit)
      );

      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get favorite by ID
   */
  async getFavoriteById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const favorite = await favoriteService.getFavoriteById(id, userId);

      return ApiResponse.success(res, { favorite });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update favorite
   */
  async updateFavorite(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const updates = req.body;

      const favorite = await favoriteService.updateFavorite(id, userId, updates);

      return ApiResponse.success(res, {
        favorite,
        message: 'Favorite updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if favorited
   */
  async checkFavorited(req, res, next) {
    try {
      const { targetId, type } = req.params;
      const userId = req.user._id;

      const isFavorited = await favoriteService.isFavorited(userId, targetId, type);

      return ApiResponse.success(res, {
        isFavorited,
        targetId,
        type,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get favorite count for a target
   */
  async getFavoriteCount(req, res, next) {
    try {
      const { targetId, type } = req.params;

      const count = await favoriteService.getFavoriteCount(targetId, type);

      return ApiResponse.success(res, {
        targetId,
        type,
        count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's tags
   */
  async getUserTags(req, res, next) {
    try {
      const userId = req.user._id;

      const tags = await favoriteService.getUserTags(userId);

      return ApiResponse.success(res, { tags });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top favorites
   */
  async getTopFavorites(req, res, next) {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      const favorites = await favoriteService.getTopFavorites(
        userId,
        parseInt(limit)
      );

      return ApiResponse.success(res, { favorites });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(req, res, next) {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      const recommendations = await favoriteService.getRecommendations(
        userId,
        parseInt(limit)
      );

      return ApiResponse.success(res, { recommendations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk add favorites
   */
  async bulkAdd(req, res, next) {
    try {
      const userId = req.user._id;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Items array is required');
      }

      const result = await favoriteService.bulkAdd(userId, items);

      return ApiResponse.success(res, {
        message: 'Favorites added successfully',
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update interaction
   */
  async updateInteraction(req, res, next) {
    try {
      const { id } = req.params;

      await favoriteService.updateInteraction(id);

      return ApiResponse.success(res, {
        message: 'Interaction updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FavoriteController();