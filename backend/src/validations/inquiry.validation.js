const Joi = require('joi');

/**
 * Create Inquiry Validation
 */
const createInquiryValidation = (data) => {
  const schema = Joi.object({
    materialId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid material ID format',
        'any.required': 'Material ID is required',
      }),

    supplierId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid supplier ID format',
        'any.required': 'Supplier ID is required',
      }),

    quantity: Joi.number()
      .integer()
      .min(1)
      .max(999999)
      .required()
      .messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity must be at least 1',
        'number.max': 'Quantity cannot exceed 999,999',
        'any.required': 'Quantity is required',
      }),

    unit: Joi.string()
      .max(20)
      .optional()
      .messages({
        'string.max': 'Unit cannot exceed 20 characters',
      }),

    message: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Message cannot exceed 1000 characters',
      }),

    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .default('medium')
      .optional()
      .messages({
        'any.only': 'Priority must be low, medium, high, or urgent',
      }),

    expectedDelivery: Joi.date()
      .min('now')
      .optional()
      .messages({
        'date.min': 'Expected delivery date must be in the future',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Respond to Inquiry Validation
 */
const respondToInquiryValidation = (data) => {
  const schema = Joi.object({
    message: Joi.string()
      .min(1)
      .max(2000)
      .required()
      .messages({
        'string.empty': 'Response message is required',
        'string.min': 'Response must be at least 1 character',
        'string.max': 'Response cannot exceed 2000 characters',
        'any.required': 'Response message is required',
      }),

    priceQuote: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.base': 'Price quote must be a number',
        'number.min': 'Price quote cannot be negative',
      }),

    availableQuantity: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.base': 'Available quantity must be a number',
        'number.integer': 'Available quantity must be an integer',
        'number.min': 'Available quantity cannot be negative',
      }),

    estimatedDelivery: Joi.date()
      .min('now')
      .optional()
      .messages({
        'date.min': 'Estimated delivery date must be in the future',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Update Inquiry Status Validation
 */
const updateInquiryStatusValidation = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('pending', 'responded', 'accepted', 'rejected', 'closed')
      .required()
      .messages({
        'any.only': 'Status must be pending, responded, accepted, rejected, or closed',
        'any.required': 'Status is required',
      }),

    note: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Note cannot exceed 500 characters',
      }),

    reason: Joi.string()
      .max(500)
      .when('status', {
        is: 'rejected',
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
        'any.required': 'Reason is required when rejecting inquiry',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Get Inquiries Query Validation
 */
const getInquiriesQueryValidation = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('pending', 'responded', 'accepted', 'rejected', 'closed')
      .optional()
      .messages({
        'any.only': 'Invalid status filter',
      }),

    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional()
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1',
      }),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional()
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100',
      }),

    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'priority', 'status')
      .default('createdAt')
      .optional()
      .messages({
        'any.only': 'Invalid sort field',
      }),

    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .optional()
      .messages({
        'any.only': 'Sort order must be asc or desc',
      }),

    startDate: Joi.date()
      .optional()
      .messages({
        'date.base': 'Invalid start date',
      }),

    endDate: Joi.date()
      .min(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.base': 'Invalid end date',
        'date.min': 'End date must be after start date',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Admin Update Inquiry Validation
 */
const adminUpdateInquiryValidation = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('pending', 'responded', 'accepted', 'rejected', 'closed')
      .optional()
      .messages({
        'any.only': 'Invalid status',
      }),

    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .optional()
      .messages({
        'any.only': 'Invalid priority',
      }),

    assignedTo: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
      }),

    note: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Note cannot exceed 500 characters',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

module.exports = {
  createInquiryValidation,
  respondToInquiryValidation,
  updateInquiryStatusValidation,
  getInquiriesQueryValidation,
  adminUpdateInquiryValidation,
};