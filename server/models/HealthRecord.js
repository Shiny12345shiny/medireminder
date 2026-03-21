const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },
    recordType: {
      type: String,
      enum: [
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
      ],
      required: [true, 'Record type is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    recordDate: {
      type: Date,
      required: [true, 'Record date is required'],
      index: true
    },
    files: [
      {
        fileName: {
          type: String,
          required: true
        },
        fileUrl: {
          type: String,
          required: true
        },
        fileType: {
          type: String,
          enum: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp'],
          required: true
        },
        fileSize: {
          type: Number,
          required: true
        },
        thumbnailUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Prescription specific fields
    prescription: {
      doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      doctorName: String,
      hospitalName: String,
      medicines: [
        {
          name: String,
          dosage: String,
          frequency: String,
          duration: String,
          instructions: String
        }
      ],
      diagnosis: String,
      symptoms: [String],
      tests: [String],
      followUpDate: Date,
      prescriptionNumber: String
    },
    
    // Lab report specific fields
    labReport: {
      testName: String,
      labName: String,
      testDate: Date,
      results: [
        {
          parameter: String,
          value: String,
          unit: String,
          referenceRange: String,
          status: {
            type: String,
            enum: ['normal', 'abnormal', 'critical']
          }
        }
      ],
      reportNumber: String,
      technician: String,
      verifiedBy: String
    },
    
    // Imaging specific fields
    imaging: {
      studyType: {
        type: String,
        enum: ['X-Ray', 'CT-Scan', 'MRI', 'Ultrasound', 'PET-Scan', 'Mammogram', 'Other']
      },
      bodyPart: String,
      findings: String,
      impression: String,
      radiologist: String,
      facilityName: String,
      studyDate: Date,
      studyId: String
    },
    
    // Vaccination specific fields
    vaccination: {
      vaccineName: String,
      doseNumber: Number,
      administeredBy: String,
      facilityName: String,
      batchNumber: String,
      nextDoseDate: Date,
      sideEffects: [String]
    },
    
    // Surgery specific fields
    surgery: {
      surgeryType: String,
      surgeon: String,
      hospital: String,
      surgeryDate: Date,
      anesthesiaType: String,
      complications: String,
      recoveryNotes: String
    },
    
    // Vital signs specific fields
    vitals: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number
      },
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      bmi: Number,
      oxygenSaturation: Number,
      bloodSugar: {
        fasting: Number,
        postprandial: Number,
        random: Number
      },
      respiratoryRate: Number
    },
    
    // Insurance specific fields
    insurance: {
      provider: String,
      policyNumber: String,
      policyHolderName: String,
      coverageAmount: Number,
      validFrom: Date,
      validUntil: Date,
      emergencyContact: String
    },
    
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        sharedAt: {
          type: Date,
          default: Date.now
        },
        permissions: {
          canView: {
            type: Boolean,
            default: true
          },
          canDownload: {
            type: Boolean,
            default: false
          },
          canShare: {
            type: Boolean,
            default: false
          }
        },
        expiresAt: Date
      }
    ],
    
    relatedAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    
    relatedSchedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicineSchedule'
    },
    
    isArchived: {
      type: Boolean,
      default: false
    },
    
    isFavorite: {
      type: Boolean,
      default: false
    },
    
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    
    metadata: {
      uploadedVia: {
        type: String,
        enum: ['mobile', 'web', 'doctor', 'hospital', 'api'],
        default: 'mobile'
      },
      sourceIp: String,
      deviceInfo: String,
      ocrProcessed: {
        type: Boolean,
        default: false
      },
      ocrData: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
healthRecordSchema.index({ user: 1, recordDate: -1 });
healthRecordSchema.index({ user: 1, recordType: 1 });
healthRecordSchema.index({ recordType: 1, recordDate: -1 });
healthRecordSchema.index({ tags: 1 });
healthRecordSchema.index({ isArchived: 1, isFavorite: 1 });

// Virtual for total file size
healthRecordSchema.virtual('totalFileSize').get(function () {
  return this.files.reduce((total, file) => total + file.fileSize, 0);
});

// Virtual for file count
healthRecordSchema.virtual('fileCount').get(function () {
  return this.files.length;
});

// Virtual for checking if record is recent (within 30 days)
healthRecordSchema.virtual('isRecent').get(function () {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.recordDate >= thirtyDaysAgo;
});

// Method to share record with another user
healthRecordSchema.methods.shareWith = async function (userId, permissions = {}, expiresAt = null) {
  // Remove existing share if present
  this.sharedWith = this.sharedWith.filter(
    share => share.user.toString() !== userId.toString()
  );
  
  // Add new share
  this.sharedWith.push({
    user: userId,
    sharedAt: new Date(),
    permissions: {
      canView: permissions.canView !== undefined ? permissions.canView : true,
      canDownload: permissions.canDownload !== undefined ? permissions.canDownload : false,
      canShare: permissions.canShare !== undefined ? permissions.canShare : false
    },
    expiresAt
  });
  
  return await this.save();
};

// Method to revoke access from a user
healthRecordSchema.methods.revokeAccess = async function (userId) {
  this.sharedWith = this.sharedWith.filter(
    share => share.user.toString() !== userId.toString()
  );
  return await this.save();
};

// Method to check if user has access
healthRecordSchema.methods.hasAccess = function (userId) {
  // Owner always has access
  if (this.user.toString() === userId.toString()) {
    return true;
  }
  
  // Check if shared with user
  const share = this.sharedWith.find(
    share => share.user.toString() === userId.toString()
  );
  
  if (!share) return false;
  
  // Check if share has expired
  if (share.expiresAt && new Date() > share.expiresAt) {
    return false;
  }
  
  return share.permissions.canView;
};

// Method to add file
healthRecordSchema.methods.addFile = async function (fileName, fileUrl, fileType, fileSize, thumbnailUrl = null) {
  this.files.push({
    fileName,
    fileUrl,
    fileType,
    fileSize,
    thumbnailUrl,
    uploadedAt: new Date()
  });
  return await this.save();
};

// Method to remove file
healthRecordSchema.methods.removeFile = async function (fileUrl) {
  this.files = this.files.filter(file => file.fileUrl !== fileUrl);
  return await this.save();
};

// Method to add tag
healthRecordSchema.methods.addTag = async function (tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return await this.save();
  }
  return this;
};

// Method to remove tag
healthRecordSchema.methods.removeTag = async function (tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return await this.save();
};

// Method to archive record
healthRecordSchema.methods.archive = async function () {
  this.isArchived = true;
  return await this.save();
};

// Method to unarchive record
healthRecordSchema.methods.unarchive = async function () {
  this.isArchived = false;
  return await this.save();
};

// Method to toggle favorite
healthRecordSchema.methods.toggleFavorite = async function () {
  this.isFavorite = !this.isFavorite;
  return await this.save();
};

// Static method to get records by type
healthRecordSchema.statics.getByType = async function (userId, recordType, limit = 10) {
  return await this.find({
    user: userId,
    recordType,
    isArchived: false
  })
    .sort({ recordDate: -1 })
    .limit(limit);
};

// Static method to search records
healthRecordSchema.statics.search = async function (userId, searchTerm) {
  return await this.find({
    user: userId,
    isArchived: false,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } },
      { 'prescription.diagnosis': { $regex: searchTerm, $options: 'i' } },
      { 'labReport.testName': { $regex: searchTerm, $options: 'i' } }
    ]
  }).sort({ recordDate: -1 });
};

// Static method to get records in date range
healthRecordSchema.statics.getByDateRange = async function (userId, startDate, endDate) {
  return await this.find({
    user: userId,
    recordDate: {
      $gte: startDate,
      $lte: endDate
    },
    isArchived: false
  }).sort({ recordDate: -1 });
};

// Static method to get recent records
healthRecordSchema.statics.getRecent = async function (userId, days = 30, limit = 10) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    user: userId,
    recordDate: { $gte: startDate },
    isArchived: false
  })
    .sort({ recordDate: -1 })
    .limit(limit);
};

// Pre-save middleware to clean up expired shares
healthRecordSchema.pre('save', function (next) {
  if (this.sharedWith && this.sharedWith.length > 0) {
    const now = new Date();
    this.sharedWith = this.sharedWith.filter(
      share => !share.expiresAt || share.expiresAt > now
    );
  }
  next();
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);