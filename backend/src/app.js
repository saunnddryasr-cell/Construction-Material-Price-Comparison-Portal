const express = require('express');
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
const createAuthToken = (user) => jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'default-jwt-secret', { expiresIn: process.env.JWT_EXPIRY || '7d' });

const materials = [
  { id: 'cement', name: 'Portland Cement', category: 'Cement', unit: '50 kg bag', price: 7.45, suppliers: 14, trend: -2.4, icon: '◒' },
  { id: 'steel', name: 'TMT Steel Bar', category: 'Steel', unit: 'per kg', price: 0.82, suppliers: 21, trend: 1.1, icon: '▦' },
  { id: 'brick', name: 'Red Clay Brick', category: 'Masonry', unit: 'per 1,000', price: 468, suppliers: 9, trend: -4.8, icon: '▤' },
  { id: 'sand', name: 'River Sand', category: 'Aggregates', unit: 'per cu. yd.', price: 34, suppliers: 11, trend: 0.6, icon: '≋' },
  { id: 'lumber', name: 'Structural Lumber', category: 'Lumber', unit: 'per board ft.', price: 2.18, suppliers: 8, trend: -3.2, icon: '▥' },
  { id: 'gravel', name: 'Crushed Gravel', category: 'Aggregates', unit: 'per cu. yd.', price: 42, suppliers: 16, trend: -1.5, icon: '◆' },
];

const suppliers = [
  { id: 'northline', name: 'Northline Materials', city: 'Austin, TX', rating: 4.8, verified: true, delivery: '2-3 days', materials: 48 },
  { id: 'civic', name: 'Civic Supply Co.', city: 'Round Rock, TX', rating: 4.7, verified: true, delivery: 'Next day', materials: 36 },
  { id: 'atlas', name: 'Atlas Build Mart', city: 'Pflugerville, TX', rating: 4.4, verified: false, delivery: '3-5 days', materials: 29 },
];

const quotes = {
  cement: [
    { id: 'quote-1', supplierId: 'northline', supplier: 'Northline Materials', location: 'Austin, TX', price: 7.45, lead: '2-3 days', verified: true },
    { id: 'quote-2', supplierId: 'civic', supplier: 'Civic Supply Co.', location: 'Round Rock, TX', price: 7.62, lead: 'Next day', verified: true },
    { id: 'quote-3', supplierId: 'atlas', supplier: 'Atlas Build Mart', location: 'Pflugerville, TX', price: 7.89, lead: '3-5 days', verified: false },
  ],
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD,
  'https://construction-material-price-compari-six.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean).flatMap((value) => value.split(',').map((origin) => origin.trim()));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
    res.header('Access-Control-Expose-Headers', 'Authorization, X-Refresh-Token, X-Total-Count');
    res.header('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serverless requests do not run startServer, so initialize MongoDB on demand.
app.use('/api', async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Construction Material Portal API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'healthy' : 'degraded',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/suppliers', require('./routes/supplier.routes'));
app.use('/api/comparison', require('./routes/comparison.routes'));
app.use('/api/favorites', require('./routes/favorite.routes'));

app.get('/api/materials', (req, res, next) => {
  const { search, category } = req.query;
  const query = { isActive: true };
  if (search) query.name = { $regex: search, $options: 'i' };
  if (category && category !== 'All') query.category = category.toLowerCase();
  Material.find(query).sort({ name: 1 }).lean()
    .then(async (items) => {
      const result = await Promise.all(items.map(async (item) => {
        const latest = await Price.findOne({ materialId: item._id, isActive: true }).sort({ lastUpdated: -1 }).lean();
        return { ...item, id: item._id, price: latest?.price || 0, suppliers: latest ? 1 : 0, trend: 0, icon: '◆' };
      }));
      res.json({ success: true, data: { materials: result, total: result.length } });
    }).catch((error) => next(error));
});

app.get('/api/materials/:id', (req, res) => {
  const materialQuery = mongoose.Types.ObjectId.isValid(req.params.id)
    ? { _id: req.params.id }
    : { category: req.params.id.toLowerCase() };
  Material.findOne(materialQuery).lean()
    .then((material) => {
      if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
      return res.json({ success: true, data: { material: { ...material, id: material._id } } });
    })
    .catch((error) => res.status(400).json({ success: false, message: 'Invalid material id', error: error.message }));
});

app.get('/api/suppliers', async (req, res, next) => {
  try {
    const query = { role: 'supplier', isActive: true };
    if (req.query.search) query.$or = [{ username: { $regex: req.query.search, $options: 'i' } }, { 'profile.companyName': { $regex: req.query.search, $options: 'i' } }];
    const users = await User.find(query).select('-password -refreshToken').lean();
    const result = users.map((user) => ({ id: user._id, name: user.profile?.companyName || user.username, city: user.profile?.address?.city || '', rating: user.profile?.rating || 0, verified: user.profile?.verified || false, delivery: 'Contact supplier', materials: 0 }));
    return res.json({ success: true, data: { suppliers: result, total: result.length } });
  } catch (error) { return next(error); }
});

app.get('/api/suppliers/:id', async (req, res, next) => {
  try {
    const supplier = await User.findOne({ _id: req.params.id, role: 'supplier', isActive: true }).select('-password -refreshToken').lean();
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    return res.json({ success: true, data: { supplier: { id: supplier._id, name: supplier.profile?.companyName || supplier.username, city: supplier.profile?.address?.city || '', rating: supplier.profile?.rating || 0, verified: supplier.profile?.verified || false, delivery: 'Contact supplier', materials: 0 } } });
  } catch (error) { return next(error); }
});

app.get('/api/prices/compare', async (req, res, next) => {
  try {
    const materialId = req.query.materialId || 'cement';
    const materialQuery = mongoose.Types.ObjectId.isValid(materialId)
      ? { _id: materialId }
      : { category: materialId.toLowerCase() };
    const material = await Material.findOne(materialQuery).lean();
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    const prices = await Price.find({ materialId: material._id, isActive: true }).populate('supplierId', 'username profile').sort({ price: 1 }).lean();
    const materialQuotes = prices.map((item) => ({ id: item._id, supplierId: item.supplierId?._id, supplier: item.supplierId?.profile?.companyName || item.supplierId?.username || 'Supplier', location: item.location?.city || '', price: item.price, lead: 'Contact supplier', verified: item.supplierId?.profile?.verified || false }));
    return res.json({ success: true, data: { material: { ...material, id: material._id }, quotes: materialQuotes, trend: 0 } });
  } catch (error) { return next(error); }
});

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const [materialCount, supplierCount, priceCount] = await Promise.all([
      Material.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'supplier', isActive: true }),
      Price.countDocuments({ isActive: true }),
    ]);
    return res.json({ success: true, data: { stats: { materials: materialCount, suppliers: supplierCount, prices: priceCount }, recent: [] } });
  } catch (error) { return next(error); }
});

app.post('/api/inquiries', (req, res) => {
  const { material, quantity, notes } = req.body;
  if (!material || !quantity) return res.status(400).json({ success: false, message: 'Material and quantity are required' });
  return res.status(201).json({ success: true, data: { inquiry: { id: `inquiry-${Date.now()}`, material, quantity, notes, status: 'sent' } } });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

async function startServer() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error(`MongoDB connection failed (${process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-materials'}): ${error.message}`);
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

if (require.main === module) startServer();

module.exports = app;
