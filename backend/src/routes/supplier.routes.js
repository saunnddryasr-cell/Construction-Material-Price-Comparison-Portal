const express = require('express');
const router = express.Router();
const supplierController = require('../controller/supplier.controller');
const { authenticate, authorize, isSupplier } = require('../middleware/auth.middleware');
const { ROLES } = require('../utils/constants');

// Public routes
router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);

// Protected routes - Supplier only
router.get('/dashboard/stats', authenticate, isSupplier, supplierController.getDashboardStats);
router.get('/analytics', authenticate, isSupplier, supplierController.getAnalytics);

// Admin routes
router.put('/verify/:id', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  // Verify supplier implementation
  next();
});

module.exports = router;