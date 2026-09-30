// backend/src/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// MONGODB CONNECTION
// ============================================
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-materials';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB error:', err.message);
    console.log('⚠️  Server will continue without database');
  }
};

connectDB();

// ============================================
// ROUTES
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Construction Material Portal API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working!' });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      stats: { savedMaterials: 0, quotesReceived: 0, averageSavings: 0 },
      recent: [],
    },
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.path });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ============================================
// START SERVER — THIS IS THE MISSING PIECE
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════════════════');
});

module.exports = app;