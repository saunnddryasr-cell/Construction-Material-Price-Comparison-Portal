require('dotenv').config();

const app = require('./app');
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('Failed to start the API server:', error.message);
  process.exitCode = 1;
});

module.exports = app;
