import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';
import { useAuth } from '../context/AuthContext';

const useReminders = (options = {}) => {
  const {
    autoLoad = true,
    filters = {}
  } = options;

  const { isAuthenticated } = useAuth();

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadReminders = useCallback(async (customFilters = {}) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    
    try {
      const params = { ...filters, ...customFilters };
      const response = await apiClient.get(API_ENDPOINTS.REMINDERS, { params });
      setReminders(response.data || []);
      return response.data;
    } catch (err) {
      console.error('Error loading reminders:', err);
      setError(err.response?.data?.error || 'Failed to load reminders');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters, isAuthenticated]);

  const loadTodayReminders = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.TODAY_REMINDERS);
      const allReminders = [
        ...(response.data.taken || []),
        ...(response.data.missed || []),
        ...(response.data.pending || []),
        ...(response.data.upcoming || [])
      ];
      setReminders(allReminders);
      return response.data;
    } catch (err) {
      console.error('Error loading today reminders:', err);
      setError(err.response?.data?.error || 'Failed to load reminders');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const confirmReminder = useCallback(async (reminderId, notes = '') => {
    if (!isAuthenticated) return;
    try {
      await apiClient.post(API_ENDPOINTS.CONFIRM_REMINDER(reminderId), {
        notes,
        takenAt: new Date()
      });
      await loadReminders();
    } catch (err) {
      console.error('Error confirming reminder:', err);
      throw err;
    }
  }, [loadReminders, isAuthenticated]);

  const snoozeReminder = useCallback(async (reminderId, minutes = 10) => {
    if (!isAuthenticated) return;
    try {
      await apiClient.post(API_ENDPOINTS.SNOOZE_REMINDER(reminderId), {
        minutes
      });
      await loadReminders();
    } catch (err) {
      console.error('Error snoozing reminder:', err);
      throw err;
    }
  }, [loadReminders, isAuthenticated]);

  const skipReminder = useCallback(async (reminderId, reason = '') => {
    if (!isAuthenticated) return;
    try {
      await apiClient.post(API_ENDPOINTS.SKIP_REMINDER(reminderId), {
        reason
      });
      await loadReminders();
    } catch (err) {
      console.error('Error skipping reminder:', err);
      throw err;
    }
  }, [loadReminders, isAuthenticated]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      await loadReminders();
    } finally {
      setRefreshing(false);
    }
  }, [loadReminders, isAuthenticated]);

  // Clear reminders when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      setReminders([]);
      setError(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (autoLoad && isAuthenticated) {
      loadReminders();
    }
  }, [autoLoad, isAuthenticated]);

  return {
    reminders,
    loading,
    refreshing,
    error,
    loadReminders,
    loadTodayReminders,
    confirmReminder,
    snoozeReminder,
    skipReminder,
    refresh
  };
};

export default useReminders;