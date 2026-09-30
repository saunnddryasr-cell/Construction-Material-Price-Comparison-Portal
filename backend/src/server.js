require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./config/database');

const port = process.env.PORT || 5000;

c// ✅ CORRECT — works everywhere
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});


if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start the API server:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
