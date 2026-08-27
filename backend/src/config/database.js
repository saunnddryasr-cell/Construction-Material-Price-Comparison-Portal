const mongoose = require('mongoose');

let isConnected = false;

const connectDatabase = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return mongoose.connection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
    
    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoURI, options);
    
    isConnected = true;
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = { connectDatabase };