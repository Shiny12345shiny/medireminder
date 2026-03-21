const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const logger = require('../utils/logger');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
const getDoctors = asyncHandler(async (req, res) => {
  const { specialization, search, sortBy = 'name', limit = 20, page = 1 } = req.query;

  const query = { role: 'doctor', isActive: true };

  // Filter by specialization
  if (specialization) {
    query.specialization = { $regex: specialization, $options: 'i' };
  }

  // Search by name or specialization
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { specialization: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const doctors = await User.find(query)
    .select('-password -pushTokens -resetPasswordToken -verificationToken')
    .sort(sortBy)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    count: doctors.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: doctors
  });
});

// @desc    Get single doctor
// @route   GET /api/doctors/:id
// @access  Public
const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await User.findOne({
    _id: req.params.id,
    role: 'doctor'
  }).select('-password -pushTokens -resetPasswordToken -verificationToken');

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  res.json({
    success: true,
    data: doctor
  });
});

// @desc    Get nearby doctors
// @route   GET /api/doctors/nearby
// @access  Private
const getNearbyDoctors = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10, specialization, limit = 20 } = req.query;

  if (!latitude || !longitude) {
    res.status(400);
    throw new Error('Please provide latitude and longitude');
  }

  const query = {
    role: 'doctor',
    isActive: true,
    'clinicAddress.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(radius) * 1000 // Convert km to meters
      }
    }
  };

  // Filter by specialization
  if (specialization) {
    query.specialization = { $regex: specialization, $options: 'i' };
  }

  const doctors = await User.find(query)
    .select('-password -pushTokens -resetPasswordToken -verificationToken')
    .limit(parseInt(limit));

  // Calculate distance for each doctor
  const doctorsWithDistance = doctors.map(doctor => {
    const docObj = doctor.toObject();
    if (doctor.clinicAddress && doctor.clinicAddress.coordinates) {
      const { latitude: docLat, longitude: docLng } = doctor.clinicAddress.coordinates;
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        docLat,
        docLng
      );
      docObj.distance = Math.round(distance * 10) / 10; // Round to 1 decimal
    }
    return docObj;
  });

  // Sort by distance
  doctorsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  res.json({
    success: true,
    count: doctorsWithDistance.length,
    data: doctorsWithDistance
  });
});

// @desc    Get doctor availability
// @route   GET /api/doctors/:id/availability
// @access  Public
const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;

  const doctor = await User.findOne({
    _id: req.params.id,
    role: 'doctor'
  });

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  const checkDate = date ? new Date(date) : new Date();
  //const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const dayAvailability = doctor.availableHours[dayName];

  if (!dayAvailability || !dayAvailability.available) {
    return res.json({
      success: true,
      data: {
        available: false,
        message: 'Doctor is not available on this day'
      }
    });
  }

  // Get existing appointments for this date
  const appointments = await Appointment.find({
    doctor: doctor._id,
    appointmentDate: {
      $gte: new Date(checkDate.setHours(0, 0, 0, 0)),
      $lt: new Date(checkDate.setHours(23, 59, 59, 999))
    },
    status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
  }).select('appointmentTime duration');

  // Generate time slots
  // Guard: if start/end times not set, doctor hasn't configured hours
  if (!dayAvailability.start || !dayAvailability.end) {
    return res.json({
      success: true,
      data: {
        available: false,
        message: 'Doctor has not set available hours for this day'
      }
    });
  }

  // Generate time slots
  const slots = generateTimeSlots(
    dayAvailability.start,
    dayAvailability.end,
    30, // 30 minute slots
    appointments
  );

  res.json({
    success: true,
    data: {
      available: true,
      availableHours: dayAvailability,
      slots
    }
  });
});

// @desc    Get doctor statistics
// @route   GET /api/doctors/:id/stats
// @access  Private (Doctor/Admin)
const getDoctorStats = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;

  // Check authorization
  if (req.user._id.toString() !== doctorId && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view these statistics');
  }

  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  // Get appointment statistics
  const totalAppointments = await Appointment.countDocuments({ doctor: doctorId });
  const completedAppointments = await Appointment.countDocuments({ 
    doctor: doctorId, 
    status: 'completed' 
  });
  const upcomingAppointments = await Appointment.countDocuments({
    doctor: doctorId,
    status: { $in: ['scheduled', 'confirmed'] },
    appointmentDate: { $gte: new Date() }
  });
  const cancelledAppointments = await Appointment.countDocuments({
    doctor: doctorId,
    status: 'cancelled'
  });

  // Get revenue (if fee tracking is implemented)
  const revenueData = await Appointment.aggregate([
    {
      $match: {
        doctor: doctor._id,
        status: 'completed',
        'fee.isPaid': true
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$fee.amount' }
      }
    }
  ]);

  const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

  // Get patient count
  const uniquePatients = await Appointment.distinct('patient', { 
    doctor: doctorId,
    status: { $in: ['scheduled', 'confirmed', 'completed', 'in-progress'] }
  });

  res.json({
    success: true,
    data: {
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      cancelledAppointments,
      totalPatients: uniquePatients.length,
      totalRevenue,
      rating: doctor.rating,
      totalReviews: doctor.totalReviews
    }
  });
});

// @desc    Get doctor reviews
// @route   GET /api/doctors/:id/reviews
// @access  Public
const getDoctorReviews = asyncHandler(async (req, res) => {
  const { limit = 10, page = 1 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const appointments = await Appointment.find({
    doctor: req.params.id,
    'rating.patientRating.score': { $exists: true }
  })
    .populate('patient', 'name profilePicture')
    .select('rating.patientRating appointmentDate')
    .sort({ 'rating.patientRating.ratedAt': -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Appointment.countDocuments({
    doctor: req.params.id,
    'rating.patientRating.score': { $exists: true }
  });

  const reviews = appointments.map(apt => ({
    patient: apt.patient,
    rating: apt.rating.patientRating.score,
    review: apt.rating.patientRating.review,
    date: apt.rating.patientRating.ratedAt,
    appointmentDate: apt.appointmentDate
  }));

  res.json({
    success: true,
    count: reviews.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: reviews
  });
});

// @desc    Get specializations list
// @route   GET /api/doctors/specializations
// @access  Public
const getSpecializations = asyncHandler(async (req, res) => {
  const specializations = await User.distinct('specialization', {
    role: 'doctor',
    specialization: { $ne: null, $ne: '' }
  });

  res.json({
    success: true,
    count: specializations.length,
    data: specializations.sort()
  });
});

// @desc    Update doctor profile (extended)
// @route   PUT /api/doctors/profile
// @access  Private (Doctor)
const updateDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await User.findById(req.user._id);

  if (!doctor || doctor.role !== 'doctor') {
    res.status(404);
    throw new Error('Doctor profile not found');
  }

  // Update doctor-specific fields
  const {
    specialization,
    licenseNumber,
    experience,
    qualifications,
    consultationFee,
    availableHours,
    clinicAddress
  } = req.body;

  if (specialization) doctor.specialization = specialization;
  if (licenseNumber) doctor.licenseNumber = licenseNumber;
  if (experience !== undefined) doctor.experience = experience;
  if (qualifications) doctor.qualifications = qualifications;
  if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
  if (availableHours) doctor.availableHours = availableHours;
  if (clinicAddress) doctor.clinicAddress = clinicAddress;

  await doctor.save();

  logger.info(`Doctor profile updated: ${doctor._id}`);

  res.json({
    success: true,
    data: doctor,
    message: 'Doctor profile updated successfully'
  });
});

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to generate time slots
const generateTimeSlots = (startTime, endTime, duration, bookedAppointments) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentTime = startHour * 60 + startMin;
  const endTimeMin = endHour * 60 + endMin;

  while (currentTime < endTimeMin) {
    const hours = Math.floor(currentTime / 60);
    const minutes = currentTime % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Check if slot is booked
    const isBooked = bookedAppointments.some(apt => apt.appointmentTime === timeString);

    slots.push({
      time: timeString,
      available: !isBooked
    });

    currentTime += duration;
  }

  return slots;
};

module.exports = {
  getDoctors,
  getDoctor,
  getNearbyDoctors,
  getDoctorAvailability,
  getDoctorStats,
  getDoctorReviews,
  getSpecializations,
  updateDoctorProfile
};