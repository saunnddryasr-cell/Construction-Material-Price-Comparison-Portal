const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { connectDatabase } = require('../config/database');
const { logger } = require('../config/logger');
const materials = require('./materials.seed');

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDatabase();

    // Seed categories
    // await seedCategories();
    
    await materials();
    
    // Seed suppliers
    // await seedSuppliers();
    
    // Seed prices
    // await seedPrices();

    logger.info('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();