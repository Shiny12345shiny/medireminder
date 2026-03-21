const { Expo } = require('expo-server-sdk');
const logger = require('./logger');

// Create a new Expo SDK client
// Only authenticate with Expo if a real token has been configured
const _expoToken = process.env.EXPO_ACCESS_TOKEN;
const _tokenIsConfigured = _expoToken &&
  _expoToken !== 'your-expo-access-token-from-expo-dev' &&
  _expoToken.trim() !== '';

if (!_tokenIsConfigured) {
  console.warn('[PushNotification] EXPO_ACCESS_TOKEN not set or is placeholder. ' +
    'Push notifications will work in development without authentication. ' +
    'Set a real token from https://expo.dev for production.');
}

const expo = new Expo({
  accessToken: _tokenIsConfigured ? _expoToken : undefined,
  useFcmV1: true
});

// Send push notification to a single device
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  try {
    // Check if the push token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      logger.error('Invalid Expo push token:', pushToken);
      return {
        success: false,
        error: 'Invalid push token'
      };
    }

    // Create the message
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'medicine-reminders'
    };

    // Send the notification
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    const ticket = ticketChunk[0];

    if (ticket.status === 'error') {
      logger.error('Error sending push notification:', ticket.message);
      logger.logNotification('push', pushToken, 'failed', {
        title,
        error: ticket.message
      });

      return {
        success: false,
        error: ticket.message
      };
    }

    logger.logNotification('push', pushToken, 'sent', {
      title,
      ticketId: ticket.id
    });

    return {
      success: true,
      ticketId: ticket.id
    };
  } catch (error) {
    logger.error('Error in sendPushNotification:', error);
    logger.logNotification('push', pushToken, 'failed', {
      title,
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
};

// Send push notifications to multiple devices
const sendBulkPushNotifications = async (notifications) => {
  try {
    // Filter valid push tokens
    const validNotifications = notifications.filter(notification =>
      Expo.isExpoPushToken(notification.to)
    );

    if (validNotifications.length === 0) {
      logger.warn('No valid push tokens found');
      return {
        success: false,
        error: 'No valid push tokens'
      };
    }

    // Create messages
    const messages = validNotifications.map(notification => ({
      to: notification.to,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: notification.priority || 'high',
      channelId: notification.channelId || 'medicine-reminders',
      badge: notification.badge
    }));

    // Chunk messages (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        logger.error('Error sending notification chunk:', error);
      }
    }

    // Process results
    const results = {
      success: [],
      failed: []
    };

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        results.failed.push({
          token: validNotifications[index].to,
          error: ticket.message
        });
        logger.logNotification('push', validNotifications[index].to, 'failed', {
          error: ticket.message
        });
      } else {
        results.success.push({
          token: validNotifications[index].to,
          ticketId: ticket.id
        });
        logger.logNotification('push', validNotifications[index].to, 'sent', {
          ticketId: ticket.id
        });
      }
    });

    logger.info('Bulk push notifications sent', {
      total: notifications.length,
      successful: results.success.length,
      failed: results.failed.length
    });

    return {
      success: true,
      results
    };
  } catch (error) {
    logger.error('Error in sendBulkPushNotifications:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send medicine reminder notification
const sendMedicineReminderNotification = async (pushToken, medicineName, time, dosage) => {
  return await sendPushNotification(
    pushToken,
    '💊 Medicine Reminder',
    `Time to take ${medicineName} - ${dosage}`,
    {
      type: 'medicine-reminder',
      medicineName,
      time,
      dosage,
      action: 'open-reminder'
    }
  );
};

// Send missed dose notification
const sendMissedDoseNotification = async (pushToken, medicineName, time) => {
  return await sendPushNotification(
    pushToken,
    '⚠️ Missed Dose Alert',
    `You missed ${medicineName} scheduled at ${time}`,
    {
      type: 'missed-dose',
      medicineName,
      time,
      action: 'open-reminder'
    }
  );
};

// Send refill alert notification
const sendRefillAlertNotification = async (pushToken, medicineName, remainingDoses) => {
  return await sendPushNotification(
    pushToken,
    '📦 Refill Alert',
    `${medicineName} is running low (${remainingDoses} doses left)`,
    {
      type: 'refill-alert',
      medicineName,
      remainingDoses,
      action: 'open-schedule'
    }
  );
};

// Send appointment reminder notification
const sendAppointmentReminderNotification = async (pushToken, doctorName, time, hoursUntil) => {
  return await sendPushNotification(
    pushToken,
    '👨‍⚕️ Appointment Reminder',
    `Appointment with Dr. ${doctorName} in ${hoursUntil} hours at ${time}`,
    {
      type: 'appointment-reminder',
      doctorName,
      time,
      hoursUntil,
      action: 'open-appointment'
    }
  );
};

// Send appointment confirmation notification
const sendAppointmentConfirmationNotification = async (pushToken, doctorName, date, time) => {
  return await sendPushNotification(
    pushToken,
    '✅ Appointment Confirmed',
    `Your appointment with Dr. ${doctorName} is confirmed for ${date} at ${time}`,
    {
      type: 'appointment-confirmation',
      doctorName,
      date,
      time,
      action: 'open-appointment'
    }
  );
};

// Send general notification
const sendGeneralNotification = async (pushToken, title, body, data = {}) => {
  return await sendPushNotification(pushToken, title, body, {
    type: 'general',
    ...data
  });
};

// Send notification to user (handles multiple tokens)
const sendNotificationToUser = async (user, title, body, data = {}) => {
  if (!user.pushTokens || user.pushTokens.length === 0) {
    logger.warn(`No push tokens found for user ${user._id}`);
    return {
      success: false,
      error: 'No push tokens available'
    };
  }

  // Check user's notification preferences
  if (!user.notificationPreferences || !user.notificationPreferences.push) {
    logger.info(`Push notifications disabled for user ${user._id}`);
    return {
      success: false,
      error: 'Push notifications disabled'
    };
  }

  const notifications = user.pushTokens.map(tokenObj => ({
    to: tokenObj.token,
    title,
    body,
    data
  }));

  return await sendBulkPushNotifications(notifications);
};

// Check notification receipts (to verify delivery)
const checkNotificationReceipts = async (ticketIds) => {
  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);
    const receipts = [];

    for (const chunk of receiptIdChunks) {
      try {
        const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        receipts.push(receiptChunk);
      } catch (error) {
        logger.error('Error fetching notification receipts:', error);
      }
    }

    const results = {
      delivered: [],
      failed: []
    };

    receipts.forEach(receiptChunk => {
      Object.keys(receiptChunk).forEach(receiptId => {
        const receipt = receiptChunk[receiptId];
        
        if (receipt.status === 'ok') {
          results.delivered.push(receiptId);
        } else if (receipt.status === 'error') {
          results.failed.push({
            receiptId,
            error: receipt.message,
            details: receipt.details
          });
          
          logger.error('Notification delivery failed:', {
            receiptId,
            error: receipt.message,
            details: receipt.details
          });
        }
      });
    });

    return results;
  } catch (error) {
    logger.error('Error checking notification receipts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Schedule notification (returns notification object to be stored)
const scheduleNotification = (pushToken, title, body, scheduledTime, data = {}) => {
  return {
    pushToken,
    title,
    body,
    scheduledTime,
    data,
    status: 'scheduled',
    createdAt: new Date()
  };
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  sendMedicineReminderNotification,
  sendMissedDoseNotification,
  sendRefillAlertNotification,
  sendAppointmentReminderNotification,
  sendAppointmentConfirmationNotification,
  sendGeneralNotification,
  sendNotificationToUser,
  checkNotificationReceipts,
  scheduleNotification
};