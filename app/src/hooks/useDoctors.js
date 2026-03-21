import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';

const useDoctors = (options = {}) => {
  const {
    autoLoad = true,
    filters = {}
  } = options;

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadDoctors = useCallback(async (customFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = { ...filters, ...customFilters };
      const response = await apiClient.get(API_ENDPOINTS.DOCTORS, { params });
      setDoctors(response.data || []);
      return response.data;
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError(err.response?.data?.error || 'Failed to load doctors');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const getDoctor = useCallback(async (doctorId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOCTOR_DETAIL(doctorId));
      return response.data;
    } catch (err) {
      console.error('Error getting doctor:', err);
      throw err;
    }
  }, []);

  const getDoctorAvailability = useCallback(async (doctorId, date) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOCTOR_AVAILABILITY(doctorId), {
        params: { date }
      });
      return response.data;
    } catch (err) {
      console.error('Error getting doctor availability:', err);
      throw err;
    }
  }, []);

  const searchDoctors = useCallback(async (searchQuery) => {
    return loadDoctors({ search: searchQuery });
  }, [loadDoctors]);

  const filterBySpecialization = useCallback(async (specialization) => {
    return loadDoctors({ specialization });
  }, [loadDoctors]);

  const getNearbyDoctors = useCallback(async (latitude, longitude, radius = 10) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NEARBY_DOCTORS, {
        params: { latitude, longitude, radius }
      });
      setDoctors(response.data || []);
      return response.data;
    } catch (err) {
      console.error('Error getting nearby doctors:', err);
      throw err;
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDoctors();
    } finally {
      setRefreshing(false);
    }
  }, [loadDoctors]);

  useEffect(() => {
    if (autoLoad) {
      loadDoctors();
    }
  }, [autoLoad, loadDoctors]);

  return {
    doctors,
    loading,
    refreshing,
    error,
    loadDoctors,
    getDoctor,
    getDoctorAvailability,
    searchDoctors,
    filterBySpecialization,
    getNearbyDoctors,
    refresh
  };
};

export default useDoctors;