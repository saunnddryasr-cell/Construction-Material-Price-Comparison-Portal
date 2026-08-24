const mongoose = require('mongoose');
const { MATERIAL_CATEGORIES, MATERIAL_UNITS } = require('../utils/constants');

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
  },
  category: {
    type: String,
    enum: Object.values(MATERIAL_CATEGORIES),
    required: true,
  },
  subCategory: {
    type: String,
    trim: true,
  },
  unit: {
    type: String,
    enum: Object.values(MATERIAL_UNITS),
    required: true,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  specifications: {
    brand: String,
    grade: String,
    size: String,
    weight: Number,
    color: String,
    materialType: String,
    certifications: [String],
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    features: [String],
    technicalSpecs: mongoose.Schema.Types.Mixed,
  },
  images: [{
    url: String,
    isPrimary: {
      type: Boolean,
      default: false,
    },
    alt: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
materialSchema.index({ category: 1, subCategory: 1 });
materialSchema.index({ 'specifications.brand': 1 });
materialSchema.index({ isActive: 1 });

// Static methods
materialSchema.statics.searchMaterials = async function(query, filters = {}) {
  const searchQuery = query ? { $text: { $search: query } } : {};
  const filterQuery = {};

  if (filters.category) {
    filterQuery.category = filters.category;
  }
  if (filters.subCategory) {
    filterQuery.subCategory = filters.subCategory;
  }
  if (filters.brand) {
    filterQuery['specifications.brand'] = filters.brand;
  }
  if (filters.isActive !== undefined) {
    filterQuery.isActive = filters.isActive;
  }

  return this.find({
    ...searchQuery,
    ...filterQuery,
  })
  .sort(query ? { score: { $meta: 'textScore' } } : { name: 1 })
  .lean();
};

materialSchema.statics.getDistinctCategories = async function() {
  return this.distinct('category');
};

materialSchema.statics.getDistinctBrands = async function(category) {
  const match = category ? { category } : {};
  return this.distinct('specifications.brand', match);
};

const Material = mongoose.model('Material', materialSchema);
module.exports = Material;
