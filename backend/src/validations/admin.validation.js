/**
 * Admin Validation Schemas
 * Comprehensive validation for admin-related operations
 */

const Joi = require('joi');

/**
 * Validate user ID
 */
const idValidation = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required',
  });

/**
 * Validate pagination parameters
 */
const paginationValidation = {
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  sortBy: Joi.string()
    .default('createdAt')
    .optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional(),
};

/**
 * Validate date range
 */
const dateRangeValidation = {
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Invalid start date format',
    }),
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'Invalid end date format',
      'date.min': 'End date must be after start date',
    }),
};

// ============================================
// USER MANAGEMENT VALIDATIONS
// ============================================

/**
 * Validate get all users query
 */
const getAllUsersValidation = (data) => {
  const schema = Joi.object({
    ...paginationValidation,
    ...dateRangeValidation,
    role: Joi.string()
      .valid('contractor', 'supplier', 'admin')
      .optional()
      .messages({
        'any.only': 'Role must be contractor, supplier, or admin',
      }),
    status: Joi.string()
      .valid('active', 'inactive', 'suspended')
      .optional()
      .messages({
        'any.only': 'Status must be active, inactive, or suspended',
      }),
    verified: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'Verified must be a boolean',
      }),
    search: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Search query must be a string',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate user status update
 */
const updateUserStatusValidation = (data) => {
  const schema = Joi.object({
    userId: idValidation,
    status: Joi.string()
      .valid('active', 'inactive', 'suspended')
      .required()
      .messages({
        'any.only': 'Status must be active, inactive, or suspended',
        'any.required': 'Status is required',
      }),
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
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

/**
 * Validate user role update
 */
const updateUserRoleValidation = (data) => {
  const schema = Joi.object({
    userId: idValidation,
    role: Joi.string()
      .valid('contractor', 'supplier', 'admin')
      .required()
      .messages({
        'any.only': 'Role must be contractor, supplier, or admin',
        'any.required': 'Role is required',
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

/**
 * Validate user verification
 */
const verifyUserValidation = (data) => {
  const schema = Joi.object({
    userId: idValidation,
    verified: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Verified status is required',
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

/**
 * Validate user deletion
 */
const deleteUserValidation = (data) => {
  const schema = Joi.object({
    userId: idValidation,
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
      }),
    permanent: Joi.boolean()
      .default(false)
      .optional()
      .messages({
        'boolean.base': 'Permanent must be a boolean',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SUPPLIER MANAGEMENT VALIDATIONS
// ============================================

/**
 * Validate get all suppliers query
 */
const getAllSuppliersValidation = (data) => {
  const schema = Joi.object({
    ...paginationValidation,
    ...dateRangeValidation,
    status: Joi.string()
      .valid('active', 'inactive', 'pending_verification', 'suspended')
      .optional()
      .messages({
        'any.only': 'Status must be active, inactive, pending_verification, or suspended',
      }),
    verified: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'Verified must be a boolean',
      }),
    category: Joi.string()
      .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
      .optional()
      .messages({
        'any.only': 'Invalid category',
      }),
    city: Joi.string()
      .optional()
      .messages({
        'string.base': 'City must be a string',
      }),
    state: Joi.string()
      .optional()
      .messages({
        'string.base': 'State must be a string',
      }),
    search: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Search query must be a string',
      }),
    rating: Joi.number()
      .min(0)
      .max(5)
      .optional()
      .messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be at least 0',
        'number.max': 'Rating must not exceed 5',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate supplier verification
 */
const verifySupplierValidation = (data) => {
  const schema = Joi.object({
    supplierId: idValidation,
    verified: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Verification status is required',
      }),
    note: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Note cannot exceed 500 characters',
      }),
    documentsApproved: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'Documents approved must be a boolean',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate supplier document verification
 */
const verifySupplierDocumentValidation = (data) => {
  const schema = Joi.object({
    supplierId: idValidation,
    documentType: Joi.string()
      .valid('gstCertificate', 'panCard', 'businessLicense', 'bankDetails', 'other')
      .required()
      .messages({
        'any.only': 'Document type must be gstCertificate, panCard, businessLicense, bankDetails, or other',
        'any.required': 'Document type is required',
      }),
    verified: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Verification status is required',
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

/**
 * Validate supplier bulk action
 */
const supplierBulkActionValidation = (data) => {
  const schema = Joi.object({
    supplierIds: Joi.array()
      .items(idValidation)
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one supplier ID is required',
        'array.max': 'Cannot process more than 100 suppliers at once',
        'any.required': 'Supplier IDs are required',
      }),
    action: Joi.string()
      .valid('verify', 'unverify', 'activate', 'deactivate', 'suspend', 'delete')
      .required()
      .messages({
        'any.only': 'Action must be verify, unverify, activate, deactivate, suspend, or delete',
        'any.required': 'Action is required',
      }),
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// MATERIAL MANAGEMENT VALIDATIONS
// ============================================

/**
 * Validate get all materials query
 */
const getAllMaterialsValidation = (data) => {
  const schema = Joi.object({
    ...paginationValidation,
    ...dateRangeValidation,
    category: Joi.string()
      .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
      .optional()
      .messages({
        'any.only': 'Invalid category',
      }),
    brand: Joi.string()
      .optional()
      .messages({
        'string.base': 'Brand must be a string',
      }),
    status: Joi.string()
      .valid('active', 'inactive')
      .optional()
      .messages({
        'any.only': 'Status must be active or inactive',
      }),
    search: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Search query must be a string',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate create material
 */
const createMaterialValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Material name must be at least 2 characters',
        'string.max': 'Material name cannot exceed 100 characters',
        'any.required': 'Material name is required',
      }),
    category: Joi.string()
      .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
      .required()
      .messages({
        'any.only': 'Invalid category',
        'any.required': 'Category is required',
      }),
    subCategory: Joi.string()
      .max(50)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Sub-category cannot exceed 50 characters',
      }),
    unit: Joi.string()
      .valid('bag', 'ton', 'kg', 'piece', 'cubic_meter')
      .required()
      .messages({
        'any.only': 'Unit must be bag, ton, kg, piece, or cubic_meter',
        'any.required': 'Unit is required',
      }),
    description: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description cannot exceed 1000 characters',
      }),
    specifications: Joi.object({
      brand: Joi.string().max(50),
      grade: Joi.string().max(50),
      size: Joi.string().max(50),
      weight: Joi.number().min(0),
      color: Joi.string().max(30),
      materialType: Joi.string().max(50),
      certifications: Joi.array().items(Joi.string()),
      dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0),
      }),
      features: Joi.array().items(Joi.string()),
      technicalSpecs: Joi.object().unknown(true),
    }).optional(),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri(),
        isPrimary: Joi.boolean().default(false),
        alt: Joi.string().max(100),
      })
    ).optional(),
    isActive: Joi.boolean().default(true),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate update material
 */
const updateMaterialValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Material name must be at least 2 characters',
        'string.max': 'Material name cannot exceed 100 characters',
      }),
    category: Joi.string()
      .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
      .optional()
      .messages({
        'any.only': 'Invalid category',
      }),
    subCategory: Joi.string()
      .max(50)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Sub-category cannot exceed 50 characters',
      }),
    unit: Joi.string()
      .valid('bag', 'ton', 'kg', 'piece', 'cubic_meter')
      .optional()
      .messages({
        'any.only': 'Unit must be bag, ton, kg, piece, or cubic_meter',
      }),
    description: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description cannot exceed 1000 characters',
      }),
    specifications: Joi.object({
      brand: Joi.string().max(50),
      grade: Joi.string().max(50),
      size: Joi.string().max(50),
      weight: Joi.number().min(0),
      color: Joi.string().max(30),
      materialType: Joi.string().max(50),
      certifications: Joi.array().items(Joi.string()),
      dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0),
      }),
      features: Joi.array().items(Joi.string()),
      technicalSpecs: Joi.object().unknown(true),
    }).optional(),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri(),
        isPrimary: Joi.boolean().default(false),
        alt: Joi.string().max(100),
      })
    ).optional(),
    isActive: Joi.boolean().optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate material bulk action
 */
const materialBulkActionValidation = (data) => {
  const schema = Joi.object({
    materialIds: Joi.array()
      .items(idValidation)
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one material ID is required',
        'array.max': 'Cannot process more than 100 materials at once',
        'any.required': 'Material IDs are required',
      }),
    action: Joi.string()
      .valid('activate', 'deactivate', 'delete')
      .required()
      .messages({
        'any.only': 'Action must be activate, deactivate, or delete',
        'any.required': 'Action is required',
      }),
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// PRICE MANAGEMENT VALIDATIONS
// ============================================

/**
 * Validate get all prices query
 */
const getAllPricesValidation = (data) => {
  const schema = Joi.object({
    ...paginationValidation,
    ...dateRangeValidation,
    materialId: idValidation.optional(),
    supplierId: idValidation.optional(),
    category: Joi.string()
      .valid('cement', 'steel', 'bricks', 'sand', 'aggregates', 'others')
      .optional()
      .messages({
        'any.only': 'Invalid category',
      }),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    verified: Joi.boolean().optional(),
    status: Joi.string()
      .valid('active', 'inactive')
      .optional()
      .messages({
        'any.only': 'Status must be active or inactive',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate price verification
 */
const verifyPriceValidation = (data) => {
  const schema = Joi.object({
    priceId: idValidation,
    verified: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Verification status is required',
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

/**
 * Validate price bulk action
 */
const priceBulkActionValidation = (data) => {
  const schema = Joi.object({
    priceIds: Joi.array()
      .items(idValidation)
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one price ID is required',
        'array.max': 'Cannot process more than 100 prices at once',
        'any.required': 'Price IDs are required',
      }),
    action: Joi.string()
      .valid('verify', 'unverify', 'activate', 'deactivate', 'delete')
      .required()
      .messages({
        'any.only': 'Action must be verify, unverify, activate, deactivate, or delete',
        'any.required': 'Action is required',
      }),
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// INQUIRY MANAGEMENT VALIDATIONS
// ============================================

/**
 * Validate get all inquiries query
 */
const getAllInquiriesValidation = (data) => {
  const schema = Joi.object({
    ...paginationValidation,
    ...dateRangeValidation,
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
    supplierId: idValidation.optional(),
    userId: idValidation.optional(),
    materialId: idValidation.optional(),
    search: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Search query must be a string',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate inquiry update
 */
const adminUpdateInquiryValidation = (data) => {
  const schema = Joi.object({
    inquiryId: idValidation,
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
    assignedTo: idValidation.optional(),
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

/**
 * Validate inquiry bulk action
 */
const inquiryBulkActionValidation = (data) => {
  const schema = Joi.object({
    inquiryIds: Joi.array()
      .items(idValidation)
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one inquiry ID is required',
        'array.max': 'Cannot process more than 100 inquiries at once',
        'any.required': 'Inquiry IDs are required',
      }),
    action: Joi.string()
      .valid('resolve', 'close', 'assign')
      .required()
      .messages({
        'any.only': 'Action must be resolve, close, or assign',
        'any.required': 'Action is required',
      }),
    assignedTo: Joi.when('action', {
      is: 'assign',
      then: Joi.string().required(),
      otherwise: Joi.optional(),
    }),
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// REVIEW MANAGEMENT VALIDATIONS
// ============================================

/**
 * Validate get all reviews query
 */
const getAllReviewsValidation = (data) => {
  const schema = Joi.object({
    ...paginationValidation,
    ...dateRangeValidation,
    supplierId: idValidation.optional(),
    userId: idValidation.optional(),
    rating: Joi.number()
      .min(0)
      .max(5)
      .optional()
      .messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be at least 0',
        'number.max': 'Rating must not exceed 5',
      }),
    verified: Joi.boolean().optional(),
    search: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Search query must be a string',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate review moderation
 */
const moderateReviewValidation = (data) => {
  const schema = Joi.object({
    reviewId: idValidation,
    action: Joi.string()
      .valid('approve', 'reject', 'hide', 'delete')
      .required()
      .messages({
        'any.only': 'Action must be approve, reject, hide, or delete',
        'any.required': 'Action is required',
      }),
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Reason cannot exceed 500 characters',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// AUDIT LOG VALIDATIONS
// ============================================

/**
 * Validate get audit logs query
 */
const getAuditLogsValidation = (data) => {
  const schema = Joi.object({
    ...paginationValidation,
    ...dateRangeValidation,
    userId: idValidation.optional(),
    action: Joi.string()
      .valid('create', 'update', 'delete', 'verify', 'login', 'logout', 'price_update', 'status_change')
      .optional()
      .messages({
        'any.only': 'Invalid action',
      }),
    resource: Joi.string()
      .valid('user', 'supplier', 'material', 'price', 'inquiry', 'review', 'system')
      .optional()
      .messages({
        'any.only': 'Invalid resource',
      }),
    search: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Search query must be a string',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// SYSTEM CONFIGURATION VALIDATIONS
// ============================================

/**
 * Validate system settings update
 */
const updateSystemSettingsValidation = (data) => {
  const schema = Joi.object({
    settings: Joi.object({
      siteName: Joi.string().max(100).optional(),
      siteDescription: Joi.string().max(500).optional(),
      maintenanceMode: Joi.boolean().optional(),
      registrationEnabled: Joi.boolean().optional(),
      emailVerificationRequired: Joi.boolean().optional(),
      maxLoginAttempts: Joi.number().integer().min(3).max(10).optional(),
      sessionTimeout: Joi.number().integer().min(300).max(86400).optional(),
      priceUpdateInterval: Joi.number().integer().min(60).max(86400).optional(),
      maxPriceAlerts: Joi.number().integer().min(5).max(100).optional(),
      defaultCurrency: Joi.string().length(3).optional(),
      timezone: Joi.string().optional(),
    }).required(),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate system backup request
 */
const systemBackupValidation = (data) => {
  const schema = Joi.object({
    type: Joi.string()
      .valid('full', 'database', 'files', 'config')
      .required()
      .messages({
        'any.only': 'Type must be full, database, files, or config',
        'any.required': 'Backup type is required',
      }),
    includeLogs: Joi.boolean().default(false),
    includeUploads: Joi.boolean().default(false),
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

// ============================================
// REPORT VALIDATIONS
// ============================================

/**
 * Validate generate report query
 */
const generateReportValidation = (data) => {
  const schema = Joi.object({
    type: Joi.string()
      .valid('users', 'suppliers', 'materials', 'prices', 'inquiries', 'reviews', 'analytics')
      .required()
      .messages({
        'any.only': 'Invalid report type',
        'any.required': 'Report type is required',
      }),
    ...dateRangeValidation,
    format: Joi.string()
      .valid('json', 'csv', 'pdf', 'excel')
      .default('json')
      .optional()
      .messages({
        'any.only': 'Format must be json, csv, pdf, or excel',
      }),
    groupBy: Joi.string()
      .valid('day', 'week', 'month', 'quarter', 'year')
      .optional()
      .messages({
        'any.only': 'Group by must be day, week, month, quarter, or year',
      }),
    filters: Joi.object()
      .optional()
      .unknown(true),
  });

  return schema.validate(data, { abortEarly: false });
};

// ============================================
// EXPORT ALL VALIDATIONS
// ============================================

module.exports = {
  // Common validations
  idValidation,
  paginationValidation,
  dateRangeValidation,

  // User management
  getAllUsersValidation,
  updateUserStatusValidation,
  updateUserRoleValidation,
  verifyUserValidation,
  deleteUserValidation,

  // Supplier management
  getAllSuppliersValidation,
  verifySupplierValidation,
  verifySupplierDocumentValidation,
  supplierBulkActionValidation,

  // Material management
  getAllMaterialsValidation,
  createMaterialValidation,
  updateMaterialValidation,
  materialBulkActionValidation,

  // Price management
  getAllPricesValidation,
  verifyPriceValidation,
  priceBulkActionValidation,

  // Inquiry management
  getAllInquiriesValidation,
  adminUpdateInquiryValidation,
  inquiryBulkActionValidation,

  // Review management
  getAllReviewsValidation,
  moderateReviewValidation,

  // Audit log
  getAuditLogsValidation,

  // System
  updateSystemSettingsValidation,
  systemBackupValidation,

  // Reports
  generateReportValidation,
};