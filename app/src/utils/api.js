import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS, ERROR_MESSAGES } from '../constants/config';
import { showMessage } from 'react-native-flash-message';
// Simple event emitter (React Native compatible — no Node 'events' module)
const createEventEmitter = () => {
  const listeners = {};
  return {
    on: (event, fn) => { listeners[event] = [...(listeners[event] || []), fn]; },
    off: (event, fn) => { listeners[event] = (listeners[event] || []).filter(l => l !== fn); },
    emit: (event, ...args) => { (listeners[event] || []).forEach(fn => fn(...args)); }
  };
};
export const authEventEmitter = createEventEmitter();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Public routes that are allowed without an auth token
const PUBLIC_ROUTES = [
  '/api/users/login',
  '/api/users/register',
  '/api/users/forgot-password',
  '/api/users/reset-password',
  '/api/users/verify-email',
];

// Request interceptor - Add auth token, and abort protected requests when logged out
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // No token in storage — only allow public routes through
        const isPublic = PUBLIC_ROUTES.some(route => config.url && config.url.includes(route));
        if (!isPublic) {
          // Cancel the request silently — user is logged out, no need to hit the server
          const source = axios.CancelToken.source();
          source.cancel('No auth token — request cancelled (user logged out)');
          config.cancelToken = source.token;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Silently ignore cancelled requests (e.g. fired after logout)
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      showMessage({
        message: 'Network Error',
        description: ERROR_MESSAGES.NETWORK_ERROR,
        type: 'danger',
        icon: 'danger'
      });
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle 401 Unauthorized
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear auth data
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      
      showMessage({
        message: 'Session Expired',
        description: ERROR_MESSAGES.UNAUTHORIZED,
        type: 'warning',
        icon: 'warning'
      });
      
      // Navigate to login (handle in app navigation context)
      authEventEmitter.emit('unauthorized');
    }

    // Handle other errors
    const errorMessage = data?.error || data?.message || ERROR_MESSAGES.SERVER_ERROR;
    
    // Don't show error message for silent requests
    if (!originalRequest.silent) {
      showMessage({
        message: 'Error',
        description: errorMessage,
        type: 'danger',
        icon: 'danger',
        duration: 4000
      });
    }

    return Promise.reject(error);
  }
);

// Helper — returns true for requests cancelled by our own interceptor (logged-out guard)
export const isLogoutCancel = (error) =>
  axios.isCancel(error) && error?.message?.includes('No auth token');

// API Methods
export const apiClient = {
  // GET request
  get: (url, config = {}) => {
    return api.get(url, config);
  },

  // POST request
  post: (url, data, config = {}) => {
    return api.post(url, data, config);
  },

  // PUT request
  put: (url, data, config = {}) => {
    return api.put(url, data, config);
  },

  // PATCH request
  patch: (url, data, config = {}) => {
    return api.patch(url, data, config);
  },

  // DELETE request
  delete: (url, config = {}) => {
    return api.delete(url, config);
  },

  // Upload file
  upload: (url, formData, onProgress) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });
  },

  // Download file
  download: (url, config = {}) => {
    return api.get(url, {
      ...config,
      responseType: 'blob'
    });
  }
};

export default api;