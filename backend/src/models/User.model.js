const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.CONTRACTOR
  },
  profile: {
    companyName: {
      type: String,
      trim: true
    },
    gstNumber: {
      type: String,
      uppercase: true,
      validate: {
        validator: function(v) {
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: props => `${props.value} is not a valid GST number!`
      }
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[0-9]{10}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    avatar: String,
    website: String,
    description: String,
    businessLicense: String,
    verified: {
      type: Boolean,
      default: false
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    savedSuppliers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    recentSearches: [String],
    defaultLocation: {
      city: String,
      state: String
    },
    priceAlerts: [{
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material'
      },
      targetPrice: Number,
      isActive: {
        type: Boolean,
        default: true
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  tokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  refreshToken: String
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'profile.phone': 1 });
userSchema.index({ 'profile.location.coordinates': '2dsphere' });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tokens;
  delete obj.refreshToken;
  return obj;
};

// Static methods
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email });
  if (!user) {
    throw new Error('Invalid login credentials');
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }
  return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;