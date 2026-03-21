const express = require('express');
const { protect } = require('../middlewares/auth');
const { sendTestEmail } = require('../utils/emailService');
const { sendPushNotification } = require('../utils/pushNotificationService');
const asyncHandler = require('express-async-handler');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Validation rules
const testEmailValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  validate
];

const testPushValidation = [
  body('token').notEmpty().withMessage('Push token is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('body').trim().notEmpty().withMessage('Body is required'),
  validate
];

// @desc    Send test email
// @route   POST /api/notifications/test-email
// @access  Private
const sendTestEmailNotification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await sendTestEmail(email);

  if (result.success) {
    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } else {
    res.status(500);
    throw new Error('Failed to send test email');
  }
});

// @desc    Send test push notification
// @route   POST /api/notifications/test-push
// @access  Private
const sendTestPushNotification = asyncHandler(async (req, res) => {
  const { token, title, body } = req.body;

  const result = await sendPushNotification(token, title, body, {
    type: 'test'
  });

  if (result.success) {
    res.json({
      success: true,
      message: 'Test push notification sent successfully',
      data: result
    });
  } else {
    res.status(500);
    throw new Error(result.error || 'Failed to send test push notification');
  }
});

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
const getNotificationPreferences = asyncHandler(async (req, res) => {
  const preferences = req.user.notificationPreferences || {
    email: true,
    push: true,
    sms: false,
    reminderAdvanceTime: 15
  };

  res.json({
    success: true,
    data: preferences
  });
});

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { email, push, sms, reminderAdvanceTime } = req.body;

  const user = req.user;

  if (!user.notificationPreferences) {
    user.notificationPreferences = {};
  }

  if (email !== undefined) user.notificationPreferences.email = email;
  if (push !== undefined) user.notificationPreferences.push = push;
  if (sms !== undefined) user.notificationPreferences.sms = sms;
  if (reminderAdvanceTime !== undefined) {
    user.notificationPreferences.reminderAdvanceTime = reminderAdvanceTime;
  }

  await user.save();

  res.json({
    success: true,
    data: user.notificationPreferences,
    message: 'Notification preferences updated successfully'
  });
});

// Routes
router.post('/test-email', protect, testEmailValidation, sendTestEmailNotification);
router.post('/test-push', protect, testPushValidation, sendTestPushNotification);
router.get('/preferences', protect, getNotificationPreferences);
router.put('/preferences', protect, updateNotificationPreferences);

module.exports = router;