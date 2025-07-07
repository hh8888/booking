// Validation-related constants

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: 'Please enter a valid email address'
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MESSAGE: 'Password must be at least 6 characters'
  },
  PHONE: {
    PATTERN: /^[+]?[1-9][\d]{0,15}$/,
    MESSAGE: 'Please enter a valid phone number'
  },
  REQUIRED: {
    MESSAGE: 'This field is required'
  }
};

// Form Validation Messages
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
  FULL_NAME_REQUIRED: 'Full name is required',
  PHONE_REQUIRED: 'Phone number is required',
  PHONE_INVALID: 'Please enter a valid phone number',
  SERVICE_REQUIRED: 'Service is required',
  STAFF_REQUIRED: 'Staff member is required',
  START_TIME_REQUIRED: 'Start time is required',
  END_TIME_REQUIRED: 'End time is required',
  DATE_REQUIRED: 'Date is required',
  CUSTOMER_REQUIRED: 'Customer is required',
  ROLE_INVALID: 'Invalid role type',
  STATUS_INVALID: 'Invalid status'
};

// Input Constraints
export const INPUT_CONSTRAINTS = {
  EMAIL_MAX_LENGTH: 255,
  NAME_MAX_LENGTH: 100,
  PHONE_MAX_LENGTH: 20,
  NOTES_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 1000
};

// Validation Status Options
import { BOOKING_STATUS } from './bookingConstants';

export const VALIDATION_STATUS_OPTIONS = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED];

// Validation Role Options
export const VALIDATION_ROLE_OPTIONS = ['admin', 'staff', 'customer'];