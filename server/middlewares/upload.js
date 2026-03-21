const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const createUploadDirs = () => {
  const dirs = [
    uploadDir,
    path.join(uploadDir, 'profiles'),
    path.join(uploadDir, 'prescriptions'),
    path.join(uploadDir, 'records'),
    path.join(uploadDir, 'medicines'),
    path.join(uploadDir, 'temp')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created upload directory: ${dir}`);
    }
  });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'temp';

    // Determine folder based on file field name or route
    if (file.fieldname === 'profilePicture') {
      folder = 'profiles';
    } else if (file.fieldname === 'prescription' || file.fieldname === 'prescriptionImage') {
      folder = 'prescriptions';
    } else if (file.fieldname === 'healthRecord' || file.fieldname === 'record') {
      folder = 'records';
    } else if (file.fieldname === 'medicineImage') {
      folder = 'medicines';
    }

    const destination = path.join(uploadDir, folder);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${uuidv4()}-${Date.now()}`;
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = process.env.ALLOWED_FILE_TYPES 
    ? process.env.ALLOWED_FILE_TYPES.split(',')
    : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`
      ),
      false
    );
  }
};

// Multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per request
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          error: err.message
        });
      } else if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          error: err.message
        });
      } else if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple fields
const uploadFields = (fields) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.fields(fields);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          error: err.message
        });
      } else if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      next();
    });
  };
};

// Delete file utility
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(__dirname, '..', filePath);
    
    fs.unlink(fullPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, consider it deleted
          logger.warn(`File not found for deletion: ${fullPath}`);
          resolve();
        } else {
          logger.error('Error deleting file:', err);
          reject(err);
        }
      } else {
        logger.info(`File deleted: ${fullPath}`);
        resolve();
      }
    });
  });
};

// Delete multiple files utility
const deleteFiles = async (filePaths) => {
  const deletePromises = filePaths.map(filePath => deleteFile(filePath));
  return Promise.allSettled(deletePromises);
};

// Get file URL
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Construct URL
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/${filePath.replace(/\\/g, '/')}`;
};

// Validate file exists
const fileExists = (filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
};

// Get file size
const getFileSize = (filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  try {
    const stats = fs.statSync(fullPath);
    return stats.size;
  } catch (error) {
    logger.error('Error getting file size:', error);
    return 0;
  }
};

// Clean up old temp files (run periodically)
const cleanupTempFiles = (olderThanHours = 24) => {
  const tempDir = path.join(uploadDir, 'temp');
  const now = Date.now();
  const maxAge = olderThanHours * 60 * 60 * 1000;

  fs.readdir(tempDir, (err, files) => {
    if (err) {
      logger.error('Error reading temp directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) {
          logger.error('Error getting file stats:', err);
          return;
        }

        if (now - stats.mtimeMs > maxAge) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error('Error deleting old temp file:', err);
            } else {
              logger.info(`Deleted old temp file: ${file}`);
            }
          });
        }
      });
    });
  });
};

// Run cleanup every 6 hours
setInterval(() => {
  cleanupTempFiles(24);
}, 6 * 60 * 60 * 1000);

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  deleteFile,
  deleteFiles,
  getFileUrl,
  fileExists,
  getFileSize,
  cleanupTempFiles
};