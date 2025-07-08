// Message constants for toast notifications and user feedback

// Success Messages
export const SUCCESS_MESSAGES = {
  // Booking Messages
  BOOKING_CREATED: 'Booking created successfully!',
  BOOKING_UPDATED: 'Booking updated successfully!',
  BOOKING_CONFIRMED: 'Booking confirmed successfully!',
  BOOKING_CANCELLED: 'Booking cancelled successfully',
  BOOKINGS_DELETED: 'Selected bookings deleted successfully',
  
  // User Messages
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_RESET_SENT: 'Password reset email sent successfully',
  EMAIL_VERIFIED: 'Email verified successfully! Welcome to the platform.',
  REGISTRATION_SUCCESS: 'Registration successful!',
  
  // Settings Messages
  SETTINGS_SAVED: 'Settings saved successfully',
  CUSTOMER_DASHBOARD_SETTINGS_SAVED: 'Customer dashboard settings saved successfully',
  WORKING_HOURS_SETTINGS_SAVED: 'Working hours settings saved successfully',
  SETTING_UPDATED: 'Setting updated successfully!',
  
  // Staff Availability Messages
  STAFF_AVAILABILITY_UPDATED: 'Staff availability updated successfully',
  
  // OTP Messages
  NEW_OTP_SENT: 'New OTP sent to your phone.'
};

// Error Messages
export const ERROR_MESSAGES = {
  // Validation Errors
  INVALID_CUSTOMER: 'Please select a valid customer',
  INVALID_SERVICE: 'Please select a service',
  INVALID_PROVIDER: 'Please select a provider',
  INVALID_START_TIME: 'Invalid start time',
  INVALID_DATE: 'Please provide a valid date',
  FIELD_REQUIRED: 'is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_JSON_FORMAT: 'Invalid JSON format for booking steps',
  
  // Authentication Errors
  EMAIL_NOT_CONFIRMED: 'Please check your email to validate your account before signing in.',
  EMAIL_REQUIRED_RESET: 'Please enter your email address to reset your password.',
  MOBILE_SIGNUP_DISABLED: 'Mobile sign up is currently disabled.',
  MOBILE_SIGNIN_DISABLED: 'Mobile sign in is currently disabled.',
  INVALID_RECOVERY_LINK: 'Invalid or expired recovery link.',
  UNKNOWN_USER_ROLE: 'Unknown user role. Please contact support.',
  DUPLICATE_EMAIL: 'This email address is already registered. Please use a different email or try signing in.',
  SIGN_OUT_ERROR: 'Error signing out',
  UNEXPECTED_SIGN_OUT_ERROR: 'Unexpected error during sign out',
  OPERATION_ERROR: 'Error',
  DELETE_ERROR: 'Error',
  
  // Data Loading Errors
  FAILED_LOAD_CUSTOMER_INFO: 'Failed to load customer information',
  FAILED_LOAD_BOOKINGS: 'Failed to load bookings',
  FAILED_REFRESH_BOOKINGS: 'Failed to refresh bookings',
  FAILED_CANCEL_BOOKING: 'Failed to cancel booking',
  FAILED_CONFIRM_BOOKING: 'Failed to confirm booking. Please try again.',
  FAILED_LOAD_PROFILE: 'Failed to load profile data',
  FAILED_UPDATE_PROFILE: 'Failed to update profile',
  FAILED_LOAD_SETTINGS: 'Failed to load settings',
  FAILED_FETCH_STATISTICS: 'Failed to fetch statistics',
  FAILED_FETCH_SERVICES: 'Failed to fetch services',
  FAILED_FETCH_CUSTOMERS: 'Failed to fetch customers',
  FAILED_FETCH_BOOKINGS: 'Failed to fetch bookings',
  FAILED_FETCH_AVAILABILITY: 'Failed to fetch staff availability',
  FAILED_FETCH_TIME_SLOTS: 'Failed to fetch available time slots',
  FAILED_FETCH_PROVIDER_AVAILABILITY: 'Failed to fetch provider availability',
  BOOKING_CONFIRM_FAILED: 'Failed to confirm booking. Please try again.',
  BOOKING_SAVE_ERROR: 'Error saving booking',
  FAILED_UPDATE_AVAILABILITY: 'Failed to update staff availability',
  FAILED_RELOAD_DATA: 'Failed to reload data for new location',
  FAILED_RELOAD_AVAILABILITY: 'Failed to reload availability for new location',
  FAILED_GET_SYSTEM_SETTINGS: 'Unable to get system settings',
  FAILED_LOAD_DEFAULT_SETTINGS: 'Failed to load default settings',
  SETTINGS_LOAD_FAILED: 'Failed to load settings',
  SAVE_FAILED: 'Save failed',
  
  // Booking Specific Errors
  DATE_NOT_AVAILABLE: 'The selected date is not available for the provider.',
  BOOKING_OVERLAP: 'Selecting this time would cause the booking duration to overlap with existing bookings.'
};

// Warning Messages
export const WARNING_MESSAGES = {
  CHECK_EMAIL_CONFIRMATION: 'Please check your email for the confirmation link.',
  EMAIL_NOT_CONFIRMED_WARNING: 'User email not confirmed'
};

// Info Messages
export const INFO_MESSAGES = {
  SET_NEW_PASSWORD: 'You can now set your new password.',
  LOGIN_TO_ACCESS: 'Please log in to access your dashboard'
};

// Loading Messages
export const LOADING_MESSAGES = {
  LOADING_DASHBOARD: 'Loading dashboard...',
  LOADING_PROFILE: 'Loading profile...',
  LOADING_BOOKINGS: 'Loading bookings...',
  LOADING_SETTINGS: 'Loading settings...'
};