const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const logger = require('../utils/logger');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    res.status(401);
    throw new Error('Not authorized to access this route. No token provided.');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized. User not found.');
    }

    // Check if user is active
    if (!req.user.isActive) {
      res.status(403);
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    // Update last login
    req.user.lastLogin = new Date();
    await req.user.save({ validateBeforeSave: false });

    next();
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401);
      throw new Error('Not authorized. Invalid token.');
    }
    
    if (error.name === 'TokenExpiredError') {
      res.status(401);
      throw new Error('Not authorized. Token expired.');
    }
    
    res.status(401);
    throw new Error('Not authorized to access this route.');
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized to access this route.');
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `User role '${req.user.role}' is not authorized to access this route. Required roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

// Optional authentication - attach user if token is valid, but don't fail if not
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token is invalid, but we don't throw error for optional auth
      logger.warn('Optional auth - invalid token:', error.message);
    }
  }

  next();
});

// Verify user owns resource or is admin
const verifyOwnership = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized to access this route.');
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if the resource belongs to the user
    const resource = req.resource; // This should be set by the controller

    if (!resource) {
      res.status(404);
      throw new Error('Resource not found.');
    }

    const resourceUserId = resource[resourceUserField];

    if (!resourceUserId) {
      res.status(500);
      throw new Error('Resource user field not found.');
    }

    if (resourceUserId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this resource.');
    }

    next();
  };
};

// Verify email is verified
const verifyEmail = (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized to access this route.');
  }

  if (!req.user.isVerified) {
    res.status(403);
    throw new Error('Please verify your email to access this resource.');
  }

  next();
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const identifier = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();

    if (!attempts.has(identifier)) {
      attempts.set(identifier, []);
    }

    const userAttempts = attempts.get(identifier);
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(
      timestamp => now - timestamp < windowMs
    );

    if (validAttempts.length >= maxAttempts) {
      res.status(429);
      throw new Error('Too many attempts. Please try again later.');
    }

    validAttempts.push(now);
    attempts.set(identifier, validAttempts);

    // Clean up old entries periodically
    if (attempts.size > 1000) {
      for (const [key, value] of attempts.entries()) {
        if (value.every(timestamp => now - timestamp >= windowMs)) {
          attempts.delete(key);
        }
      }
    }

    next();
  };
};

// Check if user is doctor for patient
const isDoctorForPatient = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized to access this route.');
  }

  // Admin can access
  if (req.user.role === 'admin') {
    return next();
  }

  // Doctor role required
  if (req.user.role !== 'doctor') {
    res.status(403);
    throw new Error('Only doctors can access this resource.');
  }

  const patientId = req.params.patientId || req.body.patientId || req.params.userId;

  if (!patientId) {
    res.status(400);
    throw new Error('Patient ID is required.');
  }

  // Check if doctor has appointment with patient
  const Appointment = require('../models/Appointment');
  const hasAppointment = await Appointment.findOne({
    doctor: req.user._id,
    patient: patientId,
    status: { $in: ['scheduled', 'confirmed', 'completed', 'in-progress'] }
  });

  if (!hasAppointment) {
    res.status(403);
    throw new Error('You are not authorized to access this patient\'s information.');
  }

  next();
});

// Check if user is patient for doctor
const isPatientForDoctor = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized to access this route.');
  }

  // Admin can access
  if (req.user.role === 'admin') {
    return next();
  }

  // Patient role required
  if (req.user.role !== 'patient') {
    res.status(403);
    throw new Error('Only patients can access this resource.');
  }

  const doctorId = req.params.doctorId || req.body.doctorId;

  if (!doctorId) {
    res.status(400);
    throw new Error('Doctor ID is required.');
  }

  // Check if patient has appointment with doctor
  const Appointment = require('../models/Appointment');
  const hasAppointment = await Appointment.findOne({
    patient: req.user._id,
    doctor: doctorId,
    status: { $in: ['scheduled', 'confirmed', 'completed', 'in-progress'] }
  });

  if (!hasAppointment) {
    res.status(403);
    throw new Error('You are not authorized to access this doctor\'s information.');
  }

  next();
});

// Verify API key for external integrations
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    res.status(401);
    throw new Error('API key is required.');
  }

  // In production, check against database of valid API keys
  const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];

  if (!validApiKeys.includes(apiKey)) {
    res.status(401);
    throw new Error('Invalid API key.');
  }

  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  verifyOwnership,
  verifyEmail,
  sensitiveOperationLimit,
  isDoctorForPatient,
  isPatientForDoctor,
  verifyApiKey
};