const express = require('express');
const {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  pauseSchedule,
  resumeSchedule,
  refillStock,
  addSkipDate,
  getAdherenceStats,
  getLowStockSchedules,
  getTodaySchedules,
  uploadMedicineImage
} = require('../controllers/scheduleController');
const { protect } = require('../middlewares/auth');
const { uploadSingle } = require('../middlewares/upload');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Validation rules
const createScheduleValidation = [
  body('medicineName').trim().notEmpty().withMessage('Medicine name is required'),
  body('medicineType')
    .optional()
    .isIn(['tablet', 'capsule', 'syrup', 'injection', 'drops', 'inhaler', 'ointment', 'other'])
    .withMessage('Invalid medicine type'),
  body('dosage.amount')
    .isFloat({ min: 0 })
    .withMessage('Dosage amount must be a positive number'),
  body('dosage.unit').notEmpty().withMessage('Dosage unit is required'),
  body('frequency')
    .isIn(['once-daily', 'twice-daily', 'thrice-daily', 'four-times-daily', 'every-n-hours', 'as-needed', 'weekly', 'custom'])
    .withMessage('Invalid frequency'),
  body('timings').isArray({ min: 1 }).withMessage('At least one timing is required'),
  body('timings.*.time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:MM'),
  body('duration.startDate')
    .isISO8601()
    .withMessage('Invalid start date'),
  body('stock.totalQuantity')
    .isFloat({ min: 0 })
    .withMessage('Stock quantity must be a positive number'),
  validate
];

const updateScheduleValidation = [
  body('medicineName').optional().trim().notEmpty().withMessage('Medicine name cannot be empty'),
  body('dosage.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Dosage amount must be a positive number'),
  body('timings')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one timing is required'),
  validate
];

const refillStockValidation = [
  body('quantity')
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be a positive number'),
  validate
];

const skipDateValidation = [
  body('date').isISO8601().withMessage('Invalid date format'),
  body('reason').optional().trim(),
  validate
];

const pauseScheduleValidation = [
  body('pauseUntil').optional().isISO8601().withMessage('Invalid date format'),
  validate
];

// Routes
router.route('/')
  .get(protect, getSchedules)
  .post(protect, createScheduleValidation, createSchedule);

router.get('/low-stock', protect, getLowStockSchedules);
router.get('/today', protect, getTodaySchedules);

router.route('/:id')
  .get(protect, getSchedule)
  .put(protect, updateScheduleValidation, updateSchedule)
  .delete(protect, deleteSchedule);

router.put('/:id/pause', protect, pauseScheduleValidation, pauseSchedule);
router.put('/:id/resume', protect, resumeSchedule);
router.put('/:id/refill', protect, refillStockValidation, refillStock);
router.post('/:id/skip-date', protect, skipDateValidation, addSkipDate);
router.get('/:id/adherence', protect, getAdherenceStats);
router.post(
  '/:id/image',
  protect,
  uploadSingle('medicineImage'),
  uploadMedicineImage
);

module.exports = router;