require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { initializeSocketIO } = require('./services/socketService');
const { startCronJobs } = require('./cron/reminderCron');
const http = require('http');

// Load environment variables
require('dotenv').config();

const { checkDrugApiHealth } = require('./packages/medbot');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(server);

// Make io accessible to our router
app.set('socketio', io);

// Start server
const PORT = process.env.PORT || 5000;
const SOCKET_PORT = process.env.SOCKET_PORT || 5001;

const mainServer = server.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📱 API available at http://localhost:${PORT}/api`);
  logger.info(`🔌 Socket.IO running on port ${SOCKET_PORT}`);
  
  // Start cron jobs for reminders
  startCronJobs();
  logger.info('⏰ Cron jobs started for medication reminders');

  // Check Drug API health
  checkDrugApiHealth().then(health => {
    if (health.healthy) {
      logger.info(`💊 Drug API healthy — ${health.medicinesLoaded} medicines loaded`);
    } else {
      logger.warn('⚠️  Drug API not reachable. Start FastAPI server for drug features.');
    }
  });
  
});

// Socket.IO server on separate port (optional, can use same port)
if (SOCKET_PORT !== PORT) {
  const socketServer = http.createServer();
  const socketIO = initializeSocketIO(socketServer);
  app.set('socketio', socketIO);
  
  socketServer.listen(SOCKET_PORT, () => {
    logger.info(`🔌 Socket.IO server listening on port ${SOCKET_PORT}`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  mainServer.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  mainServer.close(() => {
    logger.info('💥 Process terminated!');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT RECEIVED. Shutting down gracefully');
  mainServer.close(() => {
    logger.info('💥 Process terminated!');
    process.exit(0);
  });
});

module.exports = { server, io };