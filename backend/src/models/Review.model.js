const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    maxlength: 100,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  pros: [String],
  cons: [String],
  images: [String],
  verified: {
    type: Boolean,
    default: false,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
  helpfulVotes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isHelpful: Boolean,
  }],
}, {
  timestamps: true,
});

// Indexes
reviewSchema.index({ supplierId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ helpfulCount: -1 });

// Static methods
reviewSchema.statics.getAverageRating = async function(supplierId) {
  const result = await this.aggregate([
    { $match: { supplierId: new mongoose.Types.ObjectId(supplierId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { avgRating: 0, totalReviews: 0 };
};

reviewSchema.statics.getRecentReviews = async function(supplierId, limit = 5) {
  return this.find({ supplierId })
    .populate('userId', 'username profile.avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;