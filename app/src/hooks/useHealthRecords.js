import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';
import { API_ENDPOINTS } from '../constants/config';

const useHealthRecords = (options = {}) => {
  const {
    autoLoad = true,
    filters = {}
  } = options;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadRecords = useCallback(async (customFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = { ...filters, ...customFilters };
      const response = await apiClient.get(API_ENDPOINTS.HEALTH_RECORDS, { params });
      setRecords(response.data || []);
      return response.data;
    } catch (err) {
      console.error('Error loading health records:', err);
      setError(err.response?.data?.error || 'Failed to load health records');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const getRecord = useCallback(async (recordId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH_RECORD_DETAIL(recordId));
      return response.data;
    } catch (err) {
      console.error('Error getting health record:', err);
      throw err;
    }
  }, []);

  const createRecord = useCallback(async (recordData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.HEALTH_RECORDS, recordData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await loadRecords();
      return response.data;
    } catch (err) {
      console.error('Error creating health record:', err);
      throw err;
    }
  }, [loadRecords]);

  const updateRecord = useCallback(async (recordId, recordData) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.HEALTH_RECORD_DETAIL(recordId),
        recordData
      );
      await loadRecords();
      return response.data;
    } catch (err) {
      console.error('Error updating health record:', err);
      throw err;
    }
  }, [loadRecords]);

  const deleteRecord = useCallback(async (recordId) => {
    try {
      await apiClient.delete(API_ENDPOINTS.HEALTH_RECORD_DETAIL(recordId));
      await loadRecords();
    } catch (err) {
      console.error('Error deleting health record:', err);
      throw err;
    }
  }, [loadRecords]);

  const toggleFavorite = useCallback(async (recordId) => {
    try {
      await apiClient.post(`${API_ENDPOINTS.HEALTH_RECORD_DETAIL(recordId)}/favorite`);
      await loadRecords();
    } catch (err) {
      console.error('Error toggling favorite:', err);
      throw err;
    }
  }, [loadRecords]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRecords();
    } finally {
      setRefreshing(false);
    }
  }, [loadRecords]);

  useEffect(() => {
    if (autoLoad) {
      loadRecords();
    }
  }, [autoLoad, loadRecords]);

  return {
    records,
    loading,
    refreshing,
    error,
    loadRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    toggleFavorite,
    refresh
  };
};

export default useHealthRecords;