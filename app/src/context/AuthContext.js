import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, authEventEmitter } from '../utils/api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants/config';
import { showSuccessMessage, showErrorMessage } from '../utils/helpers';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Listen for unauthorized events from api.js (e.g. expired JWT)
  useEffect(() => {
    const handleUnauthorized = async () => {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    };

    authEventEmitter.on('unauthorized', handleUnauthorized);
    return () => {
      authEventEmitter.off('unauthorized', handleUnauthorized);
    };
  }, []);

  

  const loadStoredAuth = async () => {
  try {
    const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    const storedUser = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);

    if (storedToken && storedUser) {
      // Verify token is still valid against the server BEFORE trusting it
      try {
        const response = await apiClient.get(API_ENDPOINTS.PROFILE, { silent: true });
        // Token is valid — use the fresh profile data from server
        setToken(storedToken);
        //setUser(response.data || JSON.parse(storedUser));
        setUser(response || JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (verifyError) {
        // Token is expired or invalid — clear everything, send to login
        console.log('Stored token invalid, clearing auth...');
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    }
  } catch (error) {
    console.error('Error loading stored auth:', error);
  } finally {
    setLoading(false);
  }
};

  const login = async (email, password) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
        email,
        password
      });

      const { data } = response;
      const { token: authToken, ...userData } = data;

      // Store auth data
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, authToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);

      showSuccessMessage('Login Successful', `Welcome back, ${userData.name}!`);

      return { success: true, data: userData };
    } catch (error) {
      console.error('Login error:', error);
      showErrorMessage('Login Failed', error.response?.data?.error || 'Invalid credentials');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.REGISTER, userData);

      const { data } = response;
      const { token: authToken, ...userInfo } = data;

      // Store auth data
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, authToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userInfo));

      setToken(authToken);
      setUser(userInfo);
      setIsAuthenticated(true);

      showSuccessMessage('Registration Successful', `Welcome, ${userInfo.name}!`);

      return { success: true, data: userInfo };
    } catch (error) {
      console.error('Registration error:', error);
      showErrorMessage('Registration Failed', error.response?.data?.error || 'Registration failed');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      await apiClient.post(API_ENDPOINTS.LOGOUT);

      // Clear stored data
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      showSuccessMessage('Logged Out', 'You have been logged out successfully');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      
      // Clear local data even if API call fails
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      return { success: true };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.PROFILE, profileData);

      const { data } = response;

      // Update stored user data
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(data));

      setUser(data);

      showSuccessMessage('Profile Updated', 'Your profile has been updated successfully');

      return { success: true, data };
    } catch (error) {
      console.error('Update profile error:', error);
      showErrorMessage('Update Failed', error.response?.data?.error || 'Failed to update profile');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      await apiClient.put(API_ENDPOINTS.UPDATE_PASSWORD, {
        currentPassword,
        newPassword
      });

      showSuccessMessage('Password Updated', 'Your password has been changed successfully');

      return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
      showErrorMessage('Update Failed', error.response?.data?.error || 'Failed to update password');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });

      showSuccessMessage('Email Sent', 'Password reset instructions have been sent to your email');

      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      showErrorMessage('Request Failed', error.response?.data?.error || 'Failed to send reset email');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      await apiClient.put(API_ENDPOINTS.RESET_PASSWORD.replace(':token', token), {
        password
      });

      showSuccessMessage('Password Reset', 'Your password has been reset successfully');

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      showErrorMessage('Reset Failed', error.response?.data?.error || 'Failed to reset password');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PROFILE);

      const { data } = response;

      // Update stored user data
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(data));

      setUser(data);

      return { success: true, data };
    } catch (error) {
      console.error('Refresh profile error:', error);
      return { success: false, error: error.response?.data?.error };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    forgotPassword,
    resetPassword,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;