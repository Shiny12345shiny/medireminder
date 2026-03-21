const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      compressors: ['zlib'],
      retryWrites: true,
      w: 'majority'
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database Name: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error.message);
    
    // Retry connection after 5 seconds
    logger.info('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Function to check database connection status
const checkDBConnection = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return {
    status: states[state],
    isConnected: state === 1
  };
};

// Function to get database stats
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      dataSize: (stats.dataSize / (1024 * 1024)).toFixed(2) + ' MB',
      storageSize: (stats.storageSize / (1024 * 1024)).toFixed(2) + ' MB',
      indexes: stats.indexes,
      indexSize: (stats.indexSize / (1024 * 1024)).toFixed(2) + ' MB',
      objects: stats.objects
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return null;
  }
};

module.exports = connectDB;
module.exports.checkDBConnection = checkDBConnection;
module.exports.getDBStats = getDBStats;