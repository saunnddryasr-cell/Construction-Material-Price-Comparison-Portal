const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ['supplier', 'material'], required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  metadata: {
    notes: String,
    userRating: Number,
    tags: [String],
    targetPrice: Number,
  },
  notifications: {
    priceAlerts: { type: Boolean, default: false },
    availabilityAlerts: { type: Boolean, default: false },
    promotionalAlerts: { type: Boolean, default: false },
  },
  priority: { type: Number, default: 3, min: 1, max: 5 },
  lastInteraction: { type: Date, default: Date.now },
}, { timestamps: true });

favoriteSchema.index({ userId: 1, targetId: 1, type: 1 }, { unique: true });
favoriteSchema.statics.getFavoritesForUser = function(userId, type) {
  return this.find({ userId, isActive: true, ...(type ? { type } : {}) }).sort({ priority: -1, updatedAt: -1 }).lean();
};
favoriteSchema.statics.getFavoriteCount = function(targetId, type) {
  return this.countDocuments({ targetId, type, isActive: true });
};
favoriteSchema.statics.isFavorited = function(userId, targetId, type) {
  return this.exists({ userId, targetId, type, isActive: true });
};
favoriteSchema.statics.getTopFavorites = function(userId, limit = 10) {
  return this.find({ userId, isActive: true }).sort({ priority: -1, updatedAt: -1 }).limit(limit).lean();
};
favoriteSchema.statics.getFavoritesByTags = function(userId, tags) {
  return this.find({ userId, isActive: true, 'metadata.tags': { $in: tags } }).lean();
};
favoriteSchema.statics.getUserTags = async function(userId) {
  return this.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } }, { $unwind: '$metadata.tags' }, { $group: { _id: '$metadata.tags' } }, { $project: { _id: 0, tag: '$_id' } }]);
};
favoriteSchema.statics.getFavoritesWithPriceAlerts = function(userId) {
  return this.find({ userId, isActive: true, 'notifications.priceAlerts': true }).lean();
};
favoriteSchema.statics.bulkAdd = async function(userId, items) {
  return this.insertMany(items.map((item) => ({ ...item, userId })), { ordered: false });
};
favoriteSchema.methods.updateInteraction = function() {
  this.lastInteraction = new Date();
  return this.save();
};

module.exports = mongoose.model('Favorite', favoriteSchema);
