const express = require('express');
const adminController = require('../controller/admin.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate, isAdmin);
router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.put('/suppliers/:id/verification', adminController.verifySupplier);
router.delete('/users/:id', adminController.deleteUser);
router.get('/prices/updates', adminController.getRecentPriceUpdates);
router.get('/reports', adminController.generateReport);

module.exports = router;