/**
 * Supplier Validation Schemas
 * Comprehensive validation for supplier-related operations
 */

const Joi = require('joi');

/**
 * Common validation rules
 */
const idValidation = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required',
  });

const phoneValidation = Joi.string()
  .pattern(/^[0-9]{10}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone must be 10 digits',
    'any.required': 'Phone number is required',
  });

const emailValidation = Joi.string()
  .email()
  .required()
  .messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  });

const gstValidation = Joi.string()
  .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
  .optional()
  .allow('')
  .messages({
    'string.pattern.base': 'Invalid GST number format',
  });

const panValidation = Joi.string()
  .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
  .optional()
  .allow('')
  .messages({
    'string.pattern.base': 'Invalid PAN number format',
  });

const pincodeValidation = Joi.string()
  .pattern(/^[0-9]{6}$/)
  .optional()
  .allow('')
  .messages({
    'string.pattern.base': 'PIN code must be 6 digits',
  });

// ============================================
// SUPPLIER REGISTRATION VALIDATION
// ============================================

/**
 * Validate supplier registration
 */
const registerSupplierValidation = (data) => {
  const schema = Joi.object({
    // User account details
    username: Joi.string()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required',
      }),
    email: emailValidation,
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[A-Za-z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain at least one letter and one number',
        'any.required': 'Password is required',
      }),

    // Business Information
    business: Joi.object({
      name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
          'string.min': 'Business name must be at least 2 characters',
          'string.max': 'Business name cannot exceed 100 characters',
          'any.required': 'Business name is required',
        }),
      registrationNumber: Joi.string()
        .max(50)
        .optional()
        .allow('')
        .messages({
          'string.max': 'Registration number cannot exceed 50 characters',
        }),
      gstNumber: gstValidation,
      panNumber: panValidation,
      businessType: Joi.string()
        .valid('sole_proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited', 'others')
        .default('sole_proprietorship')
        .optional()
        .messages({
          'any.only': 'Invalid business type',
        }),
      yearEstablished: Joi.number()
        .min(1900)
        .max(new Date().getFullYear())
        .optional()
        .messages({
          'number.base': 'Year must be a number',
          'number.min': 'Year must be at least 1900',
          'number.max': 'Year cannot be in the future',
        }),
      employeeCount: Joi.number()
        .min(1)
        .max(100000)
        .optional()
        .messages({
          'number.base': 'Employee count must be a number',
          'number.min': 'Employee count must be at least 1',
          'number.max': 'Employee count cannot exceed 100,000',
        }),
      annualTurnover: Joi.number()
        .min(0)
        .optional()
        .messages({
          'number.base': 'Annual turnover must be a number',
          'number.min': 'Annual turnover cannot be negative',
        }),
    }).required(),

    // Contact Information
    contact: Joi.object({
      phone: phoneValidation,
      alternatePhone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .optional()
        .allow('')
        .messages({
          'string.pattern.base': 'Alternate phone must be 10 digits',
        }),
      email: emailValidation,
      website: Joi.string()
        .uri()
        .optional()
        .allow('')
        .messages({
          'string.uri': 'Invalid website URL',
        }),
      socialMedia: Joi.object({
        facebook: Joi.string().uri().optional().allow(''),
        instagram: Joi.string().uri().optional().allow(''),
        linkedin: Joi.string().uri().optional().allow(''),
        youtube: Joi.string().uri().optional().allow(''),
      }).optional(),
    }).required(),

    // Address Information
    address: Joi.object({
      registered: Joi.object({
        street: Joi.string()
          .max(200)
          .required()
          .messages({
            'string.max': 'Street address cannot exceed 200 characters',
            'any.required': 'Street address is required',
          }),
        city: Joi.string()
          .max(50)
          .required()
          .messages({
            'string.max': 'City cannot exceed 50 characters',
            'any.required': 'City is required',
          }),
        state: Joi.string()
          .max(50)
          .required()
          .messages({
            'string.max': 'State cannot exceed 50 characters',
            'any.required': 'State is required',
          }),
        pincode: pincodeValidation,
        country: Joi.string()
          .default('India')
          .optional(),
        coordinates: Joi.object({
          lat: Joi.number().min(-90).max(90),
          lng: Joi.number().min(-180).max(180),
        }).optional(),
      }).required(),
      operational: Joi.array()
        .items(
          Joi.object({
            street: Joi.string().max(200).required(),
            city: Joi.string().max(50).required(),
            state: Joi.string().max(50).required(),
            pincode: pincodeValidation,
            country: Joi.string().default('India'),
            isPrimary: Joi.boolean().default(false),
            coordinates: Joi.object({
              lat: Joi.number().min(-90).max(90),
              lng: Joi.number().min(-180).max(180),
            }).optional(),
          })
        )
        .optional(),
      deliveryAreas: Joi.array()
        .items(
          Joi.object({
            city: Joi.string().max(50).required(),
            state: Joi.string().max(50).required(),
            pincode: pincodeValidation,
            deliveryDays: Joi.array()
              .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
              .optional(),
            deliveryCharges: Joi.number().min(0).default(0),
            minimumOrder: Joi.number().min(0).default(0),
            estimatedDeliveryTime: Joi.object({
              min: Joi.number().min(0),
              max: Joi.number().min(0),
              unit: Joi.string().valid('hours', 'days').default('days'),
            }).optional(),
          })
        )
        .optional(),
    }).required(),

    // Categories
    categories: Joi.array()
      .items(
        Joi.object({
          category: Joi.string()
            .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
            .required()
            .messages({
              'any.only': 'Invalid category',
              'any.required': 'Category is required',
            }),
          subCategories: Joi.array().items(Joi.string()).optional(),
          experience: Joi.number().min(0).optional(),
          specialization: Joi.string()
            .valid('manufacturer', 'distributor', 'wholesaler', 'retailer', 'trader')
            .default('trader')
            .optional()
            .messages({
              'any.only': 'Invalid specialization',
            }),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one category is required',
        'any.required': 'Categories are required',
      }),

    // Preferences
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean().default(true),
        sms: Joi.boolean().default(false),
        push: Joi.boolean().default(true),
      }).optional(),
      autoAcceptInquiries: Joi.boolean().default(false),
      priceUpdateFrequency: Joi.string()
        .valid('realtime', 'daily', 'weekly')
        .default('daily')
        .optional()
        .messages({
          'any.only': 'Price update frequency must be realtime, daily, or weekly',
        }),
      preferredPaymentMethods: Joi.array()
        .items(Joi.string().valid('cash', 'bank_transfer', 'upi', 'credit_card', 'debit_card', 'cheque'))
        .optional(),
    }).optional(),

    // Availability
    availability: Joi.object({
      days: Joi.array()
        .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
        .optional(),
      hours: Joi.object({
        open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      }).optional(),
      isHoliday: Joi.boolean().default(false),
      holidaySchedule: Joi.array()
        .items(
          Joi.object({
            date: Joi.date().required(),
            reason: Joi.string().max(100),
          })
        )
        .optional(),
    }).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SUPPLIER PROFILE UPDATE VALIDATION
// ============================================

/**
 * Validate supplier profile update
 */
const updateSupplierProfileValidation = (data) => {
  const schema = Joi.object({
    business: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      registrationNumber: Joi.string().max(50).optional().allow(''),
      gstNumber: gstValidation,
      panNumber: panValidation,
      businessType: Joi.string()
        .valid('sole_proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited', 'others')
        .optional(),
      yearEstablished: Joi.number().min(1900).max(new Date().getFullYear()).optional(),
      employeeCount: Joi.number().min(1).max(100000).optional(),
      annualTurnover: Joi.number().min(0).optional(),
    }).optional(),

    contact: Joi.object({
      phone: phoneValidation,
      alternatePhone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow(''),
      email: emailValidation,
      website: Joi.string().uri().optional().allow(''),
      socialMedia: Joi.object({
        facebook: Joi.string().uri().optional().allow(''),
        instagram: Joi.string().uri().optional().allow(''),
        linkedin: Joi.string().uri().optional().allow(''),
        youtube: Joi.string().uri().optional().allow(''),
      }).optional(),
    }).optional(),

    address: Joi.object({
      registered: Joi.object({
        street: Joi.string().max(200),
        city: Joi.string().max(50),
        state: Joi.string().max(50),
        pincode: pincodeValidation,
        country: Joi.string().default('India'),
        coordinates: Joi.object({
          lat: Joi.number().min(-90).max(90),
          lng: Joi.number().min(-180).max(180),
        }).optional(),
      }).optional(),
      operational: Joi.array()
        .items(
          Joi.object({
            street: Joi.string().max(200).required(),
            city: Joi.string().max(50).required(),
            state: Joi.string().max(50).required(),
            pincode: pincodeValidation,
            country: Joi.string().default('India'),
            isPrimary: Joi.boolean().default(false),
            coordinates: Joi.object({
              lat: Joi.number().min(-90).max(90),
              lng: Joi.number().min(-180).max(180),
            }).optional(),
          })
        )
        .optional(),
      deliveryAreas: Joi.array()
        .items(
          Joi.object({
            city: Joi.string().max(50).required(),
            state: Joi.string().max(50).required(),
            pincode: pincodeValidation,
            deliveryDays: Joi.array()
              .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
              .optional(),
            deliveryCharges: Joi.number().min(0).default(0),
            minimumOrder: Joi.number().min(0).default(0),
            estimatedDeliveryTime: Joi.object({
              min: Joi.number().min(0),
              max: Joi.number().min(0),
              unit: Joi.string().valid('hours', 'days').default('days'),
            }).optional(),
          })
        )
        .optional(),
    }).optional(),

    categories: Joi.array()
      .items(
        Joi.object({
          category: Joi.string()
            .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
            .required(),
          subCategories: Joi.array().items(Joi.string()).optional(),
          experience: Joi.number().min(0).optional(),
          specialization: Joi.string()
            .valid('manufacturer', 'distributor', 'wholesaler', 'retailer', 'trader')
            .optional(),
        })
      )
      .optional(),

    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean(),
        sms: Joi.boolean(),
        push: Joi.boolean(),
      }).optional(),
      autoAcceptInquiries: Joi.boolean(),
      priceUpdateFrequency: Joi.string().valid('realtime', 'daily', 'weekly'),
      preferredPaymentMethods: Joi.array()
        .items(Joi.string().valid('cash', 'bank_transfer', 'upi', 'credit_card', 'debit_card', 'cheque'))
        .optional(),
    }).optional(),

    availability: Joi.object({
      days: Joi.array()
        .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
        .optional(),
      hours: Joi.object({
        open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      }).optional(),
      isHoliday: Joi.boolean(),
      holidaySchedule: Joi.array()
        .items(
          Joi.object({
            date: Joi.date().required(),
            reason: Joi.string().max(100),
          })
        )
        .optional(),
    }).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SUPPLIER DOCUMENT UPLOAD VALIDATION
// ============================================

/**
 * Validate supplier document upload
 */
const uploadSupplierDocumentValidation = (data) => {
  const schema = Joi.object({
    documentType: Joi.string()
      .valid('gstCertificate', 'panCard', 'businessLicense', 'bankDetails', 'other')
      .required()
      .messages({
        'any.only': 'Document type must be gstCertificate, panCard, businessLicense, bankDetails, or other',
        'any.required': 'Document type is required',
      }),
    documentName: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Document name cannot exceed 100 characters',
      }),
    isPublic: Joi.boolean().default(false),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SUPPLIER SUBSCRIPTION VALIDATION
// ============================================

/**
 * Validate supplier subscription update
 */
const updateSupplierSubscriptionValidation = (data) => {
  const schema = Joi.object({
    plan: Joi.string()
      .valid('free', 'basic', 'premium', 'enterprise')
      .required()
      .messages({
        'any.only': 'Plan must be free, basic, premium, or enterprise',
        'any.required': 'Plan is required',
      }),
    duration: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .default(1)
      .messages({
        'number.base': 'Duration must be a number',
        'number.integer': 'Duration must be an integer',
        'number.min': 'Duration must be at least 1 month',
        'number.max': 'Duration cannot exceed 12 months',
      }),
    autoRenew: Joi.boolean().default(true),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SUPPLIER SEARCH/VALIDATION
// ============================================

/**
 * Validate supplier search query
 */
const searchSuppliersValidation = (data) => {
  const schema = Joi.object({
    query: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Search query must be a string',
      }),
    category: Joi.string()
      .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
      .optional()
      .messages({
        'any.only': 'Invalid category',
      }),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: pincodeValidation,
    minRating: Joi.number().min(0).max(5).optional(),
    verified: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string()
      .valid('rating', 'name', 'createdAt', 'experience', 'employeeCount')
      .default('rating'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SUPPLIER RATING VALIDATION
// ============================================

/**
 * Validate supplier rating
 */
const rateSupplierValidation = (data) => {
  const schema = Joi.object({
    supplierId: idValidation,
    rating: Joi.number()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating must not exceed 5',
        'any.required': 'Rating is required',
      }),
    title: Joi.string()
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Title cannot exceed 100 characters',
      }),
    comment: Joi.string()
      .max(1000)
      .required()
      .messages({
        'string.max': 'Comment cannot exceed 1000 characters',
        'any.required': 'Comment is required',
      }),
    pros: Joi.array().items(Joi.string().max(100)).optional(),
    cons: Joi.array().items(Joi.string().max(100)).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SUPPLIER INQUIRY VALIDATION
// ============================================

/**
 * Validate supplier inquiry response
 */
const supplierInquiryResponseValidation = (data) => {
  const schema = Joi.object({
    inquiryId: idValidation,
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
    priceQuote: Joi.number().min(0).optional(),
    availableQuantity: Joi.number().integer().min(0).optional(),
    estimatedDelivery: Joi.date().min('now').optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// EXPORT ALL VALIDATIONS
// ============================================

module.exports = {
  // Registration
  registerSupplierValidation,
  
  // Profile
  updateSupplierProfileValidation,
  
  // Documents
  uploadSupplierDocumentValidation,
  
  // Subscription
  updateSupplierSubscriptionValidation,
  
  // Search
  searchSuppliersValidation,
  
  // Ratings
  rateSupplierValidation,
  
  // Inquiries
  supplierInquiryResponseValidation,
  
  // Common validations (export for reuse)
  idValidation,
  phoneValidation,
  emailValidation,
  gstValidation,
  panValidation,
  pincodeValidation,
};