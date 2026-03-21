const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
      index: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor is required'],
      index: true
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      index: true
    },
    appointmentTime: {
      type: String,
      required: [true, 'Appointment time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
    },
    duration: {
      type: Number,
      default: 30,
      min: [15, 'Duration must be at least 15 minutes'],
      max: [180, 'Duration cannot exceed 180 minutes']
    },
    consultationType: {
      type: String,
      enum: ['video', 'audio', 'chat', 'in-person'],
      default: 'video',
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'],
      default: 'scheduled',
      index: true
    },
    reason: {
      type: String,
      required: [true, 'Reason for consultation is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    symptoms: [
      {
        type: String,
        trim: true
      }
    ],
    chiefComplaint: {
      type: String,
      trim: true,
      maxlength: [1000, 'Chief complaint cannot exceed 1000 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    fee: {
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        default: 'INR'
      },
      isPaid: {
        type: Boolean,
        default: false
      },
      paidAt: Date,
      paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'netbanking', 'wallet', 'insurance']
      },
      transactionId: String
    },
    prescription: {
      medicines: [
        {
          name: {
            type: String,
            required: true
          },
          dosage: {
            amount: Number,
            unit: String
          },
          frequency: String,
          duration: {
            value: Number,
            unit: {
              type: String,
              enum: ['days', 'weeks', 'months']
            }
          },
          instructions: String
        }
      ],
      tests: [
        {
          testName: String,
          instructions: String,
          urgency: {
            type: String,
            enum: ['routine', 'urgent', 'emergency']
          }
        }
      ],
      diagnosis: String,
      notes: String,
      prescriptionDate: Date,
      prescriptionFile: String
    },
    vitals: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number
      },
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      oxygenSaturation: Number,
      bloodSugar: Number
    },
    notes: {
      patient: {
        type: String,
        maxlength: [1000, 'Patient notes cannot exceed 1000 characters']
      },
      doctor: {
        type: String,
        maxlength: [2000, 'Doctor notes cannot exceed 2000 characters']
      },
      admin: {
        type: String,
        maxlength: [500, 'Admin notes cannot exceed 500 characters']
      }
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    callDetails: {
      roomId: String,
      startTime: Date,
      endTime: Date,
      actualDuration: Number,
      callQuality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor']
      },
      recordingUrl: String
    },
    followUp: {
      required: {
        type: Boolean,
        default: false
      },
      recommendedDate: Date,
      notes: String,
      nextAppointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
      }
    },
    rating: {
      patientRating: {
        score: {
          type: Number,
          min: 1,
          max: 5
        },
        review: String,
        ratedAt: Date
      },
      doctorRating: {
        score: {
          type: Number,
          min: 1,
          max: 5
        },
        review: String,
        ratedAt: Date
      }
    },
    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      cancelledAt: Date,
      reason: String,
      refundStatus: {
        type: String,
        enum: ['not-applicable', 'pending', 'processed', 'rejected']
      },
      refundAmount: Number
    },
    rescheduling: {
      rescheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rescheduledAt: Date,
      previousDate: Date,
      previousTime: String,
      reason: String
    },
    reminders: {
      sent: [
        {
          type: {
            type: String,
            enum: ['email', 'push', 'sms']
          },
          sentAt: Date,
          recipient: {
            type: String,
            enum: ['patient', 'doctor', 'both']
          }
        }
      ],
      lastReminderAt: Date
    },
    metadata: {
      createdVia: {
        type: String,
        enum: ['web', 'mobile', 'admin'],
        default: 'mobile'
      },
      ipAddress: String,
      userAgent: String,
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });

// Virtual for full appointment datetime
appointmentSchema.virtual('appointmentDateTime').get(function () {
  const date = new Date(this.appointmentDate);
  const [hours, minutes] = this.appointmentTime.split(':');
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
});

// Virtual for checking if appointment is upcoming
appointmentSchema.virtual('isUpcoming').get(function () {
  return this.appointmentDateTime > new Date() && this.status === 'scheduled';
});

// Virtual for checking if appointment is past
appointmentSchema.virtual('isPast').get(function () {
  return this.appointmentDateTime < new Date();
});

// Virtual for time until appointment
appointmentSchema.virtual('timeUntilAppointment').get(function () {
  const now = new Date();
  const diff = this.appointmentDateTime - now;
  return Math.round(diff / (1000 * 60)); // Return minutes
});

// Method to confirm appointment
appointmentSchema.methods.confirm = async function () {
  this.status = 'confirmed';
  return await this.save();
};

// Method to start appointment
appointmentSchema.methods.start = async function (roomId = null) {
  this.status = 'in-progress';
  this.callDetails.startTime = new Date();
  if (roomId) this.callDetails.roomId = roomId;
  return await this.save();
};

// Method to complete appointment
appointmentSchema.methods.complete = async function (diagnosis = null, prescriptionData = null) {
  this.status = 'completed';
  this.callDetails.endTime = new Date();
  
  if (this.callDetails.startTime) {
    const duration = (this.callDetails.endTime - this.callDetails.startTime) / (1000 * 60);
    this.callDetails.actualDuration = Math.round(duration);
  }
  
  if (diagnosis) {
    this.prescription.diagnosis = diagnosis;
    this.prescription.prescriptionDate = new Date();
  }
  
  if (prescriptionData) {
    this.prescription = { ...this.prescription, ...prescriptionData };
  }
  
  return await this.save();
};

// Method to cancel appointment
appointmentSchema.methods.cancel = async function (userId, reason) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: userId,
    cancelledAt: new Date(),
    reason
  };
  
  // Determine refund eligibility
  const hoursUntilAppointment = this.timeUntilAppointment / 60;
  if (hoursUntilAppointment > 24 && this.fee.isPaid) {
    this.cancellation.refundStatus = 'pending';
    this.cancellation.refundAmount = this.fee.amount;
  } else {
    this.cancellation.refundStatus = 'not-applicable';
  }
  
  return await this.save();
};

// Method to reschedule appointment
appointmentSchema.methods.reschedule = async function (userId, newDate, newTime, reason) {
  this.status = 'rescheduled';
  this.rescheduling = {
    rescheduledBy: userId,
    rescheduledAt: new Date(),
    previousDate: this.appointmentDate,
    previousTime: this.appointmentTime,
    reason
  };
  
  this.appointmentDate = newDate;
  this.appointmentTime = newTime;
  
  return await this.save();
};

// Method to add prescription
appointmentSchema.methods.addPrescription = async function (prescriptionData) {
  this.prescription = {
    ...this.prescription,
    ...prescriptionData,
    prescriptionDate: new Date()
  };
  return await this.save();
};

// Method to add patient rating
appointmentSchema.methods.rateByPatient = async function (score, review = '') {
  this.rating.patientRating = {
    score,
    review,
    ratedAt: new Date()
  };
  
  // Update doctor's overall rating
  const User = mongoose.model('User');
  const doctor = await User.findById(this.doctor);
  if (doctor) {
    const appointments = await this.constructor.find({
      doctor: this.doctor,
      'rating.patientRating.score': { $exists: true }
    });
    
    const totalRating = appointments.reduce((sum, apt) => sum + apt.rating.patientRating.score, 0);
    const avgRating = totalRating / appointments.length;
    
    doctor.rating = avgRating;
    doctor.totalReviews = appointments.length;
    await doctor.save();
  }
  
  return await this.save();
};

// Method to add doctor rating
appointmentSchema.methods.rateByDoctor = async function (score, review = '') {
  this.rating.doctorRating = {
    score,
    review,
    ratedAt: new Date()
  };
  return await this.save();
};

// Method to add attachment
appointmentSchema.methods.addAttachment = async function (fileName, fileUrl, fileType, uploadedBy) {
  this.attachments.push({
    fileName,
    fileUrl,
    fileType,
    uploadedBy,
    uploadedAt: new Date()
  });
  return await this.save();
};

// Method to send reminder
appointmentSchema.methods.sendReminder = async function (type, recipient) {
  this.reminders.sent.push({
    type,
    sentAt: new Date(),
    recipient
  });
  this.reminders.lastReminderAt = new Date();
  return await this.save();
};

// Static method to check doctor availability
appointmentSchema.statics.checkAvailability = async function (doctorId, date, time, duration = 30) {
  const [hours, minutes] = time.split(':');
  const startTime = new Date(date);
  startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + duration);
  
  // Check for overlapping appointments
  const overlapping = await this.findOne({
    doctor: doctorId,
    appointmentDate: date,
    status: { $in: ['scheduled', 'confirmed', 'in-progress'] },
    $or: [
      {
        // Existing appointment starts during new appointment
        $expr: {
          $and: [
            { $gte: [{ $dateFromString: { dateString: { $concat: [{ $dateToString: { date: '$appointmentDate', format: '%Y-%m-%d' } }, 'T', '$appointmentTime'] } } }, startTime] },
            { $lt: [{ $dateFromString: { dateString: { $concat: [{ $dateToString: { date: '$appointmentDate', format: '%Y-%m-%d' } }, 'T', '$appointmentTime'] } } }, endTime] }
          ]
        }
      }
    ]
  });
  
  return !overlapping;
};

// Static method to get upcoming appointments
appointmentSchema.statics.getUpcomingAppointments = async function (userId, role, days = 7) {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  endDate.setHours(23, 59, 59, 999);
  
  const query = {
    appointmentDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['scheduled', 'confirmed'] }
  };
  
  if (role === 'patient') {
    query.patient = userId;
  } else if (role === 'doctor') {
    query.doctor = userId;
  }
  
  return await this.find(query)
    .populate('patient', 'name email phone profilePicture')
    .populate('doctor', 'name email phone specialization profilePicture')
    .sort({ appointmentDate: 1, appointmentTime: 1 });
};

// Pre-save middleware
appointmentSchema.pre('save', function (next) {
  // Auto-mark as no-show if past appointment time and not completed
  if (this.isPast && this.status === 'confirmed') {
    const hoursPast = Math.abs(this.timeUntilAppointment) / 60;
    if (hoursPast > 1) {
      this.status = 'no-show';
    }
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);