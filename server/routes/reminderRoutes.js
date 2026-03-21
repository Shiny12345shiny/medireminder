const express = require('express');
const {
  getReminders,
  getUpcomingReminders,
  getTodayReminders,
  getReminder,
  confirmMedicineTaken,
  snoozeReminder,
  skipReminder,
  reportSideEffect,
  getAdherenceStatistics,
  getReminderHistory,
  deleteReminder
} = require('../controllers/reminderController');
const { protect } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Validation rules
const confirmTakenValidation = [
  body('notes').optional().trim(),
  body('photoProof').optional().isString(),
  body('location').optional().isObject(),
  body('effectivenessRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Effectiveness rating must be between 1 and 5'),
  body('moodAfterTaking')
    .optional()
    .isIn(['very-bad', 'bad', 'neutral', 'good', 'very-good'])
    .withMessage('Invalid mood value'),
  validate
];

const snoozeValidation = [
  body('minutes')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Snooze duration must be between 1 and 120 minutes'),
  validate
];

const skipValidation = [
  body('reason').optional().trim(),
  validate
];

const sideEffectValidation = [
  body('effect').trim().notEmpty().withMessage('Side effect description is required'),
  body('severity')
    .optional()
    .isIn(['mild', 'moderate', 'severe'])
    .withMessage('Invalid severity level'),
  validate
];

// Routes
router.get('/', protect, getReminders);
router.get('/upcoming', protect, getUpcomingReminders);
router.get('/today', protect, getTodayReminders);
router.get('/stats/adherence', protect, getAdherenceStatistics);
router.get('/history', protect, getReminderHistory);

router.route('/:id')
  .get(protect, getReminder)
  .delete(protect, deleteReminder);

router.post('/:id/confirm', protect, confirmTakenValidation, confirmMedicineTaken);
router.post('/:id/snooze', protect, snoozeValidation, snoozeReminder);
router.post('/:id/skip', protect, skipValidation, skipReminder);
router.post('/:id/side-effect', protect, sideEffectValidation, reportSideEffect);

module.exports = router;