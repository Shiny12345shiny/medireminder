const asyncHandler = require('express-async-handler');
const HealthRecord = require('../models/HealthRecord');
const logger = require('../utils/logger');
const { deleteFile, getFileUrl } = require('../middlewares/upload');
const { emitToUser } = require('../services/socketService');

// @desc    Create health record
// @route   POST /api/records
// @access  Private
const createHealthRecord = asyncHandler(async (req, res) => {
  const recordData = {
    ...req.body,
    user: req.user._id
  };

  // Handle file uploads
  if (req.files && req.files.length > 0) {
    recordData.files = req.files.map(file => ({
      fileName: file.originalname,
      fileUrl: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date()
    }));
  }

  const record = await HealthRecord.create(recordData);

  logger.info(`Health record created: ${record._id} for user ${req.user._id}`);

  // Emit real-time event
  emitToUser(req.user._id, 'record:created', {
    recordId: record._id,
    recordType: record.recordType,
    title: record.title
  });

  res.status(201).json({
    success: true,
    data: record,
    message: 'Health record created successfully'
  });
});

// @desc    Get all health records for user
// @route   GET /api/records
// @access  Private
const getHealthRecords = asyncHandler(async (req, res) => {
  const { recordType, search, startDate, endDate, archived, favorite, sortBy = '-recordDate', limit = 50, page = 1 } = req.query;

  const query = { user: req.user._id };

  // Filter by record type
  if (recordType) {
    query.recordType = recordType;
  }

  // Filter by archived status
  if (archived !== undefined) {
    query.isArchived = archived === 'true';
  } else {
    query.isArchived = false; // Default: exclude archived
  }

  // Filter by favorite
  if (favorite === 'true') {
    query.isFavorite = true;
  }

  // Search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by date range
  if (startDate || endDate) {
    query.recordDate = {};
    if (startDate) {
      query.recordDate.$gte = new Date(startDate);
    }
    if (endDate) {
      query.recordDate.$lte = new Date(endDate);
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const records = await HealthRecord.find(query)
    .sort(sortBy)
    .limit(parseInt(limit))
    .skip(skip)
    .populate('relatedAppointment', 'appointmentDate doctor')
    .populate('sharedWith.user', 'name email');

  const total = await HealthRecord.countDocuments(query);

  res.json({
    success: true,
    count: records.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: records
  });
});

// @desc    Get single health record
// @route   GET /api/records/:id
// @access  Private
const getHealthRecord = asyncHandler(async (req, res) => {
  const record = await HealthRecord.findById(req.params.id)
    .populate('relatedAppointment', 'appointmentDate doctor')
    .populate('sharedWith.user', 'name email role')
    .populate('prescription.doctor', 'name specialization');

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check access
  if (!record.hasAccess(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to access this health record');
  }

  res.json({
    success: true,
    data: record
  });
});

// @desc    Update health record
// @route   PUT /api/records/:id
// @access  Private
const updateHealthRecord = asyncHandler(async (req, res) => {
  let record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this health record');
  }

  // Update fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined && key !== 'files') {
      record[key] = req.body[key];
    }
  });

  record = await record.save();

  logger.info(`Health record updated: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: 'Health record updated successfully'
  });
});

// @desc    Delete health record
// @route   DELETE /api/records/:id
// @access  Private
const deleteHealthRecord = asyncHandler(async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this health record');
  }

  // Delete associated files
  if (record.files && record.files.length > 0) {
    for (const file of record.files) {
      await deleteFile(file.fileUrl);
    }
  }

  await record.deleteOne();

  logger.info(`Health record deleted: ${req.params.id}`);

  res.json({
    success: true,
    message: 'Health record deleted successfully'
  });
});

// @desc    Upload files to health record
// @route   POST /api/records/:id/files
// @access  Private
const uploadFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('Please upload at least one file');
  }

  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to upload files to this health record');
  }

  // Add files
  for (const file of req.files) {
    await record.addFile(
      file.originalname,
      file.path,
      file.mimetype,
      file.size
    );
  }

  logger.info(`Files uploaded to health record: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: 'Files uploaded successfully'
  });
});

// @desc    Delete file from health record
// @route   DELETE /api/records/:id/files
// @access  Private
const deleteFileFromRecord = asyncHandler(async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    res.status(400);
    throw new Error('Please provide file URL to delete');
  }

  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete files from this health record');
  }

  // Delete file
  await deleteFile(fileUrl);
  await record.removeFile(fileUrl);

  logger.info(`File deleted from health record: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: 'File deleted successfully'
  });
});

// @desc    Share health record
// @route   POST /api/records/:id/share
// @access  Private
const shareHealthRecord = asyncHandler(async (req, res) => {
  const { userId, permissions, expiresAt } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error('Please provide user ID to share with');
  }

  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to share this health record');
  }

  await record.shareWith(userId, permissions, expiresAt ? new Date(expiresAt) : null);

  logger.info(`Health record shared: ${record._id} with user ${userId}`);

  res.json({
    success: true,
    data: record,
    message: 'Health record shared successfully'
  });
});

// @desc    Revoke access to health record
// @route   DELETE /api/records/:id/share/:userId
// @access  Private
const revokeAccess = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to revoke access to this health record');
  }

  await record.revokeAccess(userId);

  logger.info(`Access revoked for health record: ${record._id} from user ${userId}`);

  res.json({
    success: true,
    data: record,
    message: 'Access revoked successfully'
  });
});

// @desc    Archive health record
// @route   PUT /api/records/:id/archive
// @access  Private
const archiveHealthRecord = asyncHandler(async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to archive this health record');
  }

  await record.archive();

  logger.info(`Health record archived: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: 'Health record archived successfully'
  });
});

// @desc    Unarchive health record
// @route   PUT /api/records/:id/unarchive
// @access  Private
const unarchiveHealthRecord = asyncHandler(async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to unarchive this health record');
  }

  await record.unarchive();

  logger.info(`Health record unarchived: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: 'Health record unarchived successfully'
  });
});

// @desc    Toggle favorite status
// @route   PUT /api/records/:id/favorite
// @access  Private
const toggleFavorite = asyncHandler(async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to modify this health record');
  }

  await record.toggleFavorite();

  logger.info(`Health record favorite toggled: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: record.isFavorite ? 'Added to favorites' : 'Removed from favorites'
  });
});

// @desc    Add tag to health record
// @route   POST /api/records/:id/tags
// @access  Private
const addTag = asyncHandler(async (req, res) => {
  const { tag } = req.body;

  if (!tag) {
    res.status(400);
    throw new Error('Please provide a tag');
  }

  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to modify this health record');
  }

  await record.addTag(tag);

  logger.info(`Tag added to health record: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: 'Tag added successfully'
  });
});

// @desc    Remove tag from health record
// @route   DELETE /api/records/:id/tags/:tag
// @access  Private
const removeTag = asyncHandler(async (req, res) => {
  const { tag } = req.params;

  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Health record not found');
  }

  // Check ownership
  if (record.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to modify this health record');
  }

  await record.removeTag(tag);

  logger.info(`Tag removed from health record: ${record._id}`);

  res.json({
    success: true,
    data: record,
    message: 'Tag removed successfully'
  });
});

// @desc    Search health records
// @route   GET /api/records/search
// @access  Private
const searchHealthRecords = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    res.status(400);
    throw new Error('Please provide a search query');
  }

  const records = await HealthRecord.search(req.user._id, q);

  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

// @desc    Get records by date range
// @route   GET /api/records/date-range
// @access  Private
const getRecordsByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('Please provide start and end dates');
  }

  const records = await HealthRecord.getByDateRange(
    req.user._id,
    new Date(startDate),
    new Date(endDate)
  );

  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

// @desc    Get recent records
// @route   GET /api/records/recent
// @access  Private
const getRecentRecords = asyncHandler(async (req, res) => {
  const { days = 30, limit = 10 } = req.query;

  const records = await HealthRecord.getRecent(
    req.user._id,
    parseInt(days),
    parseInt(limit)
  );

  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

module.exports = {
  createHealthRecord,
  getHealthRecords,
  getHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  uploadFiles,
  deleteFileFromRecord,
  shareHealthRecord,
  revokeAccess,
  archiveHealthRecord,
  unarchiveHealthRecord,
  toggleFavorite,
  addTag,
  removeTag,
  searchHealthRecords,
  getRecordsByDateRange,
  getRecentRecords
};