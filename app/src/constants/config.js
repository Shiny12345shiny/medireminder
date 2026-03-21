// API Configuration
export const API_BASE_URL = process.env.API_BASE_URL || 'http://10.25.11.20:5000';
export const SOCKET_URL = process.env.SOCKET_URL || 'http://10.25.11.20:5001';

// App Information
export const APP_NAME = 'Smart Medicine Reminder';
export const APP_VERSION = '1.0.0';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/users/login',
  REGISTER: '/api/users/register',
  LOGOUT: '/api/users/logout',
  PROFILE: '/api/users/profile',
  UPDATE_PASSWORD: '/api/users/password',
  FORGOT_PASSWORD: '/api/users/forgot-password',
  RESET_PASSWORD: '/api/users/reset-password',
  VERIFY_EMAIL: '/api/users/verify-email',
  
  // Push Tokens
  ADD_PUSH_TOKEN: '/api/users/push-token',
  REMOVE_PUSH_TOKEN: '/api/users/push-token',
  
  // Schedules
  SCHEDULES: '/api/schedules',
  SCHEDULE_DETAIL: (id) => `/api/schedules/${id}`,
  PAUSE_SCHEDULE: (id) => `/api/schedules/${id}/pause`,
  RESUME_SCHEDULE: (id) => `/api/schedules/${id}/resume`,
  REFILL_STOCK: (id) => `/api/schedules/${id}/refill`,
  SCHEDULE_ADHERENCE: (id) => `/api/schedules/${id}/adherence`,
  LOW_STOCK_SCHEDULES: '/api/schedules/low-stock',
  TODAY_SCHEDULES: '/api/schedules/today',
  
  // Reminders
  REMINDERS: '/api/reminders',
  REMINDER_DETAIL: (id) => `/api/reminders/${id}`,
  UPCOMING_REMINDERS: '/api/reminders/upcoming',
  TODAY_REMINDERS: '/api/reminders/today',
  CONFIRM_REMINDER: (id) => `/api/reminders/${id}/confirm`,
  SNOOZE_REMINDER: (id) => `/api/reminders/${id}/snooze`,
  SKIP_REMINDER: (id) => `/api/reminders/${id}/skip`,
  ADHERENCE_STATS: '/api/reminders/stats/adherence',
  REMINDER_HISTORY: '/api/reminders/history',
  
  // Consultations
  CONSULTATIONS: '/api/consultations',
  BOOK_APPOINTMENT: '/api/consultations/book',
  UPCOMING_APPOINTMENTS: '/api/consultations/upcoming',
  APPOINTMENT_DETAIL: (id) => `/api/consultations/${id}`,
  CANCEL_APPOINTMENT: (id) => `/api/consultations/${id}/cancel`,
  RESCHEDULE_APPOINTMENT: (id) => `/api/consultations/${id}/reschedule`,
  RATE_APPOINTMENT: (id) => `/api/consultations/${id}/rate`,
  
  // Doctors
  DOCTORS: '/api/doctors',
  DOCTOR_DETAIL: (id) => `/api/doctors/${id}`,
  NEARBY_DOCTORS: '/api/doctors/nearby',
  DOCTOR_AVAILABILITY: (id) => `/api/doctors/${id}/availability`,
  DOCTOR_REVIEWS: (id) => `/api/doctors/${id}/reviews`,
  SPECIALIZATIONS: '/api/doctors/specializations',
  DOCTOR_STATS: (id) => `/api/doctors/${id}/stats`,   // ADD THIS LINE
  
  // Health Records
  HEALTH_RECORDS: '/api/records',
  HEALTH_RECORD_DETAIL: (id) => `/api/records/${id}`,
  RECENT_RECORDS: '/api/records/recent',
  SEARCH_RECORDS: '/api/records/search',
  ARCHIVE_RECORD: (id) => `/api/records/${id}/archive`,
  FAVORITE_RECORD: (id) => `/api/records/${id}/favorite`,
  
  // Notifications
  NOTIFICATION_PREFERENCES: '/api/notifications/preferences',
  
  // Medicines
  SEARCH_MEDICINES: '/api/medicines/search',
  MEDICINE_INFO: (id) => `/api/medicines/${id}`,
  DRUG_INTERACTIONS: '/api/medicines/interactions',

 
CHAT: {
  SEND_MESSAGE: '/api/chat/message',
  GET_SESSIONS: '/api/chat/sessions',
  GET_HISTORY: '/api/chat/history',
  DELETE_SESSION: '/api/chat/session',
  DELETE_ALL_SESSIONS: '/api/chat/sessions/all',
}

};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  PUSH_TOKEN: 'push_token',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language'
};

// Notification Categories
export const NOTIFICATION_CATEGORIES = {
  MEDICINE_REMINDER: 'medicine-reminder',
  MISSED_DOSE: 'missed-dose',
  REFILL_ALERT: 'refill-alert',
  APPOINTMENT_REMINDER: 'appointment-reminder',
  APPOINTMENT_CONFIRMATION: 'appointment-confirmation',
  GENERAL: 'general'
};

// Date/Time Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  API: 'YYYY-MM-DD',
  TIME: 'hh:mm A',
  DATETIME: 'MMM DD, YYYY hh:mm A'
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1
};

// Cache Duration (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000 // 1 hour
};

// Socket Events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTED: 'connected',
  
  // Reminders
  REMINDER_NEW: 'reminder:new',
  REMINDER_CONFIRMED: 'reminder:confirmed',
  REMINDER_MISSED: 'reminder:missed',
  REMINDER_ESCALATION: 'reminder:escalation',
  
  // Schedules
  SCHEDULE_CREATED: 'schedule:created',
  SCHEDULE_UPDATED: 'schedule:updated',
  SCHEDULE_DELETED: 'schedule:deleted',
  SCHEDULE_REFILLED: 'schedule:refilled',
  
  // Appointments
  APPOINTMENT_NEW: 'appointment:new',
  APPOINTMENT_CONFIRMED: 'appointment:confirmed',
  APPOINTMENT_STARTED: 'appointment:started',
  APPOINTMENT_COMPLETED: 'appointment:completed',
  APPOINTMENT_CANCELLED: 'appointment:cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment:rescheduled',
  
  // Refill Alerts
  REFILL_ALERT: 'refill:alert',
  
  // User Presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline'


  
};

// Feature Flags
export const FEATURES = {
  NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS !== 'false',
  LOCATION: process.env.ENABLE_LOCATION !== 'false',
  VIDEO_CALLS: process.env.ENABLE_VIDEO_CALLS !== 'false',
  ANALYTICS: process.env.ENABLE_ANALYTICS === 'true'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'Resource not found.',
  PERMISSION_DENIED: 'Permission denied.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful!',
  REGISTER: 'Registration successful!',
  LOGOUT: 'Logged out successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  SCHEDULE_CREATED: 'Medicine schedule created.',
  SCHEDULE_UPDATED: 'Medicine schedule updated.',
  REMINDER_CONFIRMED: 'Medicine marked as taken.',
  APPOINTMENT_BOOKED: 'Appointment booked successfully.',
  APPOINTMENT_CANCELLED: 'Appointment cancelled.',
  RECORD_UPLOADED: 'Health record uploaded.'
};

export default {
  API_BASE_URL,
  SOCKET_URL,
  APP_NAME,
  APP_VERSION,
  API_ENDPOINTS,
  STORAGE_KEYS,
  NOTIFICATION_CATEGORIES,
  DATE_FORMATS,
  PAGINATION,
  CACHE_DURATION,
  SOCKET_EVENTS,
  FEATURES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};


