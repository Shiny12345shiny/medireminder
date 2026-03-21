const asyncHandler = require('express-async-handler');
const MedicineSchedule = require('../models/MedicineSchedule');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');
const { emitToUser } = require('../services/socketService');

// @desc    Create medicine schedule
// @route   POST /api/schedules
// @access  Private
const createSchedule = asyncHandler(async (req, res) => {
  const scheduleData = {
    ...req.body,
    user: req.user._id
  };

  // If stock not provided, set remaining equal to total
  if (scheduleData.stock && !scheduleData.stock.remainingQuantity) {
    scheduleData.stock.remainingQuantity = scheduleData.stock.totalQuantity;
  }

  const schedule = await MedicineSchedule.create(scheduleData);

  logger.info(`Medicine schedule created: ${schedule._id} for user ${req.user._id}`);

  // Emit real-time event
  emitToUser(req.user._id, 'schedule:created', {
    scheduleId: schedule._id,
    medicineName: schedule.medicineName
  });

  res.status(201).json({
    success: true,
    data: schedule,
    message: 'Medicine schedule created successfully'
  });
});

// @desc    Get all schedules for user
// @route   GET /api/schedules
// @access  Private
const getSchedules = asyncHandler(async (req, res) => {
  const { active, isActive, search, sortBy = '-createdAt' } = req.query;

  const query = { user: req.user._id };

  // Filter by active status
  if (active !== undefined || isActive !== undefined) {
    query.isActive = active === 'true' || isActive === 'true';
  }

  // Search by medicine name
  if (search) {
    query.medicineName = { $regex: search, $options: 'i' };
  }

  const schedules = await MedicineSchedule.find(query)
    .sort(sortBy)
    .populate('prescribedBy.doctor', 'name specialization');

  res.json({
    success: true,
    count: schedules.length,
    data: schedules
  });
});

// @desc    Get single schedule
// @route   GET /api/schedules/:id
// @access  Private
const getSchedule = asyncHandler(async (req, res) => {
  const schedule = await MedicineSchedule.findById(req.params.id)
    .populate('prescribedBy.doctor', 'name specialization email phone');

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this schedule');
  }

  res.json({
    success: true,
    data: schedule
  });
});

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private
const updateSchedule = asyncHandler(async (req, res) => {
  let schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this schedule');
  }

  // Update fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      schedule[key] = req.body[key];
    }
  });

  schedule = await schedule.save();

  logger.info(`Medicine schedule updated: ${schedule._id}`);

  // Emit real-time event
  emitToUser(req.user._id, 'schedule:updated', {
    scheduleId: schedule._id,
    medicineName: schedule.medicineName
  });

  res.json({
    success: true,
    data: schedule,
    message: 'Schedule updated successfully'
  });
});

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private
const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this schedule');
  }

  // Soft delete - mark as inactive
  schedule.isActive = false;
  await schedule.save();

  // Also delete/cancel pending reminders
  await Reminder.updateMany(
    { schedule: schedule._id, status: 'pending' },
    { status: 'cancelled' }
  );

  logger.info(`Medicine schedule deleted: ${schedule._id}`);

  // Emit real-time event
  emitToUser(req.user._id, 'schedule:deleted', {
    scheduleId: schedule._id
  });

  res.json({
    success: true,
    message: 'Schedule deleted successfully'
  });
});

// @desc    Pause schedule
// @route   PUT /api/schedules/:id/pause
// @access  Private
const pauseSchedule = asyncHandler(async (req, res) => {
  const { pauseUntil } = req.body;

  const schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to pause this schedule');
  }

  schedule.isPaused = true;
  if (pauseUntil) {
    schedule.pausedUntil = new Date(pauseUntil);
  }

  await schedule.save();

  logger.info(`Medicine schedule paused: ${schedule._id}`);

  res.json({
    success: true,
    data: schedule,
    message: 'Schedule paused successfully'
  });
});

// @desc    Resume schedule
// @route   PUT /api/schedules/:id/resume
// @access  Private
const resumeSchedule = asyncHandler(async (req, res) => {
  const schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to resume this schedule');
  }

  schedule.isPaused = false;
  schedule.pausedUntil = null;

  await schedule.save();

  logger.info(`Medicine schedule resumed: ${schedule._id}`);

  res.json({
    success: true,
    data: schedule,
    message: 'Schedule resumed successfully'
  });
});

// @desc    Refill medicine stock
// @route   PUT /api/schedules/:id/refill
// @access  Private
const refillStock = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    res.status(400);
    throw new Error('Please provide a valid quantity');
  }

  const schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to refill this schedule');
  }

  await schedule.refillStock(quantity);

  logger.info(`Medicine stock refilled: ${schedule._id}, quantity: ${quantity}`);

  // Emit real-time event
  emitToUser(req.user._id, 'schedule:refilled', {
    scheduleId: schedule._id,
    medicineName: schedule.medicineName,
    newStock: schedule.stock.remainingQuantity
  });

  res.json({
    success: true,
    data: schedule,
    message: 'Stock refilled successfully'
  });
});

// @desc    Add skip date
// @route   POST /api/schedules/:id/skip-date
// @access  Private
const addSkipDate = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;

  const schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to modify this schedule');
  }

  schedule.skipDates.push({ date: new Date(date), reason });
  await schedule.save();

  logger.info(`Skip date added to schedule: ${schedule._id}`);

  res.json({
    success: true,
    data: schedule,
    message: 'Skip date added successfully'
  });
});

// @desc    Get adherence statistics
// @route   GET /api/schedules/:id/adherence
// @access  Private
const getAdherenceStats = asyncHandler(async (req, res) => {
  const schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this schedule');
  }

  const stats = {
    medicineName: schedule.medicineName,
    totalDosesTaken: schedule.totalDosesTaken,
    totalDosesMissed: schedule.totalDosesMissed,
    adherenceScore: schedule.adherenceScore,
    currentStock: schedule.stock.remainingQuantity,
    daysUntilStockOut: schedule.daysUntilStockOut,
    isLowStock: schedule.isLowStock,
    lastTakenAt: schedule.lastTakenAt,
    nextDoseTime: schedule.getNextDoseTime()
  };

  res.json({
    success: true,
    data: stats
  });
});

// @desc    Get low stock schedules
// @route   GET /api/schedules/low-stock
// @access  Private
const getLowStockSchedules = asyncHandler(async (req, res) => {
  const schedules = await MedicineSchedule.find({
    user: req.user._id,
    isActive: true
  });

  const lowStockSchedules = schedules.filter(schedule => schedule.isLowStock);

  res.json({
    success: true,
    count: lowStockSchedules.length,
    data: lowStockSchedules
  });
});

// @desc    Get active schedules for today
// @route   GET /api/schedules/today
// @access  Private
const getTodaySchedules = asyncHandler(async (req, res) => {
  const schedules = await MedicineSchedule.find({
    user: req.user._id,
    isActive: true
  });

  const todaySchedules = schedules.filter(schedule => schedule.isActiveToday());

  res.json({
    success: true,
    count: todaySchedules.length,
    data: todaySchedules
  });
});

// @desc    Upload medicine image
// @route   POST /api/schedules/:id/image
// @access  Private
const uploadMedicineImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image file');
  }

  const schedule = await MedicineSchedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  // Check ownership
  if (schedule.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this schedule');
  }

  // Delete old image if exists
  if (schedule.identification.image) {
    const { deleteFile } = require('../middlewares/upload');
    await deleteFile(schedule.identification.image);
  }

  schedule.identification.image = req.file.path;
  await schedule.save();

  logger.info(`Medicine image uploaded for schedule: ${schedule._id}`);

  res.json({
    success: true,
    data: {
      image: schedule.identification.image
    },
    message: 'Medicine image uploaded successfully'
  });
});

module.exports = {
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
};