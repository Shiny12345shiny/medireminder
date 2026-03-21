const express = require('express');
const {
  bookAppointment,
  getAppointments,
  getUpcomingAppointments,
  getAppointment,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  rescheduleAppointment,
  addPrescription,
  rateAppointment,
  addNotes
} = require('../controllers/consultationController');
const { protect, authorize } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Validation rules
const bookAppointmentValidation = [
  body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
  body('appointmentDate').isISO8601().withMessage('Invalid appointment date'),
  body('appointmentTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:MM'),
  body('consultationType')
    .isIn(['video', 'audio', 'chat', 'in-person'])
    .withMessage('Invalid consultation type'),
  body('reason').trim().notEmpty().withMessage('Reason for consultation is required'),
  body('symptoms').optional().isArray(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  validate
];

const confirmAppointmentValidation = [
  validate
];

const startAppointmentValidation = [
  body('roomId').optional().isString(),
  validate
];

const completeAppointmentValidation = [
  body('diagnosis').optional().trim(),
  body('prescriptionData').optional().isObject(),
  body('notes').optional().trim(),
  validate
];

const cancelAppointmentValidation = [
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required'),
  validate
];

const rescheduleValidation = [
  body('newDate').isISO8601().withMessage('Invalid new date'),
  body('newTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:MM'),
  body('reason').optional().trim(),
  validate
];

const prescriptionValidation = [
  body('medicines').optional().isArray(),
  body('tests').optional().isArray(),
  body('diagnosis').optional().trim(),
  body('notes').optional().trim(),
  validate
];

const rateAppointmentValidation = [
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('review').optional().trim(),
  validate
];

const notesValidation = [
  body('notes').trim().notEmpty().withMessage('Notes cannot be empty'),
  validate
];

// Routes
router.post('/book', protect, bookAppointmentValidation, bookAppointment);

router.get('/', protect, getAppointments);
router.get('/upcoming', protect, getUpcomingAppointments);

router.route('/:id')
  .get(protect, getAppointment);

router.put(
  '/:id/confirm',
  protect,
  authorize('doctor'),
  confirmAppointmentValidation,
  confirmAppointment
);

router.put(
  '/:id/start',
  protect,
  authorize('doctor'),
  startAppointmentValidation,
  startAppointment
);

router.put(
  '/:id/complete',
  protect,
  authorize('doctor'),
  completeAppointmentValidation,
  completeAppointment
);

router.put(
  '/:id/cancel',
  protect,
  cancelAppointmentValidation,
  cancelAppointment
);

router.put(
  '/:id/reschedule',
  protect,
  rescheduleValidation,
  rescheduleAppointment
);

router.post(
  '/:id/prescription',
  protect,
  authorize('doctor'),
  prescriptionValidation,
  addPrescription
);

router.post(
  '/:id/rate',
  protect,
  authorize('patient'),
  rateAppointmentValidation,
  rateAppointment
);

router.post(
  '/:id/notes',
  protect,
  notesValidation,
  addNotes
);

module.exports = router;