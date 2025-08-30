// Booking-related utility functions

import { BOOKING_STATUS, BOOKING_STATUS_COLORS } from '../constants/bookingConstants';

/**
 * Get the CSS class for booking status styling
 * @param {string} status - The booking status
 * @returns {string} CSS class string
 */
export const getBookingStatusClass = (status) => {
  return BOOKING_STATUS_COLORS[status] || BOOKING_STATUS_COLORS[BOOKING_STATUS.PENDING];
};

/**
 * Check if a booking is upcoming
 * @param {Object} booking - The booking object
 * @returns {boolean} True if booking is upcoming
 */
export const isUpcomingBooking = (booking) => {
  const now = new Date();
  const startTime = new Date(booking.start_time);
  return startTime > now;
};

/**
 * Check if a booking is pending
 * @param {Object} booking - The booking object
 * @returns {boolean} True if booking is pending
 */
export const isPendingBooking = (booking) => {
  return booking.status === BOOKING_STATUS.PENDING;
};

/**
 * Check if a booking is confirmed
 * @param {Object} booking - The booking object
 * @returns {boolean} True if booking is confirmed
 */
export const isConfirmedBooking = (booking) => {
  return booking.status === BOOKING_STATUS.CONFIRMED;
};

/**
 * Check if a booking is cancelled
 * @param {Object} booking - The booking object
 * @returns {boolean} True if booking is cancelled
 */
export const isCancelledBooking = (booking) => {
  return booking.status === BOOKING_STATUS.CANCELLED;
};

/**
 * Filter bookings by status
 * @param {Array} bookings - Array of booking objects
 * @param {string} status - Status to filter by ('all' for no filter)
 * @returns {Array} Filtered bookings
 */
export const filterBookingsByStatus = (bookings, status) => {
  if (status === 'all') return bookings;
  return bookings.filter(booking => booking.status === status);
};

/**
 * Format booking data for saving
 * @param {Object} bookingData - Raw booking data
 * @param {string} customerId - Customer ID
 * @param {Object} editingBooking - Existing booking being edited (optional)
 * @returns {Object} Formatted booking data
 */
export const formatBookingForSave = (bookingData, customerId, editingBooking = null) => {
  const formattedData = {
    ...bookingData,
    customer_id: customerId,
    status: bookingData.status || BOOKING_STATUS.PENDING
  };

  if (editingBooking) {
    formattedData.id = editingBooking.id;
  }

  return formattedData;
};

/**
 * Generate tooltip content for booking events
 * @param {Object} booking - Booking object
 * @param {Object} service - Service object
 * @param {string} customerName - Customer name
 * @param {string} staffName - Staff name
 * @returns {string} Formatted tooltip content
 */
export const generateBookingTooltip = (booking, service, customerName, staffName) => {
  const startTime = new Date(booking.start_time).toLocaleString();
  const endTime = new Date(booking.end_time).toLocaleString();
  const status = booking.status || BOOKING_STATUS.PENDING;
  
  let tooltip = `Service: ${service?.name || 'Appointment'}\n`;
  tooltip += `Customer: ${customerName}\n`;
  tooltip += `Staff: ${staffName}\n`;
  tooltip += `Time: ${startTime} - ${endTime}\n`;
  tooltip += `Status: ${status}`;
  
  if (booking.notes) {
    tooltip += `\nNotes: ${booking.notes}`;
  }
  
  return tooltip;
};

/**
 * Check if two bookings have time conflicts
 * @param {Object} booking1 - First booking
 * @param {Object} booking2 - Second booking
 * @returns {boolean} True if bookings conflict
 */
export const hasBookingConflict = (booking1, booking2) => {
  // Skip cancelled bookings
  if (isCancelledBooking(booking1) || isCancelledBooking(booking2)) {
    return false;
  }

  const start1 = new Date(booking1.start_time);
  const end1 = new Date(booking1.end_time);
  const start2 = new Date(booking2.start_time);
  const end2 = new Date(booking2.end_time);

  return (start1 < end2) && (start2 < end1);
};

/**
 * Validate booking time slot
 * @param {string} startTime - Start time string
 * @param {string} endTime - End time string
 * @returns {Object} Validation result with isValid and message
 */
export const validateBookingTime = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (start >= end) {
    return {
      isValid: false,
      message: 'End time must be after start time'
    };
  }

  if (start < now) {
    return {
      isValid: false,
      message: 'Booking time cannot be in the past'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Check if a booking can be edited based on the time limit setting
 * @param {Object} booking - The booking object
 * @param {number} timeLimitHours - Time limit in hours before booking start time
 * @returns {boolean} True if booking can be edited
 */
export const canEditBookingWithTimeLimit = (booking, timeLimitHours = 0) => {
  if (!booking || !booking.start_time) {
    return false;
  }

  const now = new Date();
  const startTime = new Date(booking.start_time);
  const timeLimitMs = timeLimitHours * 60 * 60 * 1000; // Convert hours to milliseconds
  const cutoffTime = new Date(startTime.getTime() - timeLimitMs);

  // Can edit if current time is before the cutoff time
  return now < cutoffTime;
};

/**
 * Get the time remaining until booking edit cutoff
 * @param {Object} booking - The booking object
 * @param {number} timeLimitHours - Time limit in hours before booking start time
 * @returns {Object} Object with hours and minutes remaining, or null if past cutoff
 */
export const getTimeUntilEditCutoff = (booking, timeLimitHours = 0) => {
  if (!booking || !booking.start_time) {
    return null;
  }

  const now = new Date();
  const startTime = new Date(booking.start_time);
  const timeLimitMs = timeLimitHours * 60 * 60 * 1000;
  const cutoffTime = new Date(startTime.getTime() - timeLimitMs);
  const timeRemaining = cutoffTime.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return null; // Past cutoff
  }

  const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

  return {
    hours: hoursRemaining,
    minutes: minutesRemaining,
    totalMinutes: Math.floor(timeRemaining / (60 * 1000))
  };
};