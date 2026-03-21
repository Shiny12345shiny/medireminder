import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';
import { useAuth } from '../context/AuthContext';

const useAppointments = (options = {}) => {
  const {
    autoLoad = true,
    filters = {}
  } = options;

  const { isAuthenticated } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadAppointments = useCallback(async (customFilters = {}) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    
    try {
      const params = { ...filters, ...customFilters };
      const response = await apiClient.get(API_ENDPOINTS.CONSULTATIONS, { params });
      setAppointments(response.data || []);
      return response.data;
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(err.response?.data?.error || 'Failed to load appointments');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters, isAuthenticated]);

  const getAppointment = useCallback(async (appointmentId) => {
    if (!isAuthenticated) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.APPOINTMENT_DETAIL(appointmentId));
      return response.data;
    } catch (err) {
      console.error('Error getting appointment:', err);
      throw err;
    }
  }, [isAuthenticated]);

  const bookAppointment = useCallback(async (appointmentData) => {
    if (!isAuthenticated) return;
    try {
      const response = await apiClient.post(API_ENDPOINTS.BOOK_APPOINTMENT, appointmentData);
      await loadAppointments();
      return response.data;
    } catch (err) {
      console.error('Error booking appointment:', err);
      throw err;
    }
  }, [loadAppointments, isAuthenticated]);

  const confirmAppointment = useCallback(async (appointmentId) => {
    if (!isAuthenticated) return;
    try {
      await apiClient.put(API_ENDPOINTS.CONFIRM_APPOINTMENT(appointmentId));
      await loadAppointments();
    } catch (err) {
      console.error('Error confirming appointment:', err);
      throw err;
    }
  }, [loadAppointments, isAuthenticated]);

  const cancelAppointment = useCallback(async (appointmentId, reason = '') => {
    if (!isAuthenticated) return;
    try {
      await apiClient.put(API_ENDPOINTS.CANCEL_APPOINTMENT(appointmentId), { reason });
      await loadAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      throw err;
    }
  }, [loadAppointments, isAuthenticated]);

  const rateAppointment = useCallback(async (appointmentId, score, review = '') => {
    if (!isAuthenticated) return;
    try {
      await apiClient.post(API_ENDPOINTS.RATE_APPOINTMENT(appointmentId), {
        score,
        review
      });
      await loadAppointments();
    } catch (err) {
      console.error('Error rating appointment:', err);
      throw err;
    }
  }, [loadAppointments, isAuthenticated]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      await loadAppointments();
    } finally {
      setRefreshing(false);
    }
  }, [loadAppointments, isAuthenticated]);

  // Clear data on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setAppointments([]);
      setError(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (autoLoad && isAuthenticated) {
      loadAppointments();
    }
  }, [autoLoad, isAuthenticated]);

  return {
    appointments,
    loading,
    refreshing,
    error,
    loadAppointments,
    getAppointment,
    bookAppointment,
    confirmAppointment,
    cancelAppointment,
    rateAppointment,
    refresh
  };
};

export default useAppointments;