import { format, formatDistance, formatRelative, isToday, isTomorrow, isYesterday } from 'date-fns';
import { showMessage } from 'react-native-flash-message';
import { Platform } from 'react-native';

// Date formatting helpers
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

export const formatTime = (date, formatStr = 'hh:mm a') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

export const formatDateTime = (date, formatStr = 'MMM dd, yyyy hh:mm a') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
};

export const formatRelativeDate = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  
  if (isToday(dateObj)) {
    return `Today at ${formatTime(dateObj)}`;
  } else if (isTomorrow(dateObj)) {
    return `Tomorrow at ${formatTime(dateObj)}`;
  } else if (isYesterday(dateObj)) {
    return `Yesterday at ${formatTime(dateObj)}`;
  }
  
  return formatRelative(dateObj, new Date());
};

// Time helpers
export const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const getTimeFromDate = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// String helpers
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.split(' ').map(capitalize).join(' ');
};

export const truncate = (str, length = 50, suffix = '...') => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
};

// Number helpers
export const formatNumber = (num, decimals = 0) => {
  if (!num && num !== 0) return '';
  return num.toFixed(decimals);
};

export const formatCurrency = (amount, currency = 'INR') => {
  if (!amount && amount !== 0) return '';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
};

// Validation helpers
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

export const isValidPassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

// Medicine helpers
export const getMedicineTypeColor = (type, colors) => {
  const typeColors = {
    tablet: colors.medicine.tablet,
    capsule: colors.medicine.capsule,
    syrup: colors.medicine.syrup,
    injection: colors.medicine.injection,
    drops: colors.medicine.drops,
    inhaler: colors.medicine.inhaler,
    ointment: colors.medicine.ointment,
    other: colors.medicine.other
  };
  
  return typeColors[type] || colors.medicine.other;
};

export const getStatusColor = (status, colors) => {
  const statusColors = {
    taken: '#4caf50',
    missed: '#f44336',
    pending: '#ff9800',
    sent: '#ff9800',
    snoozed: '#2196f3',
    scheduled: '#2196f3',
    skipped: '#9e9e9e',
    completed: '#4caf50',
    cancelled: '#9e9e9e'
  };

  // Use theme colors if provided and valid, otherwise fall back to hardcoded defaults
  if (colors?.status?.[status]) return colors.status[status];
  return statusColors[status] || '#9e9e9e';
};

// Array helpers
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

// Storage helpers
export const parseJSON = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
};

export const stringifyJSON = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('Error stringifying JSON:', error);
    return null;
  }
};

// Notification helpers
export const showSuccessMessage = (message, description = '') => {
  showMessage({
    message,
    description,
    type: 'success',
    icon: 'success',
    duration: 3000
  });
};

export const showErrorMessage = (message, description = '') => {
  showMessage({
    message,
    description,
    type: 'danger',
    icon: 'danger',
    duration: 4000
  });
};

export const showWarningMessage = (message, description = '') => {
  showMessage({
    message,
    description,
    type: 'warning',
    icon: 'warning',
    duration: 3500
  });
};

export const showInfoMessage = (message, description = '') => {
  showMessage({
    message,
    description,
    type: 'info',
    icon: 'info',
    duration: 3000
  });
};

// Platform helpers
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Debounce helper
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle helper
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Calculate adherence percentage
export const calculateAdherence = (taken, missed) => {
  const total = taken + missed;
  if (total === 0) return 0;
  return Math.round((taken / total) * 100);
};

// Get adherence status
export const getAdherenceStatus = (percentage) => {
  if (percentage >= 90) return { label: 'Excellent', color: '#4caf50' };
  if (percentage >= 75) return { label: 'Good', color: '#8bc34a' };
  if (percentage >= 60) return { label: 'Fair', color: '#ff9800' };
  return { label: 'Poor', color: '#f44336' };
};

// Calculate stock days remaining
export const calculateStockDaysRemaining = (remainingQuantity, dosesPerDay) => {
  if (!remainingQuantity || !dosesPerDay || dosesPerDay === 0) return 0;
  return Math.floor(remainingQuantity / dosesPerDay);
};

// Format stock status
export const getStockStatus = (daysRemaining) => {
  if (daysRemaining === 0) return { label: 'Out of Stock', color: '#f44336' };
  if (daysRemaining <= 3) return { label: 'Critical', color: '#ff5722' };
  if (daysRemaining <= 7) return { label: 'Low', color: '#ff9800' };
  return { label: 'Good', color: '#4caf50' };
};

// Generate initials from name
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Calculate age from date of birth
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Wait helper
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatRelativeDate,
  parseTimeString,
  getTimeFromDate,
  capitalize,
  capitalizeWords,
  truncate,
  formatNumber,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  isValidPassword,
  getMedicineTypeColor,
  getStatusColor,
  groupBy,
  sortBy,
  parseJSON,
  stringifyJSON,
  showSuccessMessage,
  showErrorMessage,
  showWarningMessage,
  showInfoMessage,
  isIOS,
  isAndroid,
  isWeb,
  debounce,
  throttle,
  calculateAdherence,
  getAdherenceStatus,
  calculateStockDaysRemaining,
  getStockStatus,
  getInitials,
  calculateAge,
  wait
};