const mongoose = require('mongoose');

/**
 * Inquiry Model
 * Manages inquiries from contractors/builders to suppliers
 * Tracks communication, status, and responses
 */

const inquirySchema = new mongoose.Schema({
  // Reference to the user who created the inquiry (Contractor/Builder)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Reference to the supplier receiving the inquiry
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Reference to the material being inquired about
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
    index: true,
  },

  // Inquiry details
  subject: {
    type: String,
    trim: true,
    maxlength: 200,
    default: function() {
      return `Inquiry for ${this.materialId?.name || 'Material'}`;
    },
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Quantity must be greater than 0',
    },
  },

  unit: {
    type: String,
    required: true,
    enum: ['bag', 'ton', 'kg', 'piece', 'cubic_meter', 'cubic_feet', 'square_feet', 'meter', 'roll', 'sheet'],
    default: 'piece',
  },

  message: {
    type: String,
    trim: true,
    maxlength: 2000,
    required: true,
  },

  // Delivery requirements
  delivery: {
    requiredDate: {
      type: Date,
      default: null,
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      pincode: {
        type: String,
        trim: true,
        match: [/^[0-9]{6}$/, 'Invalid pincode format'],
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },

  // Budget information
  budget: {
    min: {
      type: Number,
      default: null,
      min: 0,
    },
    max: {
      type: Number,
      default: null,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'responded', 'accepted', 'rejected', 'closed', 'expired'],
    default: 'pending',
    index: true,
  },

  // Priority levels
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },

  // Responses from supplier
  responses: [{
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sentByRole: {
      type: String,
      enum: ['supplier', 'user', 'admin'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Response details
    priceQuote: {
      type: Number,
      min: 0,
      default: null,
    },
    availableQuantity: {
      type: Number,
      min: 0,
      default: null,
    },
    estimatedDelivery: {
      type: Date,
      default: null,
    },
    deliveryCharges: {
      type: Number,
      min: 0,
      default: null,
    },
    attachments: [{
      name: String,
      url: String,
      size: Number,
      mimeType: String,
    }],
  }],

  // Timeline of status changes
  timeline: [{
    status: {
      type: String,
      enum: ['pending', 'responded', 'accepted', 'rejected', 'closed', 'expired'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedByRole: {
      type: String,
      enum: ['supplier', 'user', 'admin', 'system'],
      default: 'system',
    },
  }],

  // Metrics and analytics
  metrics: {
    responseTime: {
      type: Number, // in minutes
      default: null,
    },
    resolutionTime: {
      type: Number, // in minutes
      default: null,
    },
    responseCount: {
      type: Number,
      default: 0,
    },
    lastResponseAt: {
      type: Date,
      default: null,
    },
  },

  // Flags
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isUrgent: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },

  // Expiry
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 7); // Expires after 7 days
      return date;
    },
  },

  // Additional metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'email', 'api'],
      default: 'web',
    },
    ipAddress: String,
    userAgent: String,
    referrer: String,
    tags: [{
      type: String,
      trim: true,
      maxlength: 30,
    }],
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },

}, {
  timestamps: true,
});

// ============================================
// INDEXES
// ============================================

// Compound indexes for efficient queries
inquirySchema.index({ userId: 1, status: 1 });
inquirySchema.index({ supplierId: 1, status: 1 });
inquirySchema.index({ materialId: 1, status: 1 });
inquirySchema.index({ status: 1, priority: 1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
inquirySchema.index({ 'responses.timestamp': -1 });

// ============================================
// VIRTUALS
// ============================================

inquirySchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

inquirySchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

inquirySchema.virtual('isResponded').get(function() {
  return this.status === 'responded';
});

inquirySchema.virtual('isAccepted').get(function() {
  return this.status === 'accepted';
});

inquirySchema.virtual('isRejected').get(function() {
  return this.status === 'rejected';
});

inquirySchema.virtual('isClosed').get(function() {
  return this.status === 'closed';
});

inquirySchema.virtual('hasResponses').get(function() {
  return this.responses && this.responses.length > 0;
});

inquirySchema.virtual('lastResponse').get(function() {
  if (!this.responses || this.responses.length === 0) return null;
  return this.responses[this.responses.length - 1];
});

inquirySchema.virtual('responseCount').get(function() {
  return this.responses ? this.responses.length : 0;
});

inquirySchema.virtual('unreadResponseCount').get(function() {
  if (!this.responses) return 0;
  return this.responses.filter(r => !r.isRead).length;
});

inquirySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

inquirySchema.virtual('supplier', {
  ref: 'User',
  localField: 'supplierId',
  foreignField: '_id',
  justOne: true,
});

inquirySchema.virtual('material', {
  ref: 'Material',
  localField: 'materialId',
  foreignField: '_id',
  justOne: true,
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Add a response to the inquiry
 */
inquirySchema.methods.addResponse = async function(message, userId, role, options = {}) {
  const response = {
    message,
    sentBy: userId,
    sentByRole: role,
    timestamp: new Date(),
    isRead: false,
    ...options,
  };

  this.responses.push(response);
  this.status = 'responded';
  this.metrics.responseCount = this.responses.length;
  this.metrics.lastResponseAt = new Date();

  // Calculate response time if first response
  if (this.responses.length === 1) {
    this.metrics.responseTime = Math.round(
      (new Date() - this.createdAt) / (1000 * 60)
    );
  }

  // Add to timeline
  this.timeline.push({
    status: 'responded',
    timestamp: new Date(),
    note: `Response added by ${role}`,
    changedBy: userId,
    changedByRole: role,
  });

  await this.save();
  return this;
};

/**
 * Update inquiry status
 */
inquirySchema.methods.updateStatus = async function(status, note, userId, role = 'system') {
  const validStatuses = ['pending', 'responded', 'accepted', 'rejected', 'closed', 'expired'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  this.status = status;
  
  // Add to timeline
  this.timeline.push({
    status,
    timestamp: new Date(),
    note: note || `Status changed to ${status}`,
    changedBy: userId || null,
    changedByRole: role,
  });

  // Update metrics
  if (status === 'accepted' || status === 'rejected' || status === 'closed') {
    this.metrics.resolutionTime = Math.round(
      (new Date() - this.createdAt) / (1000 * 60)
    );
    this.isActive = false;
  }

  await this.save();
  return this;
};

/**
 * Mark response as read
 */
inquirySchema.methods.markResponseAsRead = async function(responseId, userId) {
  const response = this.responses.id(responseId);
  if (!response) {
    throw new Error('Response not found');
  }

  // Only the recipient can mark as read
  const isUser = this.userId.toString() === userId.toString();
  const isSupplier = this.supplierId.toString() === userId.toString();
  
  if (!isUser && !isSupplier) {
    throw new Error('Unauthorized to mark response as read');
  }

  // Check if user is reading response from the other party
  const isReadingOwnResponse = isUser && response.sentBy.toString() === userId.toString();
  const isReadingSupplierResponse = isSupplier && response.sentBy.toString() === userId.toString();
  
  if (!isReadingOwnResponse && !isReadingSupplierResponse) {
    response.isRead = true;
    response.readAt = new Date();
  }

  await this.save();
  return this;
};

/**
 * Mark all responses as read
 */
inquirySchema.methods.markAllResponsesAsRead = async function(userId) {
  const isUser = this.userId.toString() === userId.toString();
  const isSupplier = this.supplierId.toString() === userId.toString();
  
  if (!isUser && !isSupplier) {
    throw new Error('Unauthorized');
  }

  for (const response of this.responses) {
    // Don't mark own responses as read
    if (response.sentBy.toString() !== userId.toString()) {
      response.isRead = true;
      response.readAt = new Date();
    }
  }

  await this.save();
  return this;
};

/**
 * Check if user is participant
 */
inquirySchema.methods.isParticipant = function(userId) {
  return this.userId.toString() === userId.toString() || 
         this.supplierId.toString() === userId.toString();
};

/**
 * Get participant details
 */
inquirySchema.methods.getParticipants = async function() {
  const User = mongoose.model('User');
  const [user, supplier] = await Promise.all([
    User.findById(this.userId).select('username email profile'),
    User.findById(this.supplierId).select('username email profile'),
  ]);
  return { user, supplier };
};

/**
 * Get response statistics
 */
inquirySchema.methods.getResponseStats = function() {
  if (!this.responses || this.responses.length === 0) {
    return {
      total: 0,
      read: 0,
      unread: 0,
      byUser: 0,
      bySupplier: 0,
    };
  }

  const stats = {
    total: this.responses.length,
    read: 0,
    unread: 0,
    byUser: 0,
    bySupplier: 0,
  };

  for (const response of this.responses) {
    if (response.isRead) stats.read++;
    else stats.unread++;
    
    if (response.sentByRole === 'user') stats.byUser++;
    else if (response.sentByRole === 'supplier') stats.bySupplier++;
  }

  return stats;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get inquiries for a user
 */
inquirySchema.statics.getInquiriesForUser = async function(userId, filters = {}) {
  const {
    status = null,
    priority = null,
    materialId = null,
    supplierId = null,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const match = { userId, isActive: true };
  
  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (materialId) match.materialId = new mongoose.Types.ObjectId(materialId);
  if (supplierId) match.supplierId = new mongoose.Types.ObjectId(supplierId);

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [inquiries, total] = await Promise.all([
    this.find(match)
      .populate('materialId', 'name category unit images')
      .populate('supplierId', 'username email profile.companyName profile.rating profile.avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    this.countDocuments(match),
  ]);

  return {
    inquiries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get inquiries for a supplier
 */
inquirySchema.statics.getInquiriesForSupplier = async function(supplierId, filters = {}) {
  const {
    status = null,
    priority = null,
    materialId = null,
    userId = null,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const match = { supplierId, isActive: true };
  
  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (materialId) match.materialId = new mongoose.Types.ObjectId(materialId);
  if (userId) match.userId = new mongoose.Types.ObjectId(userId);

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [inquiries, total] = await Promise.all([
    this.find(match)
      .populate('materialId', 'name category unit images')
      .populate('userId', 'username email profile.companyName profile.phone profile.avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    this.countDocuments(match),
  ]);

  return {
    inquiries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get inquiry statistics
 */
inquirySchema.statics.getStatistics = async function(userId, role) {
  const match = {};
  if (role === 'user') {
    match.userId = new mongoose.Types.ObjectId(userId);
  } else if (role === 'supplier') {
    match.supplierId = new mongoose.Types.ObjectId(userId);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ],
        responseTime: [
          { $match: { 'metrics.responseTime': { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$metrics.responseTime' } } },
        ],
        resolutionTime: [
          { $match: { 'metrics.resolutionTime': { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$metrics.resolutionTime' } } },
        ],
        lastWeek: [
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
          { $count: 'count' },
        ],
        thisMonth: [
          {
            $match: {
              createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
            },
          },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const result = stats[0] || {};
  
  return {
    total: result.total?.[0]?.count || 0,
    byStatus: result.byStatus || [],
    byPriority: result.byPriority || [],
    averageResponseTime: result.responseTime?.[0]?.avg || null,
    averageResolutionTime: result.resolutionTime?.[0]?.avg || null,
    lastWeek: result.lastWeek?.[0]?.count || 0,
    thisMonth: result.thisMonth?.[0]?.count || 0,
  };
};

/**
 * Get pending inquiries count
 */
inquirySchema.statics.getPendingCount = async function(userId, role) {
  const match = { status: 'pending', isActive: true };
  if (role === 'user') {
    match.userId = new mongoose.Types.ObjectId(userId);
  } else if (role === 'supplier') {
    match.supplierId = new mongoose.Types.ObjectId(userId);
  }
  return this.countDocuments(match);
};

/**
 * Get urgent inquiries
 */
inquirySchema.statics.getUrgentInquiries = async function(userId, role, limit = 10) {
  const match = { 
    priority: 'urgent', 
    status: { $in: ['pending', 'responded'] },
    isActive: true,
  };
  
  if (role === 'user') {
    match.userId = new mongoose.Types.ObjectId(userId);
  } else if (role === 'supplier') {
    match.supplierId = new mongoose.Types.ObjectId(userId);
  }

  return this.find(match)
    .populate('materialId', 'name category unit')
    .populate('userId', 'username profile.companyName')
    .populate('supplierId', 'username profile.companyName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get inquiry by ID with access check
 */
inquirySchema.statics.getInquiryById = async function(inquiryId, userId, role) {
  const inquiry = await this.findById(inquiryId)
    .populate('materialId', 'name category unit description images specifications')
    .populate('userId', 'username email profile.companyName profile.phone profile.avatar')
    .populate('supplierId', 'username email profile.companyName profile.phone profile.rating profile.avatar')
    .populate('responses.sentBy', 'username profile.companyName');

  if (!inquiry) {
    return null;
  }

  // Check access
  const isUser = inquiry.userId._id.toString() === userId.toString();
  const isSupplier = inquiry.supplierId._id.toString() === userId.toString();
  
  if (role !== 'admin' && !isUser && !isSupplier) {
    return null;
  }

  return inquiry;
};

/**
 * Search inquiries
 */
inquirySchema.statics.searchInquiries = async function(query, filters = {}) {
  const {
    userId = null,
    supplierId = null,
    status = null,
    priority = null,
    fromDate = null,
    toDate = null,
    page = 1,
    limit = 20,
  } = filters;

  const match = {};

  if (userId) match.userId = new mongoose.Types.ObjectId(userId);
  if (supplierId) match.supplierId = new mongoose.Types.ObjectId(supplierId);
  if (status) match.status = status;
  if (priority) match.priority = priority;
  
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  }

  // Text search
  const searchStage = query ? {
    $match: {
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { message: { $regex: query, $options: 'i' } },
        { 'materialId.name': { $regex: query, $options: 'i' } },
        { 'userId.username': { $regex: query, $options: 'i' } },
        { 'supplierId.username': { $regex: query, $options: 'i' } },
      ],
    },
  } : { $match: {} };

  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'materials',
        localField: 'materialId',
        foreignField: '_id',
        as: 'material',
      },
    },
    { $unwind: { path: '$material', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'supplierId',
        foreignField: '_id',
        as: 'supplier',
      },
    },
    { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
    searchStage,
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        subject: 1,
        quantity: 1,
        unit: 1,
        message: 1,
        status: 1,
        priority: 1,
        createdAt: 1,
        updatedAt: 1,
        'material.name': 1,
        'material.category': 1,
        'user.username': 1,
        'user.profile.companyName': 1,
        'supplier.username': 1,
        'supplier.profile.companyName': 1,
      },
    },
  ];

  const [results, total] = await Promise.all([
    this.aggregate(pipeline),
    this.aggregate([...pipeline, { $count: 'total' }]),
  ]);

  return {
    inquiries: results,
    pagination: {
      page,
      limit,
      total: total[0]?.total || 0,
      pages: Math.ceil((total[0]?.total || 0) / limit),
    },
  };
};

// ============================================
// MIDDLEWARE
// ============================================

// Pre-save middleware
inquirySchema.pre('save', function(next) {
  // Set subject if not provided
  if (!this.subject && this.materialId) {
    // Will be set after population in post-save
    this.subject = 'Inquiry for Material';
  }

  // Ensure priority is set
  if (!this.priority) {
    this.priority = 'medium';
  }

  // Set expiresAt if not set
  if (!this.expiresAt) {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    this.expiresAt = date;
  }

  // Check for expiry
  if (this.expiresAt && new Date() > this.expiresAt && this.status === 'pending') {
    this.status = 'expired';
  }

  next();
});

// Post-save middleware
inquirySchema.post('save', async function(doc) {
  // Update user's saved suppliers count (optional)
  // This can be used for analytics or notifications
});

// ============================================
// TRANSFORM TO JSON
// ============================================

inquirySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  },
});

// ============================================
// CREATE MODEL
// ============================================

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;