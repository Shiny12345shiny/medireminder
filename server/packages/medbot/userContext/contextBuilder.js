/**
 * ================================================================
 * medbot/userContext/contextBuilder.js
 * Pulls all relevant user health data from MongoDB
 * and assembles it into a clean context object for the AI
 * ================================================================
 */

"use strict";

const moment = require("moment-timezone");
const config = require("../config");

// Import existing app models
const User = require("../../../models/User");
const MedicineSchedule = require("../../../models/MedicineSchedule");
const Reminder = require("../../../models/Reminder");
const Appointment = require("../../../models/Appointment");
const HealthRecord = require("../../../models/HealthRecord");

/**
 * Build a complete user health context for the chatbot
 * @param {string} userId - MongoDB user ID
 * @returns {Object} Structured context object
 */
async function buildUserContext(userId) {
  try {
    const [
      user,
      activeSchedules,
      todayReminders,
      recentReminders,
      upcomingAppointments,
      recentAppointments,
      recentHealthRecords,
    ] = await Promise.all([
      fetchUserProfile(userId),
      fetchActiveSchedules(userId),
      fetchTodayReminders(userId),
      fetchRecentReminders(userId),
      fetchUpcomingAppointments(userId),
      fetchRecentAppointments(userId),
      fetchRecentHealthRecords(userId),
    ]);

    const adherenceStats = computeAdherenceStats(recentReminders);
    const lowStockMedicines = activeSchedules.filter((s) => s.isLowStock);
    const missedDosesPattern = analyzeMissedDosesPattern(recentReminders);

    return {
      user: formatUserProfile(user),
      medicines: {
        active: activeSchedules.map(formatSchedule),
        lowStock: lowStockMedicines.map((s) => ({
          name: s.medicineName,
          remaining: s.stock?.remainingQuantity,
          threshold: s.stock?.lowStockThreshold,
        })),
        totalActive: activeSchedules.length,
      },
      reminders: {
        today: formatTodayReminders(todayReminders),
        recent: recentReminders.map(formatReminder),
        adherence: adherenceStats,
        missedPattern: missedDosesPattern,
      },
      appointments: {
        upcoming: upcomingAppointments.map(formatAppointment),
        recent: recentAppointments.map(formatAppointment),
      },
      healthRecords: {
        recent: recentHealthRecords.map(formatHealthRecord),
        total: recentHealthRecords.length,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[ContextBuilder] Error building user context:", error.message);
    // Return minimal context so chat still works
    return {
      user: { id: userId },
      medicines: { active: [], lowStock: [], totalActive: 0 },
      reminders: { today: {}, recent: [], adherence: {}, missedPattern: {} },
      appointments: { upcoming: [], recent: [] },
      healthRecords: { recent: [], total: 0 },
      generatedAt: new Date().toISOString(),
      error: "Partial context — some data unavailable",
    };
  }
}

// ─────────────────────────────────────────────
// Data Fetchers
// ─────────────────────────────────────────────

async function fetchUserProfile(userId) {
  return User.findById(userId).select(
    "name email phone dateOfBirth gender bloodGroup " +
    "medicalHistory allergies notificationPreferences timezone"
  ).lean();
}

async function fetchActiveSchedules(userId) {
  return MedicineSchedule.find({
    user: userId,
    isActive: true,
    isPaused: false,
  })
    .select(
      "medicineName medicineType dosage frequency timings duration " +
      "instructions stock purpose sideEffects reminderSettings " +
      "adherenceScore totalDosesTaken totalDosesMissed lastTakenAt"
    )
    .lean();
}

async function fetchTodayReminders(userId) {
  const timezone = "Asia/Kolkata";
  const startOfDay = moment().tz(timezone).startOf("day").toDate();
  const endOfDay = moment().tz(timezone).endOf("day").toDate();

  return Reminder.find({
    user: userId,
    scheduledTime: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate("schedule", "medicineName medicineType dosage")
    .sort({ scheduledTime: 1 })
    .lean();
}

async function fetchRecentReminders(userId) {
  const since = moment()
    .subtract(config.context.adherenceWindowDays, "days")
    .toDate();

  return Reminder.find({
    user: userId,
    scheduledTime: { $gte: since },
  })
    .sort({ scheduledTime: -1 })
    .limit(config.context.recentRemindersLimit)
    .lean();
}

async function fetchUpcomingAppointments(userId) {
  return Appointment.find({
    patient: userId,
    appointmentDate: { $gte: new Date() },
    status: { $in: ["scheduled", "confirmed"] },
  })
    .populate("doctor", "name specialization")
    .sort({ appointmentDate: 1 })
    .limit(config.context.upcomingRemindersLimit)
    .lean();
}

async function fetchRecentAppointments(userId) {
  return Appointment.find({
    patient: userId,
    status: { $in: ["completed", "cancelled", "no-show"] },
  })
    .populate("doctor", "name specialization")
    .sort({ appointmentDate: -1 })
    .limit(config.context.recentAppointmentsLimit)
    .lean();
}

async function fetchRecentHealthRecords(userId) {
  return HealthRecord.find({
    user: userId,
    isArchived: false,
  })
    .sort({ recordDate: -1 })
    .limit(config.context.recentHealthRecordsLimit)
    .select("recordType title description recordDate tags")
    .lean();
}

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────

function formatUserProfile(user) {
  if (!user) return {};
  return {
    id: user._id,
    name: user.name,
    age: user.dateOfBirth
      ? moment().diff(moment(user.dateOfBirth), "years")
      : null,
    gender: user.gender,
    bloodGroup: user.bloodGroup,
    medicalHistory: user.medicalHistory || [],
    allergies: user.allergies || [],
    timezone: user.timezone || "Asia/Kolkata",
  };
}

function formatSchedule(schedule) {
  return {
    id: schedule._id,
    name: schedule.medicineName,
    type: schedule.medicineType,
    dosage: `${schedule.dosage?.amount} ${schedule.dosage?.unit}`,
    frequency: schedule.frequency,
    timings: schedule.timings?.map((t) => t.time) || [],
    instructions: schedule.instructions?.beforeFood
      ? "before food"
      : schedule.instructions?.afterFood
      ? "after food"
      : schedule.instructions?.withFood
      ? "with food"
      : schedule.instructions?.emptyStomach
      ? "empty stomach"
      : "as directed",
    purpose: schedule.purpose,
    adherenceScore: schedule.adherenceScore,
    totalTaken: schedule.totalDosesTaken,
    totalMissed: schedule.totalDosesMissed,
    lastTaken: schedule.lastTakenAt,
    isLowStock: (schedule.stock?.remainingQuantity || 0) <=
      (schedule.stock?.lowStockThreshold || 5),
    remainingStock: schedule.stock?.remainingQuantity,
    startDate: schedule.duration?.startDate,
    endDate: schedule.duration?.endDate,
    isIndefinite: schedule.duration?.isIndefinite,
  };
}

function formatTodayReminders(reminders) {
  const groups = { taken: [], missed: [], pending: [], upcoming: [] };
  const now = new Date();

  for (const r of reminders) {
    const formatted = {
      id: r._id,
      medicine: r.medicineName || r.schedule?.medicineName,
      scheduledTime: r.scheduledTime,
      status: r.status,
      dosage: r.dosage,
    };

    if (r.status === "taken") groups.taken.push(formatted);
    else if (r.status === "missed") groups.missed.push(formatted);
    else if (r.status === "skipped") groups.missed.push(formatted);
    else if (new Date(r.scheduledTime) < now) groups.missed.push(formatted);
    else if (new Date(r.scheduledTime) <= new Date(now.getTime() + 60 * 60 * 1000))
      groups.pending.push(formatted);
    else groups.upcoming.push(formatted);
  }

  return groups;
}

function formatReminder(reminder) {
  return {
    id: reminder._id,
    medicine: reminder.medicineName,
    scheduledTime: reminder.scheduledTime,
    status: reminder.status,
    takenAt: reminder.takenAt,
    missedAt: reminder.missedAt,
    sideEffectsReported: reminder.sideEffectsReported || [],
    effectivenessRating: reminder.effectivenessRating,
  };
}

function formatAppointment(appointment) {
  return {
    id: appointment._id,
    doctor: appointment.doctor?.name || "Unknown",
    specialization: appointment.doctor?.specialization,
    date: appointment.appointmentDate,
    time: appointment.appointmentTime,
    type: appointment.consultationType,
    status: appointment.status,
    reason: appointment.reason,
    diagnosis: appointment.prescription?.diagnosis,
  };
}

function formatHealthRecord(record) {
  return {
    id: record._id,
    type: record.recordType,
    title: record.title,
    description: record.description,
    date: record.recordDate,
    tags: record.tags || [],
  };
}

// ─────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────

function computeAdherenceStats(reminders) {
  if (!reminders.length) {
    return { rate: null, taken: 0, missed: 0, total: 0 };
  }

  const completed = reminders.filter(
    (r) => r.status === "taken" || r.status === "missed" || r.status === "skipped"
  );
  const taken = reminders.filter((r) => r.status === "taken").length;
  const missed = reminders.filter(
    (r) => r.status === "missed" || r.status === "skipped"
  ).length;

  return {
    rate: completed.length > 0 ? Math.round((taken / completed.length) * 100) : null,
    taken,
    missed,
    total: completed.length,
    windowDays: config.context.adherenceWindowDays,
  };
}

function analyzeMissedDosesPattern(reminders) {
  const missed = reminders.filter(
    (r) => r.status === "missed" || r.status === "skipped"
  );

  if (!missed.length) return { hasMissedPattern: false };

  // Group by medicine name
  const byMedicine = {};
  for (const r of missed) {
    const name = r.medicineName;
    if (!byMedicine[name]) byMedicine[name] = 0;
    byMedicine[name]++;
  }

  // Group by time of day
  const byTimeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const r of missed) {
    const hour = new Date(r.scheduledTime).getHours();
    if (hour < 12) byTimeOfDay.morning++;
    else if (hour < 17) byTimeOfDay.afternoon++;
    else if (hour < 21) byTimeOfDay.evening++;
    else byTimeOfDay.night++;
  }

  return {
    hasMissedPattern: true,
    totalMissed: missed.length,
    byMedicine,
    byTimeOfDay,
    mostMissedMedicine: Object.entries(byMedicine).sort((a, b) => b[1] - a[1])[0]?.[0],
  };
}

module.exports = { buildUserContext };