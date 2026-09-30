const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { ROLES } = require('../utils/constants');
const { createInquiryValidation } = require('../validations/inquiry.validation');
const inquiryController = require('../controller/inquiry.controller');

const router = express.Router();

const validateCreateInquiry = (req, res, next) => {
  const { error, value } = createInquiryValidation(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid inquiry details',
      errors: error.details.map((detail) => detail.message),
    });
  }

  req.body = value;
  return next();
};

router.post(
  '/',
  authenticate,
  authorize(ROLES.CONTRACTOR),
  validateCreateInquiry,
  inquiryController.createInquiry
);

module.exports = router;
