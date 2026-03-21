const asyncHandler = require('express-async-handler');
const Reminder = require('../models/Reminder');
const MedicineSchedule = require('../models/MedicineSchedule');
const logger = require('../utils/logger');
const { emitToUser } = require('../services/socketService');

// @desc    Get reminders for user
// @route   GET /api/reminders
// @access  Private
const getReminders = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, scheduleId, limit = 50, page = 1 } = req.query;

  const query = { user: req.user._id };

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by schedule
  if (scheduleId) {
    query.schedule = scheduleId;
  }

  // Filter by date range
  if (startDate || endDate) {
    query.scheduledTime = {};
    if (startDate) {
      query.scheduledTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.scheduledTime.$lte = new Date(endDate);
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reminders = await Reminder.find(query)
    .populate('schedule', 'medicineName dosage instructions')
    .sort({ scheduledTime: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Reminder.countDocuments(query);

  res.json({
    success: true,
    count: reminders.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: reminders
  });
});

// @desc    Get upcoming reminders
// @route   GET /api/reminders/upcoming
// @access  Private
const getUpcomingReminders = asyncHandler(async (req, res) => {
  const { hours = 24 } = req.query;

  const now = new Date();
  const futureTime = new Date(now.getTime() + parseInt(hours) * 60 * 60 * 1000);

  const reminders = await Reminder.find({
    user: req.user._id,
    status: { $in: ['pending', 'sent'] },
    scheduledTime: {
      $gte: now,
      $lte: futureTime
    }
  })
    .populate('schedule', 'medicineName dosage instructions identification')
    .sort({ scheduledTime: 1 });

  res.json({
    success: true,
    count: reminders.length,
    data: reminders
  });
});

// @desc    Get today's reminders
// @route   GET /api/reminders/today
// @access  Private
const getTodayReminders = asyncHandler(async (req, res) => {
  const userTimezone = req.user.timezone || 'Asia/Kolkata';
  const moment = require('moment-timezone');

  const startOfDay = moment().tz(userTimezone).startOf('day').toDate();
  const endOfDay = moment().tz(userTimezone).endOf('day').toDate();

  const reminders = await Reminder.find({
    user: req.user._id,
    scheduledTime: {
      $gte: startOfDay,
      $lt: endOfDay
    }
  })
    .populate('schedule', 'medicineName dosage instructions identification')
    .sort({ scheduledTime: 1 });

  // Group by status
  const grouped = {
    taken: [],
    missed: [],
    pending: [],
    upcoming: []
  };

  const now = new Date();

  reminders.forEach(reminder => {
    if (reminder.status === 'taken') {
      grouped.taken.push(reminder);
    } else if (reminder.status === 'missed') {
      grouped.missed.push(reminder);
    } else if (reminder.scheduledTime > now) {
      grouped.upcoming.push(reminder);
    } else {
      grouped.pending.push(reminder);
    }
  });

  res.json({
    success: true,
    count: reminders.length,
    data: grouped
  });
});

// @desc    Get single reminder
// @route   GET /api/reminders/:id
// @access  Private
const getReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id)
    .populate('schedule', 'medicineName dosage instructions identification')
    .populate('user', 'name email phone');

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  // Check ownership
  if (reminder.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this reminder');
  }

  res.json({
    success: true,
    data: reminder
  });
});

// @desc    Confirm medicine taken
// @route   POST /api/reminders/:id/confirm
// @access  Private
const confirmMedicineTaken = asyncHandler(async (req, res) => {
  const { notes, photoProof, location, effectivenessRating, moodAfterTaking } = req.body;

  const reminder = await Reminder.findById(req.params.id).populate('schedule');

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  // Check ownership
  if (reminder.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to confirm this reminder');
  }

  // Check if already taken or skipped
  if (reminder.status === 'taken' || reminder.status === 'skipped') {
    res.status(400);
    throw new Error(`Medicine already marked as ${reminder.status}`);
  }

  const takenAt = new Date();
  await reminder.markAsTaken(takenAt, notes, photoProof, location);

  // Add ratings if provided
  if (effectivenessRating) {
    await reminder.rateEffectiveness(effectivenessRating, moodAfterTaking);
  }

  logger.info(`Medicine confirmed taken: ${reminder._id} by user ${req.user._id}`);

  // Emit real-time event
  emitToUser(req.user._id, 'reminder:confirmed', {
    reminderId: reminder._id,
    medicineName: reminder.medicineName,
    takenAt
  });

  res.json({
    success: true,
    data: reminder,
    message: 'Medicine marked as taken successfully'
  });
});

// @desc    Snooze reminder
// @route   POST /api/reminders/:id/snooze
// @access  Private
const snoozeReminder = asyncHandler(async (req, res) => {
  const { minutes = 10 } = req.body;

  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  // Check ownership
  if (reminder.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to snooze this reminder');
  }

  // Check if already taken or missed
  if (reminder.status === 'taken' || reminder.status === 'missed') {
    res.status(400);
    throw new Error(`Cannot snooze a ${reminder.status} reminder`);
  }

  await reminder.snooze(parseInt(minutes));

  logger.info(`Reminder snoozed: ${reminder._id} for ${minutes} minutes`);

  res.json({
    success: true,
    data: reminder,
    message: `Reminder snoozed for ${minutes} minutes`
  });
});

// @desc    Skip reminder
// @route   POST /api/reminders/:id/skip
// @access  Private
const skipReminder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  // Check ownership
  if (reminder.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to skip this reminder');
  }

  await reminder.markAsSkipped(reason);

  logger.info(`Reminder skipped: ${reminder._id}`);

  res.json({
    success: true,
    data: reminder,
    message: 'Reminder skipped successfully'
  });
});

// @desc    Report side effect
// @route   POST /api/reminders/:id/side-effect
// @access  Private
const reportSideEffect = asyncHandler(async (req, res) => {
  const { effect, severity = 'mild' } = req.body;

  if (!effect) {
    res.status(400);
    throw new Error('Please provide side effect description');
  }

  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  // Check ownership
  if (reminder.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to report for this reminder');
  }

  await reminder.reportSideEffect(effect, severity);

  logger.info(`Side effect reported for reminder: ${reminder._id}`);

  // Emit real-time alert if severe
  if (severity === 'severe') {
    emitToUser(req.user._id, 'sideeffect:severe', {
      reminderId: reminder._id,
      medicineName: reminder.medicineName,
      effect,
      severity
    });
  }

  res.json({
    success: true,
    data: reminder,
    message: 'Side effect reported successfully'
  });
});

// @desc    Get adherence statistics
// @route   GET /api/reminders/stats/adherence
// @access  Private
const getAdherenceStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate, scheduleId, days = 30 } = req.query;
  const moment = require('moment-timezone');
  const userTimezone = req.user.timezone || 'Asia/Kolkata';

  // Use timezone-aware date range, respecting days param
  const end = endDate ? new Date(endDate) : moment().tz(userTimezone).endOf('day').toDate();
  const start = startDate ? new Date(startDate) : moment().tz(userTimezone).subtract(parseInt(days), 'days').startOf('day').toDate();

  const query = {
    user: req.user._id,
    scheduledTime: { $gte: start, $lte: end }
  };

  if (scheduleId) {
    query.schedule = scheduleId;
  }

  const stats = await Reminder.getAdherenceStats(req.user._id, start, end);

  // Get schedule-wise breakdown if requested
  let scheduleBreakdown = null;
  if (req.query.breakdown === 'true') {
    const schedules = await MedicineSchedule.find({
      user: req.user._id,
      isActive: true
    });

    scheduleBreakdown = await Promise.all(
      schedules.map(async (schedule) => {
        const scheduleReminders = await Reminder.find({
          ...query,
          schedule: schedule._id
        });

        const taken = scheduleReminders.filter(r => r.status === 'taken').length;
        const missed = scheduleReminders.filter(r => r.status === 'missed').length;
        const total = taken + missed;

        return {
          scheduleId: schedule._id,
          medicineName: schedule.medicineName,
          total,
          taken,
          missed,
          adherenceRate: total > 0 ? Math.round((taken / total) * 100) : 0
        };
      })
    );
  }

  res.json({
    success: true,
    data: {
      overall: stats,
      scheduleBreakdown,
      dateRange: {
        start,
        end
      }
    }
  });
});

// @desc    Get reminder history
// @route   GET /api/reminders/history
// @access  Private
const getReminderHistory = asyncHandler(async (req, res) => {
  const { days = 30, scheduleId } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const query = {
    user: req.user._id,
    scheduledTime: { $gte: startDate }
  };

  if (scheduleId) {
    query.schedule = scheduleId;
  }

  const reminders = await Reminder.find(query)
    .populate('schedule', 'medicineName dosage')
    .sort({ scheduledTime: -1 });

  // Group by date
  const grouped = {};

  reminders.forEach(reminder => {
    const dateKey = reminder.scheduledTime.toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(reminder);
  });

  res.json({
    success: true,
    count: reminders.length,
    data: {
      reminders,
      grouped
    }
  });
});

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  // Check ownership
  if (reminder.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this reminder');
  }

  await reminder.deleteOne();

  logger.info(`Reminder deleted: ${req.params.id}`);

  res.json({
    success: true,
    message: 'Reminder deleted successfully'
  });
});

module.exports = {
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
};