const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient'
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    profilePicture: {
      type: String,
      default: ''
    },
    
    // Patient specific fields
    medicalHistory: [
      {
        condition: String,
        diagnosedDate: Date,
        notes: String
      }
    ],
    allergies: [
      {
        type: String,
        trim: true
      }
    ],
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    },
    
    // Doctor specific fields
    specialization: {
      type: String,
      trim: true
    },
    licenseNumber: {
      type: String,
      trim: true
    },
    experience: {
      type: Number,
      min: 0
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number
      }
    ],
    consultationFee: {
      type: Number,
      min: 0
    },
    availableHours: {
      monday: { start: String, end: String, available: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
      thursday: { start: String, end: String, available: { type: Boolean, default: true } },
      friday: { start: String, end: String, available: { type: Boolean, default: true } },
      saturday: { start: String, end: String, available: { type: Boolean, default: false } },
      sunday: { start: String, end: String, available: { type: Boolean, default: false } }
    },
    clinicAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    
    // Notification preferences
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      reminderAdvanceTime: {
        type: Number,
        default: 15,
        min: 0,
        max: 60
      }
    },
    
    // Push notification tokens
    pushTokens: [
      {
        token: String,
        device: String,
        platform: {
          type: String,
          enum: ['ios', 'android', 'web']
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Account status
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    
    // Password reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    
    // Last login
    lastLogin: Date,
    
    // Timezone
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'clinicAddress.coordinates': '2dsphere' });

// Virtual for age
userSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { 
      id: this._id
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
    }
  );
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return resetToken;
};

// Generate email verification token
userSchema.methods.generateVerificationToken = function () {
  const verifyToken = require('crypto').randomBytes(32).toString('hex');
  
  this.verificationToken = require('crypto')
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex');
  
  this.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verifyToken;
};

// Add push token
userSchema.methods.addPushToken = function (token, device, platform) {
  // Remove existing token if it exists
  this.pushTokens = this.pushTokens.filter(t => t.token !== token);
  
  // Add new token
  this.pushTokens.push({
    token,
    device,
    platform,
    addedAt: new Date()
  });
  
  // Keep only last 5 tokens per user
  if (this.pushTokens.length > 5) {
    this.pushTokens = this.pushTokens.slice(-5);
  }
  
  return this.save();
};

// Remove push token
userSchema.methods.removePushToken = function (token) {
  this.pushTokens = this.pushTokens.filter(t => t.token !== token);
  return this.save();
};

module.exports = mongoose.model('User', userSchema);