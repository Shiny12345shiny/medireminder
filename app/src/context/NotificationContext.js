import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../utils/api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants/config';
import { useAuth } from './AuthContext';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext({});

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    push: true,
    sms: false,
    reminderAdvanceTime: 15
  });

  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
      loadNotificationPreferences();
    }

    // Setup notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return;
      }

      // Get push token
      //const token = (await Notifications.getExpoPushTokenAsync({ projectId: '159db026-f27d-44a0-9904-aa14952a62ee' })).data;

      const token = (await Notifications.getExpoPushTokenAsync({ projectId: '159db026-f27d-44a0-9904-aa14952a62ee' })).data;

      setExpoPushToken(token);

      // Store token locally
      await SecureStore.setItemAsync(STORAGE_KEYS.PUSH_TOKEN, token);

      // Register token with backend
      await registerTokenWithBackend(token);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medicine-reminders', {
          name: 'Medicine Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#667eea',
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const registerTokenWithBackend = async (token) => {
    try {
      await apiClient.post(API_ENDPOINTS.ADD_PUSH_TOKEN, {
        token,
        device: Device.modelName || 'Unknown',
        platform: Platform.OS
      });
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  };

  const unregisterPushToken = async () => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.PUSH_TOKEN);
      if (token) {
        await apiClient.delete(API_ENDPOINTS.REMOVE_PUSH_TOKEN, {
          data: { token }
        });
        await SecureStore.deleteItemAsync(STORAGE_KEYS.PUSH_TOKEN);
        setExpoPushToken('');
      }
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATION_PREFERENCES);
      setNotificationPreferences(response.data);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const updateNotificationPreferences = async (preferences) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.NOTIFICATION_PREFERENCES, preferences);
      setNotificationPreferences(response.data);
      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { success: false, error };
    }
  };

  const scheduleLocalNotification = async (title, body, data = {}, triggerTime) => {
    try {
      const trigger = triggerTime ? { date: new Date(triggerTime) } : null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  };

  const cancelLocalNotification = async (notificationId) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const cancelAllLocalNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  };

  const getAllScheduledNotifications = async () => {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  };

  const handleNotificationResponse = (response) => {
    const data = response.notification.request.content.data;

    // Handle different notification types
    switch (data.type) {
      case 'medicine-reminder':
        // Navigate to reminder screen
        console.log('Navigate to reminder:', data.reminderId);
        break;
      case 'appointment-reminder':
        // Navigate to appointment screen
        console.log('Navigate to appointment:', data.appointmentId);
        break;
      case 'refill-alert':
        // Navigate to schedule screen
        console.log('Navigate to schedule:', data.scheduleId);
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  };

  const sendTestNotification = async () => {
    try {
      await scheduleLocalNotification(
        'Test Notification',
        'This is a test notification from Smart Medicine Reminder',
        { type: 'test' },
        new Date(Date.now() + 5000) // 5 seconds from now
      );
      return { success: true };
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { success: false, error };
    }
  };

  const getBadgeCount = async () => {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  };

  const setBadgeCount = async (count) => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  };

  const clearBadge = async () => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  };

  const value = {
    expoPushToken,
    notification,
    notificationPreferences,
    registerForPushNotifications,
    unregisterPushToken,
    updateNotificationPreferences,
    scheduleLocalNotification,
    cancelLocalNotification,
    cancelAllLocalNotifications,
    getAllScheduledNotifications,
    sendTestNotification,
    getBadgeCount,
    setBadgeCount,
    clearBadge
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;