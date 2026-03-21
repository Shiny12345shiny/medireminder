const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Middleware to handle validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', {
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

// Custom validators
const customValidators = {
  // Validate MongoDB ObjectId
  isValidObjectId: (value) => {
    return /^[0-9a-fA-F]{24}$/.test(value);
  },

  // Validate phone number (10 digits)
  isValidPhone: (value) => {
    return /^[0-9]{10}$/.test(value);
  },

  // Validate time format (HH:MM)
  isValidTime: (value) => {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
  },

  // Validate date is in future
  isFutureDate: (value) => {
    const date = new Date(value);
    return date > new Date();
  },

  // Validate date is not too far in future (within 1 year)
  isWithinYear: (value) => {
    const date = new Date(value);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return date <= oneYearFromNow;
  },

  // Validate password strength
  isStrongPassword: (value) => {
    // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(value);
  },

  // Validate dosage amount
  isValidDosage: (value) => {
    return typeof value === 'number' && value > 0 && value <= 10000;
  },

  // Validate array is not empty
  isNonEmptyArray: (value) => {
    return Array.isArray(value) && value.length > 0;
  },

  // Validate file type
  isValidFileType: (mimetype, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) => {
    return allowedTypes.includes(mimetype);
  },

  // Validate URL
  isValidUrl: (value) => {
    try {
      new URL(value);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Validate enum value
  isInEnum: (value, enumArray) => {
    return enumArray.includes(value);
  },

  // Validate latitude
  isValidLatitude: (value) => {
    return typeof value === 'number' && value >= -90 && value <= 90;
  },

  // Validate longitude
  isValidLongitude: (value) => {
    return typeof value === 'number' && value >= -180 && value <= 180;
  },

  // Validate age (between 0 and 150)
  isValidAge: (value) => {
    return typeof value === 'number' && value >= 0 && value <= 150;
  },

  // Validate rating (1-5)
  isValidRating: (value) => {
    return typeof value === 'number' && value >= 1 && value <= 5;
  },

  // Validate blood pressure values
  isValidBloodPressure: (systolic, diastolic) => {
    return (
      typeof systolic === 'number' &&
      typeof diastolic === 'number' &&
      systolic > 0 &&
      diastolic > 0 &&
      systolic > diastolic &&
      systolic <= 300 &&
      diastolic <= 200
    );
  },

  // Validate heart rate
  isValidHeartRate: (value) => {
    return typeof value === 'number' && value >= 30 && value <= 250;
  },

  // Validate temperature (in Celsius)
  isValidTemperature: (value) => {
    return typeof value === 'number' && value >= 35 && value <= 45;
  },

  // Validate duration in minutes
  isValidDuration: (value) => {
    return typeof value === 'number' && value >= 15 && value <= 180;
  },

  // Validate timezone
  isValidTimezone: (value) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Validate consultation fee
  isValidFee: (value) => {
    return typeof value === 'number' && value >= 0 && value <= 100000;
  }
};

// Sanitizers
const sanitizers = {
  // Trim and lowercase email
  normalizeEmail: (value) => {
    return value.trim().toLowerCase();
  },

  // Trim and capitalize name
  normalizeName: (value) => {
    return value
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  // Normalize phone number (remove spaces, dashes)
  normalizePhone: (value) => {
    return value.replace(/[\s-]/g, '');
  },

  // Sanitize HTML (basic)
  sanitizeHtml: (value) => {
    return value
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/\//g, '/');
  },

  // Trim whitespace
  trimWhitespace: (value) => {
    return typeof value === 'string' ? value.trim() : value;
  },

  // Remove extra spaces
  removeExtraSpaces: (value) => {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;
  },

  // Convert to title case
  toTitleCase: (value) => {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
};

// Validation error formatter
const formatValidationErrors = (errors) => {
  const formatted = {};
  
  errors.array().forEach(err => {
    if (!formatted[err.param]) {
      formatted[err.param] = [];
    }
    formatted[err.param].push(err.msg);
  });
  
  return formatted;
};

// Async validation wrapper
const asyncValidate = (validationChain) => {
  return async (req, res, next) => {
    await Promise.all(validationChain.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Async validation failed:', {
        errors: errors.array(),
        body: req.body
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: formatValidationErrors(errors)
      });
    }
    
    next();
  };
};

module.exports = {
  validate,
  customValidators,
  sanitizers,
  formatValidationErrors,
  asyncValidate
};