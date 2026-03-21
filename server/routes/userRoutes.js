const express = require('express');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  addPushToken,
  removePushToken,
  uploadProfilePicture,
  logoutUser,
  deleteAccount
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { uploadSingle } = require('../middlewares/upload');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['patient', 'doctor'])
    .withMessage('Invalid role'),
  validate
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  validate
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  validate
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validate
];

const pushTokenValidation = [
  body('token').notEmpty().withMessage('Push token is required'),
  body('device').notEmpty().withMessage('Device name is required'),
  body('platform')
    .isIn(['ios', 'android', 'web'])
    .withMessage('Invalid platform'),
  validate
];

// Public routes
router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, updatePasswordValidation, updatePassword);
router.post('/push-token', protect, pushTokenValidation, addPushToken);
router.delete('/push-token', protect, removePushToken);
router.post(
  '/profile-picture',
  protect,
  uploadSingle('profilePicture'),
  uploadProfilePicture
);
router.post('/logout', protect, logoutUser);
router.delete('/account', protect, deleteAccount);

module.exports = router;