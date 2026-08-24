const mongoose = require('mongoose');

/**
 * Price Model
 * Stores material prices from different suppliers
 * Tracks price history and location-based pricing
 */

const priceSchema = new mongoose.Schema({
  // Reference to the supplier (User with role 'supplier')
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Reference to the material
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
    index: true,
  },

  // Price details
  price: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Price cannot be negative',
    },
  },

  // Unit of measurement (bag, ton, kg, piece, cubic_meter)
  unit: {
    type: String,
    required: true,
    enum: ['bag', 'ton', 'kg', 'piece', 'cubic_meter', 'cubic_feet', 'square_feet', 'meter', 'roll', 'sheet'],
    default: 'piece',
  },

  // Location information
  location: {
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^[0-9]{6}$/, 'Invalid pincode format'],
    },
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    area: {
      type: String,
      trim: true,
    },
  },

  // Stock information
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  minimumOrderQuantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  maximumOrderQuantity: {
    type: Number,
    default: null,
    min: 1,
  },

  // Delivery options
  deliveryOptions: {
    available: {
      type: Boolean,
      default: false,
    },
    charges: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeDeliveryThreshold: {
      type: Number,
      default: null,
      min: 0,
    },
    area: {
      type: String,
      trim: true,
    },
    estimatedDays: {
      type: Number,
      default: 3,
      min: 1,
    },
    deliveryTiming: {
      morning: {
        type: Boolean,
        default: true,
      },
      afternoon: {
        type: Boolean,
        default: true,
      },
      evening: {
        type: Boolean,
        default: false,
      },
    },
  },

  // Price validity
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
    default: null,
  },

  // Price history (track changes)
  priceHistory: [{
    price: {
      type: Number,
      required: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  }],

  // Status flags
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  verified: {
    type: Boolean,
    default: false,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isOnSale: {
    type: Boolean,
    default: false,
  },
  salePrice: {
    type: Number,
    default: null,
    min: 0,
  },
  saleStartDate: {
    type: Date,
    default: null,
  },
  saleEndDate: {
    type: Date,
    default: null,
  },

  // Bulk discount tiers
  bulkDiscounts: [{
    minQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    discountPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  }],

  // Supplier notes
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

}, {
  timestamps: true,
});

// ============================================
// INDEXES
// ============================================

// Compound indexes for efficient queries
priceSchema.index({ supplierId: 1, materialId: 1 });
priceSchema.index({ materialId: 1, 'location.city': 1, price: 1 });
priceSchema.index({ materialId: 1, 'location.state': 1, price: 1 });
priceSchema.index({ materialId: 1, 'location.coordinates': '2dsphere' });
priceSchema.index({ price: 1 });
priceSchema.index({ lastUpdated: -1 });
priceSchema.index({ isActive: 1, verified: 1 });

// ============================================
// VIRTUALS
// ============================================

priceSchema.virtual('currentPrice').get(function() {
  return this.isOnSale && this.salePrice ? this.salePrice : this.price;
});

priceSchema.virtual('isOnSaleNow').get(function() {
  if (!this.isOnSale || !this.salePrice) return false;
  const now = new Date();
  if (this.saleStartDate && now < this.saleStartDate) return false;
  if (this.saleEndDate && now > this.saleEndDate) return false;
  return true;
});

priceSchema.virtual('savings').get(function() {
  if (!this.isOnSaleNow) return 0;
  return this.price - this.salePrice;
});

priceSchema.virtual('savingsPercentage').get(function() {
  if (!this.isOnSaleNow || this.price === 0) return 0;
  return Math.round(((this.price - this.salePrice) / this.price) * 100);
});

priceSchema.virtual('supplier', {
  ref: 'User',
  localField: 'supplierId',
  foreignField: '_id',
  justOne: true,
});

priceSchema.virtual('material', {
  ref: 'Material',
  localField: 'materialId',
  foreignField: '_id',
  justOne: true,
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Add price to history
 */
priceSchema.methods.addPriceHistory = function(price, stockQuantity, userId, reason = null) {
  this.priceHistory.push({
    price: price || this.price,
    stockQuantity: stockQuantity || this.stockQuantity,
    timestamp: new Date(),
    changedBy: userId || null,
    reason: reason || null,
  });

  // Keep only last 100 entries
  if (this.priceHistory.length > 100) {
    this.priceHistory = this.priceHistory.slice(-100);
  }
};

/**
 * Update price with history tracking
 */
priceSchema.methods.updatePrice = async function(newPrice, userId, reason = null) {
  const oldPrice = this.price;
  const oldStock = this.stockQuantity;

  // Add to history
  this.addPriceHistory(newPrice, this.stockQuantity, userId, reason);

  // Update price
  this.price = newPrice;
  this.lastUpdated = new Date();

  await this.save();

  return {
    oldPrice,
    newPrice,
    change: newPrice - oldPrice,
    changePercent: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0,
    timestamp: new Date(),
  };
};

/**
 * Update stock quantity with history
 */
priceSchema.methods.updateStock = async function(newStock, userId, reason = null) {
  const oldStock = this.stockQuantity;

  this.stockQuantity = newStock;
  this.lastUpdated = new Date();

  // Add to history with stock update
  this.priceHistory.push({
    price: this.price,
    stockQuantity: newStock,
    timestamp: new Date(),
    changedBy: userId || null,
    reason: reason || `Stock updated from ${oldStock} to ${newStock}`,
  });

  await this.save();

  return {
    oldStock,
    newStock,
    change: newStock - oldStock,
    timestamp: new Date(),
  };
};

/**
 * Apply bulk discount
 */
priceSchema.methods.getBulkPrice = function(quantity) {
  if (!this.bulkDiscounts || this.bulkDiscounts.length === 0) {
    return this.currentPrice;
  }

  // Sort discounts by minQuantity descending
  const sortedDiscounts = [...this.bulkDiscounts].sort((a, b) => b.minQuantity - a.minQuantity);

  for (const discount of sortedDiscounts) {
    if (quantity >= discount.minQuantity) {
      return discount.discountPrice;
    }
  }

  return this.currentPrice;
};

/**
 * Get price with tax
 */
priceSchema.methods.getPriceWithTax = function(quantity = 1, taxRate = 0) {
  const unitPrice = this.getBulkPrice(quantity);
  const subtotal = unitPrice * quantity;
  const tax = subtotal * (taxRate / 100);
  return {
    unitPrice,
    quantity,
    subtotal,
    tax,
    total: subtotal + tax,
    taxRate,
  };
};

/**
 * Check if price is valid
 */
priceSchema.methods.isValid = function() {
  const now = new Date();
  if (!this.isActive) return false;
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  if (this.stockQuantity <= 0) return false;
  return true;
};

/**
 * Check if sale is active
 */
priceSchema.methods.isSaleActive = function() {
  if (!this.isOnSale || !this.salePrice) return false;
  const now = new Date();
  if (this.saleStartDate && now < this.saleStartDate) return false;
  if (this.saleEndDate && now > this.saleEndDate) return false;
  return true;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find best prices for a material
 */
priceSchema.statics.findBestPrices = async function(materialId, location, limit = 10, filters = {}) {
  const match = {
    materialId: new mongoose.Types.ObjectId(materialId),
    isActive: true,
    stockQuantity: { $gt: 0 },
  };

  if (location.city) {
    match['location.city'] = location.city;
  }
  if (location.state) {
    match['location.state'] = location.state;
  }
  if (filters.supplierId) {
    match.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
  }
  if (filters.minRating) {
    match['supplier.profile.rating'] = { $gte: filters.minRating };
  }
  if (filters.verifiedOnly) {
    match.verified = true;
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'supplierId',
        foreignField: '_id',
        as: 'supplier',
      },
    },
    { $unwind: '$supplier' },
    {
      $match: {
        'supplier.isActive': true,
        'supplier.role': 'supplier',
      },
    },
    {
      $addFields: {
        'supplier.rating': '$supplier.profile.rating',
        'supplier.companyName': '$supplier.profile.companyName',
        'supplier.verified': '$supplier.profile.verified',
        'supplier.phone': '$supplier.profile.phone',
        'effectivePrice': {
          $cond: [
            { $and: ['$isOnSale', '$salePrice'] },
            '$salePrice',
            '$price',
          ],
        },
      },
    },
    { $sort: { effectivePrice: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        price: 1,
        salePrice: 1,
        isOnSale: 1,
        effectivePrice: 1,
        unit: 1,
        stockQuantity: 1,
        minimumOrderQuantity: 1,
        lastUpdated: 1,
        location: 1,
        deliveryOptions: 1,
        supplier: {
          _id: 1,
          username: 1,
          companyName: 1,
          rating: 1,
          verified: 1,
          phone: 1,
        },
      },
    },
  ];

  return this.aggregate(pipeline);
};

/**
 * Get price statistics for a material
 */
priceSchema.statics.getPriceStatistics = async function(materialId, location) {
  const match = {
    materialId: new mongoose.Types.ObjectId(materialId),
    isActive: true,
    stockQuantity: { $gt: 0 },
  };

  if (location.city) {
    match['location.city'] = location.city;
  }
  if (location.state) {
    match['location.state'] = location.state;
  }

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        effectivePrice: {
          $cond: [
            { $and: ['$isOnSale', '$salePrice'] },
            '$salePrice',
            '$price',
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        minPrice: { $min: '$effectivePrice' },
        maxPrice: { $max: '$effectivePrice' },
        avgPrice: { $avg: '$effectivePrice' },
        medianPrice: { $median: '$effectivePrice' },
        priceRange: { $push: '$effectivePrice' },
        suppliers: { $addToSet: '$supplierId' },
      },
    },
    {
      $project: {
        _id: 0,
        count: 1,
        minPrice: { $round: ['$minPrice', 2] },
        maxPrice: { $round: ['$maxPrice', 2] },
        avgPrice: { $round: ['$avgPrice', 2] },
        medianPrice: { $round: ['$medianPrice', 2] },
        supplierCount: { $size: '$suppliers' },
        priceRange: 1,
      },
    },
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || null;
};

/**
 * Get price trends
 */
priceSchema.statics.getPriceTrends = async function(materialId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        materialId: new mongoose.Types.ObjectId(materialId),
        isActive: true,
        lastUpdated: { $gte: startDate },
      },
    },
    { $unwind: '$priceHistory' },
    {
      $match: {
        'priceHistory.timestamp': { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$priceHistory.timestamp' } },
          supplierId: '$supplierId',
        },
        avgPrice: { $avg: '$priceHistory.price' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.date',
        suppliers: {
          $push: {
            supplierId: '$_id.supplierId',
            avgPrice: '$avgPrice',
            count: '$count',
          },
        },
        overallAvg: { $avg: '$avgPrice' },
        minPrice: { $min: '$avgPrice' },
        maxPrice: { $max: '$avgPrice' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  return this.aggregate(pipeline);
};

/**
 * Get price alerts for users
 */
priceSchema.statics.getPriceAlerts = async function(userId) {
  const user = await User.findById(userId);
  if (!user || !user.preferences?.priceAlerts) return [];

  const alerts = [];
  for (const alert of user.preferences.priceAlerts) {
    if (!alert.isActive) continue;

    const price = await this.findOne({
      materialId: alert.materialId,
      isActive: true,
      stockQuantity: { $gt: 0 },
    })
    .populate('materialId', 'name category unit')
    .populate('supplierId', 'profile.companyName')
    .sort({ price: 1 });

    if (price) {
      alerts.push({
        materialId: alert.materialId,
        materialName: price.materialId?.name,
        targetPrice: alert.targetPrice,
        currentPrice: price.price,
        bestPrice: price.price,
        supplier: price.supplierId?.profile?.companyName,
        isAlertTriggered: price.price <= alert.targetPrice,
        ...price.toObject(),
      });
    }
  }

  return alerts;
};

/**
 * Bulk update prices
 */
priceSchema.statics.bulkUpdate = async function(updates) {
  const results = [];
  for (const update of updates) {
    try {
      const price = await this.findById(update.id);
      if (price) {
        price.price = update.price || price.price;
        price.stockQuantity = update.stockQuantity || price.stockQuantity;
        if (update.reason) {
          price.addPriceHistory(price.price, price.stockQuantity, update.userId, update.reason);
        }
        price.lastUpdated = new Date();
        await price.save();
        results.push({ id: update.id, success: true });
      } else {
        results.push({ id: update.id, success: false, error: 'Price not found' });
      }
    } catch (error) {
      results.push({ id: update.id, success: false, error: error.message });
    }
  }
  return results;
};

/**
 * Get nearby prices
 */
priceSchema.statics.getNearbyPrices = async function(materialId, coordinates, radius = 50) {
  return this.find({
    materialId: new mongoose.Types.ObjectId(materialId),
    isActive: true,
    stockQuantity: { $gt: 0 },
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat],
        },
        $maxDistance: radius * 1000, // Convert km to meters
      },
    },
  })
  .populate('supplierId', 'profile.companyName profile.rating profile.verified')
  .sort({ price: 1 });
};

// ============================================
// MIDDLEWARE
// ============================================

priceSchema.pre('save', function(next) {
  // Auto-add price history on initial save
  if (this.isNew) {
    this.priceHistory.push({
      price: this.price,
      stockQuantity: this.stockQuantity,
      timestamp: new Date(),
      reason: 'Initial price creation',
    });
  }

  // Validate sale dates
  if (this.isOnSale && this.salePrice) {
    if (this.saleStartDate && this.saleEndDate && this.saleStartDate > this.saleEndDate) {
      next(new Error('Sale start date must be before sale end date'));
    }
  }

  // Validate bulk discounts
  if (this.bulkDiscounts && this.bulkDiscounts.length > 0) {
    for (const discount of this.bulkDiscounts) {
      if (discount.minQuantity < 1) {
        next(new Error('Minimum quantity for bulk discount must be at least 1'));
      }
      if (discount.discountPercentage < 0 || discount.discountPercentage > 100) {
        next(new Error('Discount percentage must be between 0 and 100'));
      }
      if (discount.discountPrice < 0) {
        next(new Error('Discount price cannot be negative'));
      }
    }
  }

  next();
});

// ============================================
// TRANSFORM TO JSON
// ============================================

priceSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.priceHistory; // Can be large, exclude by default
    return ret;
  },
});

// ============================================
// CREATE MODEL
// ============================================

const Price = mongoose.model('Price', priceSchema);

module.exports = Price;