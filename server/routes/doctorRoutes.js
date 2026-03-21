const express = require('express');
const {
  getDoctors,
  getDoctor,
  getNearbyDoctors,
  getDoctorAvailability,
  getDoctorStats,
  getDoctorReviews,
  getSpecializations,
  updateDoctorProfile
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middlewares/auth');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Validation rules
const nearbyDoctorsValidation = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 km'),
  validate
];

const availabilityValidation = [
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  validate
];

// Public routes
router.get('/', getDoctors);
router.get('/specializations', getSpecializations);
router.get('/nearby', nearbyDoctorsValidation, getNearbyDoctors);
router.get('/:id', getDoctor);
router.get('/:id/availability', availabilityValidation, getDoctorAvailability);
router.get('/:id/reviews', getDoctorReviews);

// Protected routes
router.get('/:id/stats', protect, getDoctorStats);
router.put('/profile', protect, authorize('doctor'), updateDoctorProfile);

module.exports = router;