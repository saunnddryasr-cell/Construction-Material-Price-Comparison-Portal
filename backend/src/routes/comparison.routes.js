const express = require('express');
const router = express.Router();
const comparisonController = require('../controller/comparison.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/multiple', comparisonController.compareMultiple);
router.get('/suppliers', comparisonController.compareSuppliers);
router.get('/trends', comparisonController.getPriceTrends);
router.get('/recommendations', comparisonController.getRecommendations);

module.exports = router;