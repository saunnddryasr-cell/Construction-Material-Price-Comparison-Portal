const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);
router.get('/saved-suppliers', userController.getSavedSuppliers);
router.post('/save-supplier/:supplierId', userController.saveSupplier);
router.get('/inquiries', userController.getUserInquiries);
router.get('/stats', userController.getUserStats);
router.delete('/account', userController.deleteAccount);

module.exports = router;