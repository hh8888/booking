// Validation utility functions

import { VALIDATION_RULES, VALIDATION_MESSAGES } from '../constants/validationConstants';
import { USER_ROLES } from '../constants/userConstants';
import { BOOKING_STATUS } from '../constants/bookingConstants';

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateEmail = (email) => {
  if (!email) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.EMAIL_REQUIRED
    };
  }

  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.EMAIL_INVALID
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.PASSWORD_REQUIRED
    };
  }

  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.PHONE_REQUIRED
    };
  }

  if (!VALIDATION_RULES.PHONE.PATTERN.test(phone)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.PHONE_INVALID
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} Validation result with isValid and message
 */
export const validateRequired = (value, fieldName = 'This field') => {
  const isEmpty = value === null || value === undefined || 
                  (typeof value === 'string' && value.trim() === '') ||
                  (Array.isArray(value) && value.length === 0);

  if (isEmpty) {
    return {
      isValid: false,
      message: `${fieldName} is required`
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateUserRole = (role) => {
  if (!role) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.ROLE_INVALID
    };
  }

  if (!Object.values(USER_ROLES).includes(role)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.ROLE_INVALID
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate booking status
 * @param {string} status - Status to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateBookingStatus = (status) => {
  if (!status) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.STATUS_INVALID
    };
  }

  if (!Object.values(BOOKING_STATUS).includes(status)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.STATUS_INVALID
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate date format and value
 * @param {string|Date} date - Date to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateDate = (date) => {
  if (!date) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.DATE_REQUIRED
    };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      message: 'Please provide a valid date'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate booking form data
 * @param {Object} bookingData - Booking data to validate
 * @returns {Object} Validation result with isValid, errors object
 */
export const validateBookingForm = (bookingData) => {
  const errors = {};
  let isValid = true;

  // Validate customer
  if (!bookingData.customer_id) {
    errors.customer_id = VALIDATION_MESSAGES.CUSTOMER_REQUIRED;
    isValid = false;
  }

  // Validate service
  if (!bookingData.service_id) {
    errors.service_id = VALIDATION_MESSAGES.SERVICE_REQUIRED;
    isValid = false;
  }

  // Validate staff
  if (!bookingData.provider_id) {
    errors.provider_id = VALIDATION_MESSAGES.STAFF_REQUIRED;
    isValid = false;
  }

  // Validate start time
  const startTimeValidation = validateDate(bookingData.start_time);
  if (!startTimeValidation.isValid) {
    errors.start_time = startTimeValidation.message;
    isValid = false;
  }

  // Validate end time
  const endTimeValidation = validateDate(bookingData.end_time);
  if (!endTimeValidation.isValid) {
    errors.end_time = endTimeValidation.message;
    isValid = false;
  }

  // Validate status if provided
  if (bookingData.status) {
    const statusValidation = validateBookingStatus(bookingData.status);
    if (!statusValidation.isValid) {
      errors.status = statusValidation.message;
      isValid = false;
    }
  }

  return {
    isValid,
    errors
  };
};

/**
 * Validate user form data
 * @param {Object} userData - User data to validate
 * @returns {Object} Validation result with isValid, errors object
 */
export const validateUserForm = (userData) => {
  const errors = {};
  let isValid = true;

  // Validate email
  const emailValidation = validateEmail(userData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.message;
    isValid = false;
  }

  // Validate full name
  const nameValidation = validateRequired(userData.full_name, 'Full name');
  if (!nameValidation.isValid) {
    errors.full_name = nameValidation.message;
    isValid = false;
  }

  // Validate role
  const roleValidation = validateUserRole(userData.role);
  if (!roleValidation.isValid) {
    errors.role = roleValidation.message;
    isValid = false;
  }

  // Validate phone if provided
  if (userData.phone_number) {
    const phoneValidation = validatePhone(userData.phone_number);
    if (!phoneValidation.isValid) {
      errors.phone_number = phoneValidation.message;
      isValid = false;
    }
  }

  return {
    isValid,
    errors
  };
};

/**
 * Check if an email address is a fake/temporary email (ends with @temp.local)
 * @param {string} email - Email address to check
 * @returns {boolean} True if the email is a fake/temporary email
 */
export const isFakeEmail = (email) => {
  return email && email.endsWith('@temp.local');
};

/**
 * Check if an email address is a real email (not fake/temporary)
 * @param {string} email - Email address to check
 * @returns {boolean} True if the email is a real email
 */
export const isRealEmail = (email) => {
  return email && !email.endsWith('@temp.local');
};