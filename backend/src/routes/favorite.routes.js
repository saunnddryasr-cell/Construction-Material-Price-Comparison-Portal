const express = require('express');
const router = express.Router();
const favoriteController = require('../controller/favorite.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All favorite routes require authentication
router.use(authenticate);

// Get all favorites
router.get('/', favoriteController.getUserFavorites);

// Get favorite by ID
router.get('/:id', favoriteController.getFavoriteById);

// Update favorite
router.put('/:id', favoriteController.updateFavorite);

// Add favorite
router.post('/:type/:targetId', favoriteController.addFavorite);

// Remove favorite
router.delete('/:type/:targetId', favoriteController.removeFavorite);

// Check if favorited
router.get('/check/:type/:targetId', favoriteController.checkFavorited);

// Get favorite count
router.get('/count/:type/:targetId', favoriteController.getFavoriteCount);

// Get user's tags
router.get('/tags', favoriteController.getUserTags);

// Get top favorites
router.get('/top', favoriteController.getTopFavorites);

// Get recommendations
router.get('/recommendations', favoriteController.getRecommendations);

// Bulk add favorites
router.post('/bulk', favoriteController.bulkAdd);

// Update interaction
router.patch('/:id/interaction', favoriteController.updateInteraction);

module.exports = router;