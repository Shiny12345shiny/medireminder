const cron = require('node-cron');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const logger = require('../utils/logger');
const MedicineSchedule = require('../models/MedicineSchedule');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendMedicineReminderEmail, sendMissedDoseEmail, sendRefillAlertEmail } = require('../utils/emailService');
const { 
  sendMedicineReminderNotification, 
  sendMissedDoseNotification,
  sendRefillAlertNotification 
} = require('../utils/pushNotificationService');
const { emitToUser } = require('../services/socketService');

// Track sent reminders to avoid duplicates
const sentReminders = new Set();

// Create reminders for upcoming doses
const createUpcomingReminders = async () => {
  try {
    logger.logCron('createUpcomingReminders', 'started');

    // Get all active schedules
    const schedules = await MedicineSchedule.find({
      isActive: true,
      isPaused: false,
    }).populate('user');

    let remindersCreated = 0;

    for (const schedule of schedules) {
      // Skip if schedule is expired
      if (schedule.isExpired) continue;

      // Skip if start date is in the future
      const now = new Date();
      if (new Date(schedule.duration.startDate) > now) continue;

      // Get user timezone, default to IST
      const userTimezone = schedule.user?.timezone || 'Asia/Kolkata';

      // Check today and tomorrow in the user's local timezone
      for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
        const checkDate = moment().tz(userTimezone).add(dayOffset, 'days');

        for (const timing of (schedule.timings || [])) {
          const [hours, minutes] = timing.time.split(':');

          // Build scheduled time in the user's local timezone
          const scheduledTime = checkDate.clone()
            .startOf('day')
            .add(parseInt(hours), 'hours')
            .add(parseInt(minutes), 'minutes')
            .toDate();

          // Only create reminders up to 25 hours in the future
          const hoursAhead = (scheduledTime - now) / (1000 * 60 * 60);
          if (hoursAhead < 0 || hoursAhead > 25) continue;

          // Check if reminder already exists
          const existingReminder = await Reminder.findOne({
            user: schedule.user._id,
            schedule: schedule._id,
            scheduledTime: scheduledTime,
            status: { $in: ['pending', 'sent', 'snoozed'] }
          });

          if (!existingReminder) {
            await Reminder.create({
              user: schedule.user._id,
              schedule: schedule._id,
              medicineName: schedule.medicineName,
              scheduledTime: scheduledTime,
              dosage: {
                amount: schedule.dosage.amount,
                unit: schedule.dosage.unit
              },
              status: 'pending'
            });

            remindersCreated++;
            logger.info(`Created reminder for ${schedule.medicineName} at ${scheduledTime}`);
          }
        }
      }
    }

    logger.logCron('createUpcomingReminders', 'completed', { remindersCreated });
  } catch (error) {
    logger.error('Error in createUpcomingReminders:', error);
    logger.logCron('createUpcomingReminders', 'failed', { error: error.message });
  }
};

// Send reminders for upcoming doses
const sendReminders = async () => {
  try {
    logger.logCron('sendReminders', 'started');

    // Always ensure reminders are created before trying to send
    await createUpcomingReminders();

    const now = new Date();
    const advanceTime = parseInt(process.env.REMINDER_ADVANCE_TIME) || 15; // minutes
    const futureTime = new Date(now.getTime() + advanceTime * 60000);

    // Get pending reminders due within advance time window
    const reminders = await Reminder.find({
      status: 'pending',
      scheduledTime: {
        $gte: now,
        $lte: futureTime
      }
    }).populate('user schedule');

    let remindersSent = 0;

    for (const reminder of reminders) {
      const reminderId = reminder._id.toString();
      
      // Skip if already sent (duplicate check)
      if (sentReminders.has(reminderId)) continue;

      const user = reminder.user;
      const schedule = reminder.schedule;

      if (!user || !schedule) continue;

      // Check user's notification preferences
      const preferences = user.notificationPreferences || {};

      let notificationSent = false;

      // Send push notification
      if (preferences.push !== false && user.pushTokens && user.pushTokens.length > 0) {
        for (const tokenObj of user.pushTokens) {
          const result = await sendMedicineReminderNotification(
            tokenObj.token,
            schedule.medicineName,
            reminder.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            `${schedule.dosage.amount} ${schedule.dosage.unit}`
          );

          if (result.success) {
            await reminder.addNotification('push', 'sent', { pushToken: tokenObj.token });
            notificationSent = true;
          }
        }
      }

      // Send email notification
      if (preferences.email !== false && user.email) {
        const emailResult = await sendMedicineReminderEmail(user, {
          medicineName: schedule.medicineName,
          time: reminder.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          dosage: schedule.dosage
        });

        if (emailResult.success) {
          await reminder.addNotification('email', 'sent', { emailAddress: user.email });
          notificationSent = true;
        }
      }

      // Send real-time notification via socket
      emitToUser(user._id, 'reminder:new', {
        reminderId: reminder._id,
        medicineName: schedule.medicineName,
        scheduledTime: reminder.scheduledTime,
        dosage: schedule.dosage
      });

      if (notificationSent) {
        sentReminders.add(reminderId);
        remindersSent++;
        logger.info(`Sent reminder for ${schedule.medicineName} to ${user.name}`);
      }
    }

    logger.logCron('sendReminders', 'completed', { remindersSent });
  } catch (error) {
    logger.error('Error in sendReminders:', error);
    logger.logCron('sendReminders', 'failed', { error: error.message });
  }
};

// Check for missed doses and send escalation
const checkMissedDoses = async () => {
  try {
    logger.logCron('checkMissedDoses', 'started');

    const now = new Date();

    // Get reminders that are overdue — include 'pending' so reminders
    // that were never sent (push token missing, cron missed window, etc.)
    // still get marked as missed after 60 minutes
    const overdueReminders = await Reminder.find({
      status: { $in: ['pending', 'sent', 'snoozed'] },
      scheduledTime: { $lt: now }
    }).populate('user schedule');

    let missedDosesMarked = 0;
    let escalationsSent = 0;

    for (const reminder of overdueReminders) {
      const user = reminder.user;
      const schedule = reminder.schedule;

      if (!user || !schedule) continue;

      const minutesOverdue = (now - reminder.scheduledTime) / (1000 * 60);

      // If more than 60 minutes overdue, mark as missed
      if (minutesOverdue > 60) {
        await reminder.markAsMissed();
        missedDosesMarked++;

        // Send missed dose notification
        const preferences = user.notificationPreferences || {};

        if (preferences.push !== false && user.pushTokens && user.pushTokens.length > 0) {
          for (const tokenObj of user.pushTokens) {
            await sendMissedDoseNotification(
              tokenObj.token,
              schedule.medicineName,
              reminder.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            );
          }
        }

        if (preferences.email !== false && user.email) {
          await sendMissedDoseEmail(user, {
            medicineName: schedule.medicineName,
            time: reminder.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          });
        }

        // Emit real-time notification
        emitToUser(user._id, 'reminder:missed', {
          reminderId: reminder._id,
          medicineName: schedule.medicineName,
          scheduledTime: reminder.scheduledTime
        });

        logger.info(`Marked missed dose: ${schedule.medicineName} for ${user.name}`);
      }
      // Send escalation if enabled and within escalation window
      else if (schedule.reminderSettings?.escalationEnabled) {
        const escalationInterval = schedule.reminderSettings.escalationInterval || 5;
        const maxEscalations = schedule.reminderSettings.maxEscalations || 3;

        if (reminder.escalationAttempts < maxEscalations) {
          const timeSinceLastEscalation = reminder.lastEscalationAt
            ? (now - reminder.lastEscalationAt) / (1000 * 60)
            : minutesOverdue;

          if (timeSinceLastEscalation >= escalationInterval) {
            await reminder.escalate();

            // Send escalation notification
            const preferences = user.notificationPreferences || {};

            if (preferences.push !== false && user.pushTokens && user.pushTokens.length > 0) {
              for (const tokenObj of user.pushTokens) {
                await sendMedicineReminderNotification(
                  tokenObj.token,
                  schedule.medicineName,
                  reminder.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  `${schedule.dosage.amount} ${schedule.dosage.unit}`
                );
              }
            }

            // Emit real-time escalation
            emitToUser(user._id, 'reminder:escalation', {
              reminderId: reminder._id,
              medicineName: schedule.medicineName,
              escalationAttempt: reminder.escalationAttempts
            });

            escalationsSent++;
            logger.info(`Sent escalation ${reminder.escalationAttempts} for ${schedule.medicineName}`);
          }
        }
      }
    }

    logger.logCron('checkMissedDoses', 'completed', { missedDosesMarked, escalationsSent });
  } catch (error) {
    logger.error('Error in checkMissedDoses:', error);
    logger.logCron('checkMissedDoses', 'failed', { error: error.message });
  }
};

// Check for refill alerts
const checkRefillAlerts = async () => {
  try {
    logger.logCron('checkRefillAlerts', 'started');

    const schedules = await MedicineSchedule.find({
      isActive: true,
      'refillReminder.enabled': true
    }).populate('user');

    let alertsSent = 0;

    for (const schedule of schedules) {
      const user = schedule.user;
      
      if (!user) continue;

      // Check if low on stock
      if (schedule.isLowStock) {
        const daysUntilOut = schedule.daysUntilStockOut;
        const reminderDays = schedule.refillReminder.daysBeforeRunOut || 3;

        if (daysUntilOut <= reminderDays) {
          // Check if alert already sent today
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Simple check - in production, store last alert date in schedule
          const preferences = user.notificationPreferences || {};

          if (preferences.push !== false && user.pushTokens && user.pushTokens.length > 0) {
            for (const tokenObj of user.pushTokens) {
              await sendRefillAlertNotification(
                tokenObj.token,
                schedule.medicineName,
                schedule.stock.remainingQuantity
              );
            }
          }

          if (preferences.email !== false && user.email) {
            await sendRefillAlertEmail(user, schedule.medicineName, schedule.stock.remainingQuantity);
          }

          // Emit real-time notification
          emitToUser(user._id, 'refill:alert', {
            scheduleId: schedule._id,
            medicineName: schedule.medicineName,
            remainingQuantity: schedule.stock.remainingQuantity,
            daysUntilOut
          });

          alertsSent++;
          logger.info(`Sent refill alert for ${schedule.medicineName} to ${user.name}`);
        }
      }
    }

    logger.logCron('checkRefillAlerts', 'completed', { alertsSent });
  } catch (error) {
    logger.error('Error in checkRefillAlerts:', error);
    logger.logCron('checkRefillAlerts', 'failed', { error: error.message });
  }
};

// Clean up old reminders
const cleanupOldReminders = async () => {
  try {
    logger.logCron('cleanupOldReminders', 'started');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Reminder.deleteMany({
      scheduledTime: { $lt: thirtyDaysAgo },
      status: { $in: ['taken', 'missed', 'skipped'] }
    });

    logger.logCron('cleanupOldReminders', 'completed', { deletedCount: result.deletedCount });
  } catch (error) {
    logger.error('Error in cleanupOldReminders:', error);
    logger.logCron('cleanupOldReminders', 'failed', { error: error.message });
  }
};

// Clear sent reminders cache periodically
const clearSentRemindersCache = () => {
  sentReminders.clear();
  logger.info('Cleared sent reminders cache');
};

// Start all cron jobs
const startCronJobs = () => {
  // Create upcoming reminders - every hour
  cron.schedule('0 * * * *', createUpcomingReminders);
  logger.info('Scheduled: createUpcomingReminders (hourly)');

  // Send reminders - every 5 minutes
  cron.schedule('*/5 * * * *', sendReminders);
  logger.info('Scheduled: sendReminders (every 5 minutes)');

  // Check missed doses - every 10 minutes
  cron.schedule('*/10 * * * *', checkMissedDoses);
  logger.info('Scheduled: checkMissedDoses (every 10 minutes)');

  // Check refill alerts - daily at 9 AM
  cron.schedule('0 9 * * *', checkRefillAlerts);
  logger.info('Scheduled: checkRefillAlerts (daily at 9 AM)');

  // Clean up old reminders - daily at 2 AM
  cron.schedule('0 2 * * *', cleanupOldReminders);
  logger.info('Scheduled: cleanupOldReminders (daily at 2 AM)');

  // Clear sent reminders cache - every hour
  cron.schedule('0 * * * *', clearSentRemindersCache);
  logger.info('Scheduled: clearSentRemindersCache (hourly)');

  // Run initial jobs
  createUpcomingReminders();
  logger.info('All cron jobs started successfully');
};

module.exports = {
  startCronJobs,
  createUpcomingReminders,
  sendReminders,
  checkMissedDoses,
  checkRefillAlerts,
  cleanupOldReminders
};