require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./config/database');

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();
  return app.listen(port, () => {
    console.log(`Construction Material Portal API listening on port ${port}`);
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start the API server:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
