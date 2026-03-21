const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail } = require('../utils/emailService');
const crypto = require('crypto');

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, dateOfBirth, gender } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'patient',
    phone,
    dateOfBirth,
    gender
  });

  if (user) {
    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user);

    // Send verification email
    if (process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
      await sendVerificationEmail(user, verificationToken);
    }

    logger.logAuth('register', user._id, { email, role: user.role });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: user.generateAuthToken()
      },
      message: 'User registered successfully'
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    res.status(403);
    throw new Error('Your account has been deactivated. Please contact support.');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  logger.logAuth('login', user._id, { email });

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      token: user.generateAuthToken(),
      refreshToken: user.generateRefreshToken()
    },
    message: 'Login successful'
  });
});

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Update fields
  user.name = req.body.name || user.name;
  user.phone = req.body.phone || user.phone;
  user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;
  user.gender = req.body.gender || user.gender;
  user.address = req.body.address || user.address;
  user.timezone = req.body.timezone || user.timezone;

  // Patient specific fields
  if (user.role === 'patient') {
    if (req.body.bloodGroup) user.bloodGroup = req.body.bloodGroup;
    if (req.body.allergies) user.allergies = req.body.allergies;
    if (req.body.emergencyContact) user.emergencyContact = req.body.emergencyContact;
    if (req.body.medicalHistory) user.medicalHistory = req.body.medicalHistory;
  }

  // Doctor specific fields
  if (user.role === 'doctor') {
    if (req.body.specialization) user.specialization = req.body.specialization;
    if (req.body.licenseNumber) user.licenseNumber = req.body.licenseNumber;
    if (req.body.experience) user.experience = req.body.experience;
    if (req.body.qualifications) user.qualifications = req.body.qualifications;
    if (req.body.consultationFee) user.consultationFee = req.body.consultationFee;
    if (req.body.availableHours) user.availableHours = req.body.availableHours;
    if (req.body.clinicAddress) user.clinicAddress = req.body.clinicAddress;
  }

  // Notification preferences
  if (req.body.notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...req.body.notificationPreferences
    };
  }

  const updatedUser = await user.save();

  logger.info(`User profile updated: ${user._id}`);

  res.json({
    success: true,
    data: updatedUser,
    message: 'Profile updated successfully'
  });
});

// @desc    Update password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.logAuth('password-change', user._id);

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Forgot password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('No user found with this email');
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Send reset email
  await sendPasswordResetEmail(user, resetToken);

  logger.logAuth('forgot-password', user._id, { email });

  res.json({
    success: true,
    message: 'Password reset email sent. Please check your email.'
  });
});

// @desc    Reset password
// @route   PUT /api/users/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  logger.logAuth('reset-password', user._id);

  res.json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.',
    data: {
      token: user.generateAuthToken()
    }
  });
});

// @desc    Verify email
// @route   GET /api/users/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash token
  const verificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    verificationToken,
    verificationTokenExpire: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification token');
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpire = undefined;
  await user.save();

  logger.logAuth('email-verified', user._id);

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

// @desc    Add push token
// @route   POST /api/users/push-token
// @access  Private
const addPushToken = asyncHandler(async (req, res) => {
  const { token, device, platform } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.addPushToken(token, device, platform);

  logger.info(`Push token added for user ${user._id}`);

  res.json({
    success: true,
    message: 'Push token added successfully'
  });
});

// @desc    Remove push token
// @route   DELETE /api/users/push-token
// @access  Private
const removePushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.removePushToken(token);

  logger.info(`Push token removed for user ${user._id}`);

  res.json({
    success: true,
    message: 'Push token removed successfully'
  });
});

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image file');
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Delete old profile picture if exists
  if (user.profilePicture) {
    const { deleteFile } = require('../middlewares/upload');
    await deleteFile(user.profilePicture);
  }

  // Update profile picture
  user.profilePicture = req.file.path;
  await user.save();

  logger.info(`Profile picture uploaded for user ${user._id}`);

  res.json({
    success: true,
    data: {
      profilePicture: user.profilePicture
    },
    message: 'Profile picture uploaded successfully'
  });
});

// @desc    Logout user (clear push tokens)
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (token) {
    const user = await User.findById(req.user._id);
    if (user) {
      await user.removePushToken(token);
    }
  }

  logger.logAuth('logout', req.user._id);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Soft delete - deactivate account
  user.isActive = false;
  await user.save();

  logger.logAuth('account-deleted', user._id);

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
});

module.exports = {
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
};