const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicineSchedule',
      required: [true, 'Medicine schedule is required'],
      index: true
    },
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true
    },
    scheduledTime: {
      type: Date,
      required: [true, 'Scheduled time is required'],
      index: true
    },
    dosage: {
      amount: {
        type: Number,
        required: true
      },
      unit: {
        type: String,
        required: true
      }
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'taken', 'missed', 'skipped', 'snoozed'],
      default: 'pending',
      index: true
    },
    takenAt: {
      type: Date
    },
    missedAt: {
      type: Date
    },
    snoozeUntil: {
      type: Date
    },
    snoozeCount: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    notificationsSent: [
      {
        type: {
          type: String,
          enum: ['push', 'email', 'sms'],
          required: true
        },
        sentAt: {
          type: Date,
          required: true,
          default: Date.now
        },
        status: {
          type: String,
          enum: ['sent', 'failed', 'delivered'],
          default: 'sent'
        },
        errorMessage: String,
        metadata: {
          pushToken: String,
          emailAddress: String,
          phoneNumber: String
        }
      }
    ],
    escalationAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lastEscalationAt: {
      type: Date
    },
    reminderSentAt: {
      type: Date
    },
    isEscalated: {
      type: Boolean,
      default: false
    },
    confirmationMethod: {
      type: String,
      enum: ['app', 'notification', 'manual'],
      default: 'app'
    },
    photoProof: {
      type: String
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      timestamp: Date
    },
    sideEffectsReported: [
      {
        effect: {
          type: String,
          required: true
        },
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe'],
          default: 'mild'
        },
        reportedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    effectivenessRating: {
      type: Number,
      min: 1,
      max: 5
    },
    moodAfterTaking: {
      type: String,
      enum: ['very-bad', 'bad', 'neutral', 'good', 'very-good']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
reminderSchema.index({ user: 1, scheduledTime: -1 });
reminderSchema.index({ schedule: 1, scheduledTime: -1 });
reminderSchema.index({ status: 1, scheduledTime: 1 });
reminderSchema.index({ scheduledTime: 1, status: 1 });

// Virtual for delay in taking medicine
reminderSchema.virtual('takenDelay').get(function () {
  if (!this.takenAt || !this.scheduledTime) return null;
  const delayMs = this.takenAt - this.scheduledTime;
  return Math.round(delayMs / (1000 * 60)); // Return delay in minutes
});

// Virtual for checking if reminder is overdue
reminderSchema.virtual('isOverdue').get(function () {
  if (this.status === 'taken' || this.status === 'skipped') return false;
  return new Date() > this.scheduledTime;
});

// Virtual for time until scheduled
reminderSchema.virtual('timeUntilScheduled').get(function () {
  const now = new Date();
  const diff = this.scheduledTime - now;
  return Math.round(diff / (1000 * 60)); // Return minutes until scheduled
});

// Method to mark reminder as taken
reminderSchema.methods.markAsTaken = async function (takenAt = new Date(), notes = '', photoProof = null, location = null) {
  this.status = 'taken';
  this.takenAt = takenAt;
  if (notes) this.notes = notes;
  if (photoProof) this.photoProof = photoProof;
  if (location) this.location = location;
  
  // Update schedule stock and adherence
  const MedicineSchedule = mongoose.model('MedicineSchedule');
  const schedule = await MedicineSchedule.findById(this.schedule);
  if (schedule) {
    await schedule.decrementStock();
  }
  
  return await this.save();
};

// Method to mark reminder as missed
reminderSchema.methods.markAsMissed = async function () {
  this.status = 'missed';
  this.missedAt = new Date();
  
  // Update schedule adherence
  const MedicineSchedule = mongoose.model('MedicineSchedule');
  const schedule = await MedicineSchedule.findById(this.schedule);
  if (schedule) {
    schedule.totalDosesMissed += 1;
    schedule.updateAdherenceScore();
    await schedule.save();
  }
  
  return await this.save();
};

// Method to mark reminder as skipped
reminderSchema.methods.markAsSkipped = async function (reason = '') {
  this.status = 'skipped';
  if (reason) this.notes = reason;
  return await this.save();
};

// Method to snooze reminder
reminderSchema.methods.snooze = async function (minutes = 10) {
  const snoozeUntil = new Date();
  snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
  
  this.status = 'snoozed';
  this.snoozeUntil = snoozeUntil;
  this.snoozeCount += 1;
  
  return await this.save();
};

// Method to add notification sent record
reminderSchema.methods.addNotification = async function (type, status = 'sent', metadata = {}, errorMessage = null) {
  this.notificationsSent.push({
    type,
    sentAt: new Date(),
    status,
    errorMessage,
    metadata
  });
  
  if (!this.reminderSentAt) {
    this.reminderSentAt = new Date();
  }
  
  if (this.status === 'pending') {
    this.status = 'sent';
  }
  
  return await this.save();
};

// Method to escalate reminder
reminderSchema.methods.escalate = async function () {
  this.escalationAttempts += 1;
  this.lastEscalationAt = new Date();
  this.isEscalated = true;
  
  return await this.save();
};

// Method to add side effect report
reminderSchema.methods.reportSideEffect = async function (effect, severity = 'mild') {
  this.sideEffectsReported.push({
    effect,
    severity,
    reportedAt: new Date()
  });
  
  return await this.save();
};

// Method to rate effectiveness
reminderSchema.methods.rateEffectiveness = async function (rating, mood = null) {
  this.effectivenessRating = rating;
  if (mood) this.moodAfterTaking = mood;
  
  return await this.save();
};

// Static method to get adherence statistics for a user
reminderSchema.statics.getAdherenceStats = async function (userId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {

        //user: mongoose.Types.ObjectId(userId),
        user: new mongoose.Types.ObjectId(userId),
        
        scheduledTime: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    taken: 0,
    missed: 0,
    skipped: 0,
    pending: 0,
    adherenceRate: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  if (result.taken + result.missed + result.skipped > 0) {
    const denominator = result.taken + result.missed + result.skipped;
    result.adherenceRate = Math.round((result.taken / denominator) * 100);
  }
  
  return result;
};

// Static method to get reminders due for notification
reminderSchema.statics.getDueReminders = async function (advanceMinutes = 15) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + advanceMinutes * 60000);
  
  return await this.find({
    status: 'pending',
    scheduledTime: {
      $gte: now,
      $lte: futureTime
    }
  }).populate('user schedule');
};

// Static method to get overdue reminders for escalation
reminderSchema.statics.getOverdueReminders = async function () {
  const now = new Date();
  
  return await this.find({
    status: { $in: ['sent', 'snoozed'] },
    scheduledTime: { $lt: now }
  }).populate('user schedule');
};

// Pre-save middleware to auto-update missed status
reminderSchema.pre('save', function (next) {
  // Auto-mark as missed if overdue and not taken/skipped
  if (this.status === 'sent' && new Date() > this.scheduledTime) {
    const overdueMinutes = (new Date() - this.scheduledTime) / (1000 * 60);
    if (overdueMinutes > 60) { // 1 hour overdue
      this.status = 'missed';
      this.missedAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('Reminder', reminderSchema);