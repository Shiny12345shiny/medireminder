const asyncHandler = require('express-async-handler');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail } = require('../utils/emailService');
const { sendAppointmentConfirmationNotification, sendAppointmentReminderNotification } = require('../utils/pushNotificationService');
const { emitToUser, emitToAppointment } = require('../services/socketService');

// @desc    Book appointment
// @route   POST /api/consultations/book
// @access  Private (Patient)
const bookAppointment = asyncHandler(async (req, res) => {
  const {
    doctorId,
    appointmentDate,
    appointmentTime,
    consultationType,
    reason,
    symptoms,
    chiefComplaint,
    priority
  } = req.body;

  // Validate doctor exists
  const doctor = await User.findById(doctorId);

  if (!doctor || doctor.role !== 'doctor') {
    res.status(404);
    throw new Error('Doctor not found');
  }

  // Check doctor availability
  const isAvailable = await Appointment.checkAvailability(
    doctorId,
    new Date(appointmentDate),
    appointmentTime,
    30
  );

  if (!isAvailable) {
    res.status(400);
    throw new Error('This time slot is not available. Please choose another time.');
  }

  // Create appointment
  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctorId,
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    consultationType,
    reason,
    symptoms,
    chiefComplaint,
    priority: priority || 'medium',
    fee: {
      amount: doctor.consultationFee || 0,
      currency: 'INR'
    },
    metadata: {
      createdVia: 'mobile',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  // Populate for response
  await appointment.populate('doctor', 'name email phone specialization profilePicture');

  logger.info(`Appointment booked: ${appointment._id} by patient ${req.user._id}`);

  // Send confirmation notifications
  const patient = req.user;

  // Email to patient
  await sendAppointmentConfirmationEmail(patient, appointment);

  // Push notification to patient
  if (patient.pushTokens && patient.pushTokens.length > 0) {
    for (const tokenObj of patient.pushTokens) {
      await sendAppointmentConfirmationNotification(
        tokenObj.token,
        doctor.name,
        new Date(appointmentDate).toLocaleDateString(),
        appointmentTime
      );
    }
  }

  // Notify doctor
  emitToUser(doctorId, 'appointment:new', {
    appointmentId: appointment._id,
    patientName: patient.name,
    appointmentDate,
    appointmentTime
  });

  res.status(201).json({
    success: true,
    data: appointment,
    message: 'Appointment booked successfully'
  });
});

// @desc    Get appointments for user
// @route   GET /api/consultations
// @access  Private
const getAppointments = asyncHandler(async (req, res) => {
  const { status, upcoming, past, limit = 20, page = 1 } = req.query;

  const query = {};

  // Filter by role
  if (req.user.role === 'patient') {
    query.patient = req.user._id;
  } else if (req.user.role === 'doctor') {
    query.doctor = req.user._id;
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by time
  const now = new Date();
  if (upcoming === 'true') {
    query.appointmentDate = { $gte: now };
    query.status = { $in: ['scheduled', 'confirmed'] };
  } else if (past === 'true') {
    query.$or = [
      { appointmentDate: { $lt: now } },
      { status: { $in: ['completed', 'cancelled', 'no-show'] } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const appointments = await Appointment.find(query)
    .populate('patient', 'name email phone profilePicture age gender')
    .populate('doctor', 'name email phone specialization profilePicture consultationFee')
    .sort({ appointmentDate: -1, appointmentTime: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Appointment.countDocuments(query);

  res.json({
    success: true,
    count: appointments.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: appointments
  });
});

// @desc    Get upcoming appointments
// @route   GET /api/consultations/upcoming
// @access  Private
const getUpcomingAppointments = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;

  const appointments = await Appointment.getUpcomingAppointments(
    req.user._id,
    req.user.role,
    parseInt(days)
  );

  res.json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// @desc    Get single appointment
// @route   GET /api/consultations/:id
// @access  Private
const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name email phone profilePicture age gender bloodGroup allergies medicalHistory')
    .populate('doctor', 'name email phone specialization profilePicture qualifications experience consultationFee');

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient._id.toString() === req.user._id.toString();
  const isDoctor = appointment.doctor._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to access this appointment');
  }

  res.json({
    success: true,
    data: appointment
  });
});

// @desc    Confirm appointment
// @route   PUT /api/consultations/:id/confirm
// @access  Private (Doctor)
const confirmAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate('patient doctor');

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only doctor can confirm
  if (appointment.doctor._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the assigned doctor can confirm appointments');
  }

  await appointment.confirm();

  logger.info(`Appointment confirmed: ${appointment._id}`);

  // Notify patient
  emitToUser(appointment.patient._id, 'appointment:confirmed', {
    appointmentId: appointment._id
  });

  res.json({
    success: true,
    data: appointment,
    message: 'Appointment confirmed successfully'
  });
});

// @desc    Start appointment
// @route   PUT /api/consultations/:id/start
// @access  Private (Doctor)
const startAppointment = asyncHandler(async (req, res) => {
  const { roomId } = req.body;

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check authorization
  const isDoctor = appointment.doctor.toString() === req.user._id.toString();
  if (!isDoctor) {
    res.status(403);
    throw new Error('Only the assigned doctor can start appointments');
  }

  await appointment.start(roomId);

  logger.info(`Appointment started: ${appointment._id}`);

  // Notify patient
  emitToUser(appointment.patient.toString(), 'appointment:started', {
    appointmentId: appointment._id,
    roomId
  });

  res.json({
    success: true,
    data: appointment,
    message: 'Appointment started successfully'
  });
});

// @desc    Complete appointment
// @route   PUT /api/consultations/:id/complete
// @access  Private (Doctor)
const completeAppointment = asyncHandler(async (req, res) => {
  const { diagnosis, prescriptionData, notes } = req.body;

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only doctor can complete
  if (appointment.doctor.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the assigned doctor can complete appointments');
  }

  // Add doctor notes
  if (notes) {
    appointment.notes.doctor = notes;
  }

  await appointment.complete(diagnosis, prescriptionData);

  logger.info(`Appointment completed: ${appointment._id}`);

  // Notify patient
  emitToUser(appointment.patient.toString(), 'appointment:completed', {
    appointmentId: appointment._id
  });

  res.json({
    success: true,
    data: appointment,
    message: 'Appointment completed successfully'
  });
});

// @desc    Cancel appointment
// @route   PUT /api/consultations/:id/cancel
// @access  Private
const cancelAppointment = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error('Please provide a cancellation reason');
  }

  const appointment = await Appointment.findById(req.params.id).populate('patient doctor');

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient._id.toString() === req.user._id.toString();
  const isDoctor = appointment.doctor._id.toString() === req.user._id.toString();

  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this appointment');
  }

  await appointment.cancel(req.user._id, reason);

  logger.info(`Appointment cancelled: ${appointment._id} by ${req.user._id}`);

  // Notify the other party
  const notifyUserId = isPatient ? appointment.doctor._id : appointment.patient._id;
  emitToUser(notifyUserId, 'appointment:cancelled', {
    appointmentId: appointment._id,
    reason
  });

  res.json({
    success: true,
    data: appointment,
    message: 'Appointment cancelled successfully'
  });
});

// @desc    Reschedule appointment
// @route   PUT /api/consultations/:id/reschedule
// @access  Private
const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { newDate, newTime, reason } = req.body;

  if (!newDate || !newTime) {
    res.status(400);
    throw new Error('Please provide new date and time');
  }

  const appointment = await Appointment.findById(req.params.id).populate('patient doctor');

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient._id.toString() === req.user._id.toString();
  const isDoctor = appointment.doctor._id.toString() === req.user._id.toString();

  if (!isPatient && !isDoctor) {
    res.status(403);
    throw new Error('Not authorized to reschedule this appointment');
  }

  // Check new slot availability
  const isAvailable = await Appointment.checkAvailability(
    appointment.doctor._id,
    new Date(newDate),
    newTime,
    appointment.duration
  );

  if (!isAvailable) {
    res.status(400);
    throw new Error('The new time slot is not available');
  }

  await appointment.reschedule(req.user._id, new Date(newDate), newTime, reason);

  logger.info(`Appointment rescheduled: ${appointment._id}`);

  // Notify the other party
  const notifyUserId = isPatient ? appointment.doctor._id : appointment.patient._id;
  emitToUser(notifyUserId, 'appointment:rescheduled', {
    appointmentId: appointment._id,
    newDate,
    newTime
  });

  res.json({
    success: true,
    data: appointment,
    message: 'Appointment rescheduled successfully'
  });
});

// @desc    Add prescription to appointment
// @route   POST /api/consultations/:id/prescription
// @access  Private (Doctor)
const addPrescription = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only doctor can add prescription
  if (appointment.doctor.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the assigned doctor can add prescriptions');
  }

  await appointment.addPrescription(req.body);

  logger.info(`Prescription added to appointment: ${appointment._id}`);

  // Notify patient
  emitToUser(appointment.patient.toString(), 'prescription:added', {
    appointmentId: appointment._id
  });

  res.json({
    success: true,
    data: appointment,
    message: 'Prescription added successfully'
  });
});

// @desc    Rate appointment (by patient)
// @route   POST /api/consultations/:id/rate
// @access  Private (Patient)
const rateAppointment = asyncHandler(async (req, res) => {
  const { score, review } = req.body;

  if (!score || score < 1 || score > 5) {
    res.status(400);
    throw new Error('Please provide a valid rating (1-5)');
  }

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only patient can rate
  if (appointment.patient.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the patient can rate appointments');
  }

  // Check if appointment is completed
  if (appointment.status !== 'completed') {
    res.status(400);
    throw new Error('You can only rate completed appointments');
  }

  await appointment.rateByPatient(score, review);

  logger.info(`Appointment rated: ${appointment._id}, score: ${score}`);

  res.json({
    success: true,
    data: appointment,
    message: 'Rating submitted successfully'
  });
});

// @desc    Add notes to appointment
// @route   POST /api/consultations/:id/notes
// @access  Private
const addNotes = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check authorization
  const isPatient = appointment.patient.toString() === req.user._id.toString();
  const isDoctor = appointment.doctor.toString() === req.user._id.toString();

  if (!isPatient && !isDoctor) {
    res.status(403);
    throw new Error('Not authorized to add notes to this appointment');
  }

  // Add notes based on role
  if (isPatient) {
    appointment.notes.patient = notes;
  } else if (isDoctor) {
    appointment.notes.doctor = notes;
  }

  await appointment.save();

  logger.info(`Notes added to appointment: ${appointment._id}`);

  res.json({
    success: true,
    data: appointment,
    message: 'Notes added successfully'
  });
});

module.exports = {
  bookAppointment,
  getAppointments,
  getUpcomingAppointments,
  getAppointment,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  rescheduleAppointment,
  addPrescription,
  rateAppointment,
  addNotes
};