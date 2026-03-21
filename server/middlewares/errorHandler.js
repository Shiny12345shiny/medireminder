const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user._id : 'Not authenticated'
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = {
      message: messages.join(', '),
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token. Please log in again.',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Your token has expired. Please log in again.',
      statusCode: 401
    };
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = {
        message: 'File size too large. Maximum size is 10MB.',
        statusCode: 400
      };
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error = {
        message: 'Too many files. Maximum is 5 files.',
        statusCode: 400
      };
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = {
        message: 'Unexpected field in file upload.',
        statusCode: 400
      };
    } else {
      error = {
        message: 'File upload error. Please try again.',
        statusCode: 400
      };
    }
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    error = {
      message: 'Database connection error. Please try again later.',
      statusCode: 503
    };
  }

  // Syntax errors in JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = {
      message: 'Invalid JSON format in request body.',
      statusCode: 400
    };
  }

  // Rate limit errors
  if (err.message && err.message.includes('Too many')) {
    error = {
      message: err.message,
      statusCode: 429
    };
  }

  // Custom application errors (thrown with res.status().throw())
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : error.statusCode || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err
    })
  });
};

module.exports = errorHandler;