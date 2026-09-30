const mongoose = require('mongoose');

let connectionPromise;

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
  if (!mongoURI) {
    throw new Error('MongoDB URI is not defined in environment variables');
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then(() => mongoose.connection)
      .finally(() => {
        connectionPromise = undefined;
      });
  }

  return connectionPromise;
};

module.exports = { connectDatabase };