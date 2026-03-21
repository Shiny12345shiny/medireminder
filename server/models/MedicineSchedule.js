const mongoose = require('mongoose');

const medicineScheduleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: [200, 'Medicine name cannot exceed 200 characters']
    },
    medicineType: {
      type: String,
      enum: ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'inhaler', 'ointment', 'other'],
      default: 'tablet'
    },
    dosage: {
      amount: {
        type: Number,
        required: [true, 'Dosage amount is required'],
        min: [0, 'Dosage amount must be positive']
      },
      unit: {
        type: String,
        required: [true, 'Dosage unit is required'],
        enum: ['mg', 'ml', 'g', 'mcg', 'IU', 'tablet(s)', 'capsule(s)', 'teaspoon(s)', 'tablespoon(s)', 'drop(s)', 'puff(s)', 'application(s)'],
        default: 'tablet(s)'
      }
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: ['once-daily', 'twice-daily', 'thrice-daily', 'four-times-daily', 'every-n-hours', 'as-needed', 'weekly', 'custom'],
      default: 'once-daily'
    },
    timings: [
      {
        time: {
          type: String,
          required: true,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
        },
        label: {
          type: String,
          enum: ['morning', 'afternoon', 'evening', 'night', 'before-breakfast', 'after-breakfast', 'before-lunch', 'after-lunch', 'before-dinner', 'after-dinner', 'custom'],
          default: 'custom'
        }
      }
    ],
    duration: {
      startDate: {
        type: Date,
        required: [true, 'Start date is required'],
        default: Date.now
      },
      endDate: {
        type: Date,
        validate: {
          validator: function(value) {
            return !value || value > this.duration.startDate;
          },
          message: 'End date must be after start date'
        }
      },
      isIndefinite: {
        type: Boolean,
        default: false
      }
    },
    instructions: {
      beforeFood: {
        type: Boolean,
        default: false
      },
      afterFood: {
        type: Boolean,
        default: false
      },
      withFood: {
        type: Boolean,
        default: false
      },
      emptyStomach: {
        type: Boolean,
        default: false
      },
      specialInstructions: {
        type: String,
        maxlength: [500, 'Special instructions cannot exceed 500 characters']
      }
    },
    stock: {
      totalQuantity: {
        type: Number,
        required: [true, 'Total quantity is required'],
        min: [0, 'Stock quantity cannot be negative']
      },
      remainingQuantity: {
        type: Number,
        required: [true, 'Remaining quantity is required'],
        min: [0, 'Remaining quantity cannot be negative']
      },
      lowStockThreshold: {
        type: Number,
        default: 5,
        min: [0, 'Threshold cannot be negative']
      },
      lastRefillDate: {
        type: Date
      }
    },
    identification: {
      color: {
        type: String,
        trim: true
      },
      shape: {
        type: String,
        trim: true
      },
      imprint: {
        type: String,
        trim: true
      },
      image: {
        type: String
      },
      description: {
        type: String,
        maxlength: [300, 'Description cannot exceed 300 characters']
      }
    },
    prescribedBy: {
      doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      doctorName: {
        type: String,
        trim: true
      },
      prescriptionDate: {
        type: Date
      },
      prescriptionImage: {
        type: String
      }
    },
    purpose: {
      type: String,
      trim: true,
      maxlength: [300, 'Purpose cannot exceed 300 characters']
    },
    sideEffects: [
      {
        type: String,
        trim: true
      }
    ],
    reminderSettings: {
      enabled: {
        type: Boolean,
        default: true
      },
      advanceTime: {
        type: Number,
        default: 15,
        min: [0, 'Advance time cannot be negative'],
        max: [120, 'Advance time cannot exceed 120 minutes']
      },
      escalationEnabled: {
        type: Boolean,
        default: true
      },
      escalationInterval: {
        type: Number,
        default: 5,
        min: [1, 'Escalation interval must be at least 1 minute']
      },
      maxEscalations: {
        type: Number,
        default: 3,
        min: [0, 'Max escalations cannot be negative'],
        max: [10, 'Max escalations cannot exceed 10']
      },
      soundEnabled: {
        type: Boolean,
        default: true
      },
      vibrationEnabled: {
        type: Boolean,
        default: true
      }
    },
    refillReminder: {
      enabled: {
        type: Boolean,
        default: true
      },
      daysBeforeRunOut: {
        type: Number,
        default: 3,
        min: [1, 'Days before run out must be at least 1']
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isPaused: {
      type: Boolean,
      default: false
    },
    pausedUntil: {
      type: Date
    },
    skipDates: [
      {
        date: {
          type: Date,
          required: true
        },
        reason: {
          type: String,
          maxlength: [200, 'Reason cannot exceed 200 characters']
        }
      }
    ],
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    adherenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    totalDosesTaken: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDosesMissed: {
      type: Number,
      default: 0,
      min: 0
    },
    lastTakenAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
medicineScheduleSchema.index({ user: 1, isActive: 1 });
medicineScheduleSchema.index({ 'duration.startDate': 1, 'duration.endDate': 1 });
medicineScheduleSchema.index({ 'stock.remainingQuantity': 1 });

// Virtual for checking if medicine is low on stock
medicineScheduleSchema.virtual('isLowStock').get(function () {
  return this.stock.remainingQuantity <= this.stock.lowStockThreshold;
});

// Virtual for checking if schedule is expired
medicineScheduleSchema.virtual('isExpired').get(function () {
  if (this.duration.isIndefinite) return false;
  if (!this.duration.endDate) return false;
  return new Date() > this.duration.endDate;
});

// Virtual for days remaining until stock runs out
medicineScheduleSchema.virtual('daysUntilStockOut').get(function () {
  if (this.stock.remainingQuantity === 0) return 0;
  
  const dosesPerDay = (this.timings || []).length;
  if (dosesPerDay === 0) return Infinity;
  
  return Math.floor(this.stock.remainingQuantity / dosesPerDay);
});

// Method to update stock after taking medicine
medicineScheduleSchema.methods.decrementStock = async function () {
  if (this.stock.remainingQuantity > 0) {
    this.stock.remainingQuantity = Math.max(0, this.stock.remainingQuantity - this.dosage.amount);
    this.totalDosesTaken += 1;
    this.lastTakenAt = new Date();
    
    // Update adherence score
    this.updateAdherenceScore();
    
    return await this.save();
  }
  return this;
};

// Method to update adherence score
medicineScheduleSchema.methods.updateAdherenceScore = function () {
  const total = this.totalDosesTaken + this.totalDosesMissed;
  if (total === 0) {
    this.adherenceScore = 0;
  } else {
    this.adherenceScore = Math.round((this.totalDosesTaken / total) * 100);
  }
};

// Method to refill stock
medicineScheduleSchema.methods.refillStock = async function (quantity) {
  this.stock.remainingQuantity += quantity;
  this.stock.totalQuantity += quantity;
  this.stock.lastRefillDate = new Date();
  return await this.save();
};

// Method to check if schedule is active today
medicineScheduleSchema.methods.isActiveToday = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if paused
  if (this.isPaused) {
    if (this.pausedUntil && this.pausedUntil > today) {
      return false;
    }
    // Unpause if pause period is over
    this.isPaused = false;
    this.pausedUntil = null;
  }
  
  // Check if within duration
  const startDate = new Date(this.duration.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  if (today < startDate) return false;
  
  if (!this.duration.isIndefinite && this.duration.endDate) {
    const endDate = new Date(this.duration.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (today > endDate) return false;
  }
  
  // Check if today is in skip dates
  const isSkipped = this.skipDates.some(skip => {
    const skipDate = new Date(skip.date);
    skipDate.setHours(0, 0, 0, 0);
    return skipDate.getTime() === today.getTime();
  });
  
  return !isSkipped && this.isActive;
};

// Method to get next dose time
medicineScheduleSchema.methods.getNextDoseTime = function () {
  if (!this.isActiveToday()) return null;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Find next timing
  const nextTiming = this.timings
    .filter(t => t.time > currentTime)
    .sort((a, b) => a.time.localeCompare(b.time))[0];
  
  if (nextTiming) {
    const [hours, minutes] = nextTiming.time.split(':');
    const nextDose = new Date();
    nextDose.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return nextDose;
  }
  
  // If no more timings today, return first timing of next day
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const firstTiming = this.timings.sort((a, b) => a.time.localeCompare(b.time))[0];
  if (firstTiming) {
    const [hours, minutes] = firstTiming.time.split(':');
    tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return tomorrow;
  }
  
  return null;
};

// Pre-save middleware to update adherence score
medicineScheduleSchema.pre('save', function (next) {
  if (this.isModified('totalDosesTaken') || this.isModified('totalDosesMissed')) {
    this.updateAdherenceScore();
  }
  next();
});

module.exports = mongoose.model('MedicineSchedule', medicineScheduleSchema);