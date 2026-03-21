const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const MedicineSchedule = require('../models/MedicineSchedule');
const Reminder = require('../models/Reminder');
const Appointment = require('../models/Appointment');
const HealthRecord = require('../models/HealthRecord');
const logger = require('../utils/logger');
const { checkDBConnection, getDBStats } = require('../config/database');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getDashboardStats = asyncHandler(async (req, res) => {
  // User statistics
  const totalUsers = await User.countDocuments();
  const totalPatients = await User.countDocuments({ role: 'patient' });
  const totalDoctors = await User.countDocuments({ role: 'doctor' });
  const activeUsers = await User.countDocuments({ isActive: true });

  // Schedule statistics
  const totalSchedules = await MedicineSchedule.countDocuments();
  const activeSchedules = await MedicineSchedule.countDocuments({ isActive: true });

  // Reminder statistics
  const totalReminders = await Reminder.countDocuments();
  const todayReminders = await Reminder.countDocuments({
    scheduledTime: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });

  // Appointment statistics
  const totalAppointments = await Appointment.countDocuments();
  const upcomingAppointments = await Appointment.countDocuments({
    appointmentDate: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] }
  });
  const completedAppointments = await Appointment.countDocuments({ status: 'completed' });

  // Health records statistics
  const totalHealthRecords = await HealthRecord.countDocuments();

  // Recent activity
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email role createdAt');

  const recentAppointments = await Appointment.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('patient', 'name')
    .populate('doctor', 'name')
    .select('patient doctor appointmentDate appointmentTime status');

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        patients: totalPatients,
        doctors: totalDoctors,
        active: activeUsers
      },
      schedules: {
        total: totalSchedules,
        active: activeSchedules
      },
      reminders: {
        total: totalReminders,
        today: todayReminders
      },
      appointments: {
        total: totalAppointments,
        upcoming: upcomingAppointments,
        completed: completedAppointments
      },
      healthRecords: {
        total: totalHealthRecords
      },
      recentActivity: {
        users: recentUsers,
        appointments: recentAppointments
      }
    }
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, isActive, search, sortBy = '-createdAt', limit = 50, page = 1 } = req.query;

  const query = {};

  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await User.find(query)
    .select('-password -pushTokens')
    .sort(sortBy)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    count: users.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: users
  });
});

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get additional statistics
  let additionalStats = {};

  if (user.role === 'patient') {
    const scheduleCount = await MedicineSchedule.countDocuments({ user: user._id });
    const appointmentCount = await Appointment.countDocuments({ patient: user._id });
    const recordCount = await HealthRecord.countDocuments({ user: user._id });

    additionalStats = {
      schedules: scheduleCount,
      appointments: appointmentCount,
      healthRecords: recordCount
    };
  } else if (user.role === 'doctor') {
    const appointmentCount = await Appointment.countDocuments({ doctor: user._id });
    const completedCount = await Appointment.countDocuments({ 
      doctor: user._id, 
      status: 'completed' 
    });

    additionalStats = {
      totalAppointments: appointmentCount,
      completedAppointments: completedCount
    };
  }

  res.json({
    success: true,
    data: {
      user,
      stats: additionalStats
    }
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Update allowed fields
  const allowedUpdates = [
    'name', 'email', 'phone', 'role', 'isActive', 'isVerified',
    'specialization', 'licenseNumber', 'experience', 'consultationFee'
  ];

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();

  logger.info(`User updated by admin: ${user._id}`);

  res.json({
    success: true,
    data: user,
    message: 'User updated successfully'
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent deleting own account
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot delete your own account');
  }

  await user.deleteOne();

  logger.info(`User deleted by admin: ${req.params.id}`);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Activate/Deactivate user
// @route   PUT /api/admin/users/:id/toggle-active
// @access  Private (Admin)
const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isActive = !user.isActive;
  await user.save();

  logger.info(`User ${user.isActive ? 'activated' : 'deactivated'} by admin: ${user._id}`);

  res.json({
    success: true,
    data: user,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
  });
});

// @desc    Get system health
// @route   GET /api/admin/health
// @access  Private (Admin)
const getSystemHealth = asyncHandler(async (req, res) => {
  // Database connection status
  const dbStatus = checkDBConnection();
  const dbStats = await getDBStats();

  // Server stats
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    data: {
      server: {
        status: 'running',
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      },
      database: {
        status: dbStatus.status,
        isConnected: dbStatus.isConnected,
        stats: dbStats
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      }
    }
  });
});

// @desc    Get activity logs
// @route   GET /api/admin/logs
// @access  Private (Admin)
const getActivityLogs = asyncHandler(async (req, res) => {
  const { type, limit = 100, page = 1 } = req.query;

  // In production, you would fetch logs from a logging service or database
  // For now, return a placeholder
  res.json({
    success: true,
    message: 'Activity logs feature - implement with logging service',
    data: []
  });
});

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private (Admin)
const getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // User growth
  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  // Appointment trends
  const appointmentTrends = await Appointment.aggregate([
    {
      $match: {
        appointmentDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Adherence statistics
  const adherenceStats = await Reminder.aggregate([
    {
      $match: {
        scheduledTime: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      dateRange: { start, end },
      userGrowth,
      appointmentTrends,
      adherenceStats
    }
  });
});

// @desc    Bulk operations
// @route   POST /api/admin/bulk-action
// @access  Private (Admin)
const bulkAction = asyncHandler(async (req, res) => {
  const { action, userIds } = req.body;

  if (!action || !userIds || !Array.isArray(userIds)) {
    res.status(400);
    throw new Error('Invalid bulk action request');
  }

  let result;

  switch (action) {
    case 'activate':
      result = await User.updateMany(
        { _id: { $in: userIds } },
        { isActive: true }
      );
      break;

    case 'deactivate':
      result = await User.updateMany(
        { _id: { $in: userIds } },
        { isActive: false }
      );
      break;

    case 'delete':
      // Prevent deleting own account
      const filteredIds = userIds.filter(id => id !== req.user._id.toString());
      result = await User.deleteMany({ _id: { $in: filteredIds } });
      break;

    default:
      res.status(400);
      throw new Error('Invalid bulk action');
  }

  logger.info(`Bulk action ${action} performed by admin on ${userIds.length} users`);

  res.json({
    success: true,
    message: `Bulk ${action} completed successfully`,
    affected: result.modifiedCount || result.deletedCount
  });
});

// Helper function to format uptime
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

module.exports = {
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
};