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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const healthHandler = (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
};

app.get(['/health', '/api/health'], healthHandler);
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint is working!' });
});
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', async (req, res, next) => {
  if (req.method === 'OPTIONS' || ['/test', '/health'].includes(req.path)) {
    return next();
  }

  try {
    await connectDatabase();
    return next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Check the backend MongoDB configuration.',
    });
  }
});

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
      dashboard: '/api/dashboard',
    },
  });
});

app.get('/api/materials', async (req, res, next) => {
  try {
    const query = { isActive: true };
    const { search, category } = req.query;

    if (search) query.name = { $regex: String(search), $options: 'i' };
    if (category && category !== 'All') {
      query.category = String(category).toLowerCase();
    }

    const items = await Material.find(query).sort({ name: 1 }).lean();
    const materials = await Promise.all(items.map(async (item) => {
      const latestPrice = await Price.findOne({
        materialId: item._id,
        isActive: true,
      })
        .sort({ lastUpdated: -1 })
        .lean();

      return {
        ...item,
        id: item._id,
        price: latestPrice?.price || 0,
        suppliers: latestPrice ? 1 : 0,
        trend: 0,
        icon: '◆',
      };
    }));

    return res.json({
      success: true,
      data: { materials, total: materials.length },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/materials/:id', async (req, res, next) => {
  try {
    const materialId = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(materialId)
      ? { _id: materialId }
      : { category: materialId.toLowerCase() };
    const material = await Material.findOne(query).lean();

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    return res.json({
      success: true,
      data: { material: { ...material, id: material._id } },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/suppliers', async (req, res, next) => {
  try {
    const query = { role: 'supplier', isActive: true };
    if (req.query.search) {
      const search = String(req.query.search);
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { 'profile.companyName': { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await User.find(query)
      .select('-password -refreshToken')
      .lean();
    const results = suppliers.map((supplier) => ({
      id: supplier._id,
      name: supplier.profile?.companyName || supplier.username,
      city: supplier.profile?.address?.city || '',
      rating: supplier.profile?.rating || 0,
      verified: supplier.profile?.verified || false,
      delivery: 'Contact supplier',
      materials: 0,
    }));

    return res.json({
      success: true,
      data: { suppliers: results, total: results.length },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/suppliers/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier id' });
    }

    const supplier = await User.findOne({
      _id: req.params.id,
      role: 'supplier',
      isActive: true,
    })
      .select('-password -refreshToken')
      .lean();

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    return res.json({
      success: true,
      data: {
        supplier: {
          id: supplier._id,
          name: supplier.profile?.companyName || supplier.username,
          city: supplier.profile?.address?.city || '',
          rating: supplier.profile?.rating || 0,
          verified: supplier.profile?.verified || false,
          delivery: 'Contact supplier',
          materials: 0,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/prices', async (req, res, next) => {
  try {
    const query = { isActive: true };
    if (req.query.materialId) query.materialId = req.query.materialId;
    if (req.query.city) query['location.city'] = req.query.city;
    if (req.query.state) query['location.state'] = req.query.state;

    const prices = await Price.find(query)
      .populate('materialId', 'name category unit')
      .populate('supplierId', 'username profile.companyName profile.rating profile.verified')
      .sort({ price: 1 })
      .lean();

    return res.json({
      success: true,
      data: { prices, total: prices.length },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/prices/compare', async (req, res, next) => {
  try {
    const materialId = String(req.query.materialId || 'cement');
    const materialQuery = mongoose.Types.ObjectId.isValid(materialId)
      ? { _id: materialId }
      : { category: materialId.toLowerCase() };
    const material = await Material.findOne(materialQuery).lean();

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const prices = await Price.find({
      materialId: material._id,
      isActive: true,
    })
      .populate('supplierId', 'username profile')
      .sort({ price: 1 })
      .lean();
    const quotes = prices.map((price) => ({
      id: price._id,
      supplierId: price.supplierId?._id,
      supplier: price.supplierId?.profile?.companyName
        || price.supplierId?.username
        || 'Supplier',
      location: price.location?.city || '',
      price: price.price,
      lead: 'Contact supplier',
      verified: price.supplierId?.profile?.verified || false,
    }));

    return res.json({
      success: true,
      data: {
        material: { ...material, id: material._id },
        quotes,
        trend: 0,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const [materials, suppliers, prices] = await Promise.all([
      Material.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'supplier', isActive: true }),
      Price.countDocuments({ isActive: true }),
    ]);

    return res.json({
      success: true,
      data: {
        stats: { materials, suppliers, prices },
        recent: [],
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/inquiries', require('./routes/inquiry.routes'));
app.use('/api/suppliers', require('./routes/supplier.routes'));
app.use('/api/comparison', require('./routes/comparison.routes'));
app.use('/api/favorites', require('./routes/favorite.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

app.use(errorHandler);

module.exports = app;
