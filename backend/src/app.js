const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectDatabase } = require('./config/database');
const User = require('./models/User.model');
const Material = require('./models/Material.model');
const Price = require('./models/Price.model');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CORS CONFIGURATION - SINGLE SOURCE OF TRUTH
// ============================================
const allowedOrigins = [
  'https://construction-material-price-compari-six.vercel.app',
  'https://construction-material-price-comparison-portal-axsw-6l3wgywzw.vercel.app',
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
].filter(Boolean).flatMap((value) => 
  value.split(',').map((origin) => origin.trim())
);

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked CORS origin:', origin);
      console.log('Allowed origins:', uniqueOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization', 'X-Refresh-Token', 'X-Total-Count'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

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
      error: error.message
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
app.get('/api/dashboard', async (req, res, next) => {
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

// Inquiries endpoint
app.post('/api/inquiries', (req, res) => {
  const { material, quantity, notes } = req.body;
  if (!material || !quantity) {
    return res.status(400).json({
      success: false,
      message: 'Material and quantity are required'
    });
  }
  
  res.status(201).json({
    success: true,
    data: {
      inquiry: {
        id: `inquiry-${Date.now()}`,
        material,
        quantity,
        notes,
        status: 'sent'
      }
    }
  });
});

// Auth routes (if they exist)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
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

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server function
async function startServer() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 Construction Material Portal API');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'}`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`📡 API: http://localhost:${PORT}/api/test`);
    console.log('═══════════════════════════════════════════════════');
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;