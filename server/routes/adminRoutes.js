const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  toggleUserActive,
  getSystemHealth,
  getActivityLogs,
  getAnalytics,
  bulkAction
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

// Validation rules
const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('role')
    .optional()
    .isIn(['patient', 'doctor', 'admin'])
    .withMessage('Invalid role'),
  body('isActive').optional().isBoolean(),
  body('isVerified').optional().isBoolean(),
  validate
];

const bulkActionValidation = [
  body('action')
    .isIn(['activate', 'deactivate', 'delete'])
    .withMessage('Invalid action'),
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID'),
  validate
];

// Routes
router.get('/stats', getDashboardStats);
router.get('/health', getSystemHealth);
router.get('/logs', getActivityLogs);
router.get('/analytics', getAnalytics);

router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUserValidation, updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/toggle-active', toggleUserActive);

router.post('/bulk-action', bulkActionValidation, bulkAction);

module.exports = router;