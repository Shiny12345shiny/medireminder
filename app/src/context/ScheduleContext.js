import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { showSuccessMessage, showErrorMessage } from '../utils/helpers';

const ScheduleContext = createContext({});

export const ScheduleProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { onScheduleCreated, onScheduleUpdated, onScheduleDeleted, onScheduleRefilled } = useSocket();

  const [schedules, setSchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [lowStockSchedules, setLowStockSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
  if (isAuthenticated) {
    loadSchedules();
    loadTodaySchedules();
    loadLowStockSchedules();
    setupSocketListeners();
  } else {
    // Clear all data when logged out so stale calls don't re-populate
    setSchedules([]);
    setTodaySchedules([]);
    setLowStockSchedules([]);
  }

  return () => {
    // Cleanup socket listeners if needed
  };
}, [isAuthenticated]);

  const setupSocketListeners = () => {
    // Listen for schedule updates via socket
    onScheduleCreated((data) => {
      console.log('Schedule created:', data);
      loadSchedules();
      loadTodaySchedules();
    });

    onScheduleUpdated((data) => {
      console.log('Schedule updated:', data);
      loadSchedules();
      loadTodaySchedules();
    });

    onScheduleDeleted((data) => {
      console.log('Schedule deleted:', data);
      loadSchedules();
      loadTodaySchedules();
    });

    onScheduleRefilled((data) => {
      console.log('Schedule refilled:', data);
      loadSchedules();
      loadLowStockSchedules();
    });
  };

  const loadSchedules = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await apiClient.get(API_ENDPOINTS.SCHEDULES);
      setSchedules(response.data || response || []);

      return { success: true, data: response.data || response  };
    } catch (error) {
      console.error('Error loading schedules:', error);
      return { success: false, error };
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadTodaySchedules = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TODAY_SCHEDULES);
      setTodaySchedules(response.data || response || []);
      return { success: true, data: response.data || response  };
    } catch (error) {
      console.error('Error loading today schedules:', error);
      return { success: false, error };
    }
  };

  const loadLowStockSchedules = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.LOW_STOCK_SCHEDULES);
      setLowStockSchedules(response.data || response || []);
      return { success: true, data: response.data || response  };
    } catch (error) {
      console.error('Error loading low stock schedules:', error);
      return { success: false, error };
    }
  };

  const refreshSchedules = async () => {
    setRefreshing(true);
    await Promise.all([
      loadSchedules(true),
      loadTodaySchedules(),
      loadLowStockSchedules()
    ]);
    setRefreshing(false);
  };

  const createSchedule = async (scheduleData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.SCHEDULES, scheduleData);
      
      showSuccessMessage('Schedule Created', `${scheduleData.medicineName} schedule has been created`);
      
      await loadSchedules();
      await loadTodaySchedules();

      //return { success: true, data: response.data };
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('Error creating schedule:', error);
      showErrorMessage('Creation Failed', error.response?.data?.error || 'Failed to create schedule');
      return { success: false, error };
    }
  };

  const getSchedule = async (scheduleId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SCHEDULE_DETAIL(scheduleId));
      //return { success: true, data: response.data };
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('Error getting schedule:', error);
      return { success: false, error };
    }
  };

  const updateSchedule = async (scheduleId, scheduleData) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.SCHEDULE_DETAIL(scheduleId),
        scheduleData
      );

      showSuccessMessage('Schedule Updated', 'Medicine schedule has been updated');

      await loadSchedules();
      await loadTodaySchedules();

      //return { success: true, data: response.data };
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('Error updating schedule:', error);
      showErrorMessage('Update Failed', error.response?.data?.error || 'Failed to update schedule');
      return { success: false, error };
    }
  };

  const deleteSchedule = async (scheduleId) => {
    try {
      await apiClient.delete(API_ENDPOINTS.SCHEDULE_DETAIL(scheduleId));

      showSuccessMessage('Schedule Deleted', 'Medicine schedule has been deleted');

      await loadSchedules();
      await loadTodaySchedules();

      return { success: true };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showErrorMessage('Deletion Failed', error.response?.data?.error || 'Failed to delete schedule');
      return { success: false, error };
    }
  };

  const pauseSchedule = async (scheduleId, pauseUntil = null) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.PAUSE_SCHEDULE(scheduleId),
        { pauseUntil }
      );

      showSuccessMessage('Schedule Paused', 'Medicine schedule has been paused');

      await loadSchedules();
      await loadTodaySchedules();

      //return { success: true, data: response.data };
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('Error pausing schedule:', error);
      showErrorMessage('Pause Failed', error.response?.data?.error || 'Failed to pause schedule');
      return { success: false, error };
    }
  };

  const resumeSchedule = async (scheduleId) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.RESUME_SCHEDULE(scheduleId));

      showSuccessMessage('Schedule Resumed', 'Medicine schedule has been resumed');

      await loadSchedules();
      await loadTodaySchedules();

      //return { success: true, data: response.data };
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('Error resuming schedule:', error);
      showErrorMessage('Resume Failed', error.response?.data?.error || 'Failed to resume schedule');
      return { success: false, error };
    }
  };

  const refillStock = async (scheduleId, quantity) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.REFILL_STOCK(scheduleId),
        { quantity }
      );

      showSuccessMessage('Stock Refilled', `Added ${quantity} units to stock`);

      await loadSchedules();
      await loadLowStockSchedules();

      //return { success: true, data: response.data };
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('Error refilling stock:', error);
      showErrorMessage('Refill Failed', error.response?.data?.error || 'Failed to refill stock');
      return { success: false, error };
    }
  };

  const getAdherenceStats = async (scheduleId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SCHEDULE_ADHERENCE(scheduleId));
      //return { success: true, data: response.data };
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('Error getting adherence stats:', error);
      return { success: false, error };
    }
  };

  const value = {
    schedules,
    todaySchedules,
    lowStockSchedules,
    loading,
    refreshing,
    loadSchedules,
    loadTodaySchedules,
    loadLowStockSchedules,
    refreshSchedules,
    createSchedule,
    getSchedule,
    updateSchedule,
    deleteSchedule,
    pauseSchedule,
    resumeSchedule,
    refillStock,
    getAdherenceStats
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

export default ScheduleContext;