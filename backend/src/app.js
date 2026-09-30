const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectDatabase } = require('./config/database');
const { getCorsOptions } = require('./config/cors');
const { errorHandler } = require('./middleware/error.middleware');
const User = require('./models/User.model');
const Material = require('./models/Material.model');
const Price = require('./models/Price.model');

dotenv.config();

const app = express();
app.use(cors(getCorsOptions()));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no DB connection required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    cors: 'Enabled'
  });
});

// Database connection middleware for API routes
app.use('/api', async (req, res, next) => {
  if (req.method === 'OPTIONS' || req.path === '/test' || req.path === '/health') return next();
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

// ============================================
// API ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Construction Material Portal API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      test: '/api/test',
      materials: '/api/materials',
      suppliers: '/api/suppliers',
      compare: '/api/prices/compare',
      dashboard: '/api/dashboard'
    }
  });
});

// Materials endpoint
app.get('/api/materials', async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const query = { isActive: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category && category !== 'All') query.category = category.toLowerCase();
    
    const items = await Material.find(query).sort({ name: 1 }).lean();
    
    const result = await Promise.all(items.map(async (item) => {
      const latest = await Price.findOne({ materialId: item._id, isActive: true })
        .sort({ lastUpdated: -1 })
        .lean();
      return {
        ...item,
        id: item._id,
        price: latest?.price || 0,
        suppliers: latest ? 1 : 0,
        trend: 0,
        icon: '◆'
      };
    }));
    
    res.json({
      success: true,
      data: {
        materials: result,
        total: result.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Single material endpoint
app.get('/api/materials/:id', async (req, res) => {
  try {
    const materialQuery = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { category: req.params.id.toLowerCase() };
    
    const material = await Material.findOne(materialQuery).lean();
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        material: { ...material, id: material._id }
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid material id',
      error: error.message
    });
  }
});

// Suppliers endpoint
app.get('/api/suppliers', async (req, res, next) => {
  try {
    const query = { role: 'supplier', isActive: true };
    if (req.query.search) {
      query.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { 'profile.companyName': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password -refreshToken')
      .lean();
    
    const result = users.map((user) => ({
      id: user._id,
      name: user.profile?.companyName || user.username,
      city: user.profile?.address?.city || '',
      rating: user.profile?.rating || 0,
      verified: user.profile?.verified || false,
      delivery: 'Contact supplier',
      materials: 0
    }));
    
    res.json({
      success: true,
      data: {
        suppliers: result,
        total: result.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Single supplier endpoint
app.get('/api/suppliers/:id', async (req, res, next) => {
  try {
    const supplier = await User.findOne({
      _id: req.params.id,
      role: 'supplier',
      isActive: true
    })
    .select('-password -refreshToken')
    .lean();
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        supplier: {
          id: supplier._id,
          name: supplier.profile?.companyName || supplier.username,
          city: supplier.profile?.address?.city || '',
          rating: supplier.profile?.rating || 0,
          verified: supplier.profile?.verified || false,
          delivery: 'Contact supplier',
          materials: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Price comparison endpoint
app.get('/api/prices/compare', async (req, res, next) => {
  try {
    const materialId = req.query.materialId || 'cement';
    const materialQuery = mongoose.Types.ObjectId.isValid(materialId)
      ? { _id: materialId }
      : { category: materialId.toLowerCase() };
    
    const material = await Material.findOne(materialQuery).lean();
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    const prices = await Price.find({
      materialId: material._id,
      isActive: true
    })
    .populate('supplierId', 'username profile')
    .sort({ price: 1 })
    .lean();
    
    const quotes = prices.map((item) => ({
      id: item._id,
      supplierId: item.supplierId?._id,
      supplier: item.supplierId?.profile?.companyName || item.supplierId?.username || 'Supplier',
      location: item.location?.city || '',
      price: item.price,
      lead: 'Contact supplier',
      verified: item.supplierId?.profile?.verified || false
    }));
    
    res.json({
      success: true,
      data: {
        material: { ...material, id: material._id },
        quotes: quotes,
        trend: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard endpoint
app.get('/dashboard', async (req, res, next) => {
  try {
    const [materialCount, supplierCount, priceCount] = await Promise.all([
      Material.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'supplier', isActive: true }),
      Price.countDocuments({ isActive: true }),
    ]);
    
    res.json({
      success: true,
      data: {
        stats: {
          materials: materialCount,
          suppliers: supplierCount,
          prices: priceCount
        },
        recent: []
      }
    });
  } catch (error) {
    next(error);
  }
});

// Auth routes (if they exist)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/inquiries', require('./routes/inquiry.routes'));
app.use('/api/suppliers', require('./routes/supplier.routes'));
app.use('/api/comparison', require('./routes/comparison.routes'));
app.use('/api/favorites', require('./routes/favorite.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

app.use(errorHandler);

module.exports = app;
