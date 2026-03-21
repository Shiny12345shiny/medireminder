const express = require('express');
const {
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
} = require('../controllers/healthRecordController');
const { protect } = require('../middlewares/auth');
const { uploadMultiple } = require('../middlewares/upload');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Validation rules
const createRecordValidation = [
  body('recordType')
    .isIn([
      'prescription',
      'lab-report',
      'imaging',
      'discharge-summary',
      'vaccination',
      'allergy',
      'surgery',
      'consultation-note',
      'vital-signs',
      'insurance',
      'other'
    ])
    .withMessage('Invalid record type'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('recordDate').isISO8601().withMessage('Invalid record date'),
  body('tags').optional().isArray(),
  validate
];

const updateRecordValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('recordDate').optional().isISO8601().withMessage('Invalid record date'),
  validate
];

const shareRecordValidation = [
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('permissions').optional().isObject(),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date'),
  validate
];

const deleteFileValidation = [
  body('fileUrl').trim().notEmpty().withMessage('File URL is required'),
  validate
];

const tagValidation = [
  body('tag').trim().notEmpty().withMessage('Tag is required'),
  validate
];

// Routes
router.get('/search', protect, searchHealthRecords);
router.get('/date-range', protect, getRecordsByDateRange);
router.get('/recent', protect, getRecentRecords);

router.route('/')
  .get(protect, getHealthRecords)
  .post(
    protect,
    uploadMultiple('files', 5),
    createRecordValidation,
    createHealthRecord
  );

router.route('/:id')
  .get(protect, getHealthRecord)
  .put(protect, updateRecordValidation, updateHealthRecord)
  .delete(protect, deleteHealthRecord);

router.post(
  '/:id/files',
  protect,
  uploadMultiple('files', 5),
  uploadFiles
);

router.delete(
  '/:id/files',
  protect,
  deleteFileValidation,
  deleteFileFromRecord
);

router.post(
  '/:id/share',
  protect,
  shareRecordValidation,
  shareHealthRecord
);

router.delete('/:id/share/:userId', protect, revokeAccess);

router.put('/:id/archive', protect, archiveHealthRecord);
router.put('/:id/unarchive', protect, unarchiveHealthRecord);
router.put('/:id/favorite', protect, toggleFavorite);

router.post('/:id/tags', protect, tagValidation, addTag);
router.delete('/:id/tags/:tag', protect, removeTag);

module.exports = router;