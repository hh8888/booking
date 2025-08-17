import React from 'react';
import { toast } from 'react-toastify';
import { getFieldChanges, formatDate } from './realtimeToastUtils';

/**
 * Booking fields configuration for change detection
 */
export const BOOKING_FIELDS_CONFIG = [
  { key: 'start_time', label: 'Start Time', formatter: (value) => value ? new Date(value).toLocaleString() : value },
  { key: 'end_time', label: 'End Time', formatter: (value) => value ? new Date(value).toLocaleString() : value },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' }
];

/**
 * Format booking date and time information
 * @param {Object} bookingData - The booking data from payload
 * @returns {Object} Formatted date and time strings
 */
export const formatBookingDateTime = (bookingData) => {
  if (!bookingData?.start_time) return null;
  
  const startTime = new Date(bookingData.start_time);
  const endTime = bookingData.end_time ? new Date(bookingData.end_time) : null;
  
  const formattedDate = startTime.toLocaleDateString();
  const formattedStartTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedEndTime = endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  
  return {
    date: formattedDate,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    fullDateTime: formattedEndTime 
      ? `🕐 ${formattedDate}\n⏰ ${formattedStartTime} - ${formattedEndTime}`
      : `🕐 ${formattedDate} at ${formattedStartTime}`
  };
};

/**
 * Create detailed booking toast content with only changed fields
 * @param {string} title - Toast title
 * @param {Array} changes - Array of field changes
 * @param {string} icon - Icon for the toast
 * @param {Object} bookingData - Booking data for additional context
 * @returns {JSX.Element} React component for toast content
 */
export const createDetailedBookingToastContent = (title, changes, icon = '📅', bookingData = {}) => {
  const dateTime = formatBookingDateTime(bookingData);
  
  return (
    <div style={{ lineHeight: '1.4' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {icon} {title}
      </div>
      {dateTime && (
        <div style={{ marginBottom: '8px', fontSize: '0.9em', color: '#666' }}>
          {dateTime.fullDateTime.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
      {changes.length > 0 && (
        <div>
          <strong>Changes:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
            {changes.map((change, index) => (
              <li key={index} style={{ fontSize: '0.9em' }}>{change}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Create booking info string with available details (fallback for non-React environments)
 * @param {Object} bookingData - The booking data from payload
 * @param {Object} options - Formatting options
 * @returns {string} Formatted booking info string
 */
export const createBookingInfoString = (bookingData, options = {}) => {
  const { includeLocation = true, includeNotes = true, includeStatus = true } = options;
  
  const dateTime = formatBookingDateTime(bookingData);
  if (!dateTime) return '';
  
  let infoString = dateTime.fullDateTime;
  
  if (includeStatus && bookingData.status) {
    infoString += `\n📋 Status: ${bookingData.status}`;
  }
  
  if (includeNotes && bookingData.notes) {
    infoString += `\n📝 Notes: ${bookingData.notes}`;
  }
  
  if (includeLocation && bookingData.location) {
    infoString += `\n📍 Location: ${bookingData.location}`;
  }
  
  return infoString;
};

/**
 * Get status-specific message for booking updates
 * @param {string} oldStatus - Previous booking status
 * @param {string} newStatus - New booking status
 * @returns {string} Status-specific message
 */
export const getStatusUpdateMessage = (oldStatus, newStatus) => {
  if (oldStatus === newStatus || !newStatus) {
    return '📝 Your booking has been updated!';
  }
  
  switch (newStatus) {
    case 'confirmed':
      return '✅ Your booking has been confirmed!';
    case 'completed':
      return '🎯 Your booking has been completed!';
    case 'cancelled':
      return '❌ Your booking has been cancelled!';
    default:
      return '📝 Your booking has been updated!';
  }
};

/**
 * Show toast notification for booking creation
 * @param {Object} bookingData - The booking data from payload
 * @param {Object} options - Toast options
 */
export const showBookingCreatedToast = (bookingData, options = {}) => {
  const { 
    isCustomerView = false, 
    autoClose = 5000,
    includeLocation = true,
    includeNotes = true,
    useDetailedContent = true
  } = options;
  
  const title = isCustomerView 
    ? 'Your new booking has been created!'
    : 'New booking created';
  
  const icon = isCustomerView ? '🎉' : '📅';
  
  if (useDetailedContent && bookingData) {
    const content = createDetailedBookingToastContent(title, [], icon, bookingData);
    toast.success(content, {
      autoClose,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  } else {
    const bookingInfo = createBookingInfoString(bookingData, { 
      includeLocation, 
      includeNotes, 
      includeStatus: true 
    });
    
    const message = `${icon} ${title}${bookingInfo ? `\n${bookingInfo}` : ''}`;
    const fallbackMessage = `${icon} ${title}`;
    
    toast.success(bookingInfo ? message : fallbackMessage, {
      autoClose
    });
  }
};

/**
 * Show toast notification for booking updates with change detection
 * @param {Object} payload - The real-time payload with old and new data
 * @param {Object} options - Toast options
 */
export const showBookingUpdatedToast = (payload, options = {}) => {
  const { 
    isCustomerView = false, 
    autoClose = 5000,
    includeLocation = true,
    includeNotes = true,
    useDetailedContent = true,
    fieldsConfig = BOOKING_FIELDS_CONFIG
  } = options;
  
  const bookingData = payload.new;
  const oldData = payload.old || {};
  const newData = payload.new || {};
  
  // Get only the changed fields
  const changes = getFieldChanges(oldData, newData, fieldsConfig);
  
  let title;
  let icon;
  
  if (isCustomerView) {
    const oldStatus = payload.old?.status;
    const newStatus = payload.new?.status;
    title = getStatusUpdateMessage(oldStatus, newStatus).replace(/^[^\s]+\s/, ''); // Remove emoji from title
    icon = '📝';
    
    // Use specific icons for status changes
    if (oldStatus !== newStatus && newStatus) {
      switch (newStatus) {
        case 'confirmed':
          icon = '✅';
          break;
        case 'completed':
          icon = '🎯';
          break;
        case 'cancelled':
          icon = '❌';
          break;
      }
    }
  } else {
    title = 'Booking updated';
    icon = '📝';
  }
  
  if (useDetailedContent && changes.length > 0) {
    const content = createDetailedBookingToastContent(title, changes, icon, bookingData);
    
    // Dynamic auto-close based on number of changes
    const dynamicAutoClose = Math.min(autoClose + (changes.length * 1000), 10000);
    
    toast.info(content, {
      autoClose: dynamicAutoClose,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  } else {
    // Fallback to basic message if no changes detected or detailed content disabled
    const bookingInfo = createBookingInfoString(bookingData, { 
      includeLocation, 
      includeNotes, 
      includeStatus: true 
    });
    
    const message = `${icon} ${title}${bookingInfo ? `\n${bookingInfo}` : ''}`;
    
    toast.info(message, {
      autoClose
    });
  }
};

/**
 * Show toast notification for booking deletion
 * @param {Object} bookingData - The booking data from payload
 * @param {Object} options - Toast options
 */
export const showBookingDeletedToast = (bookingData, options = {}) => {
  const { 
    isCustomerView = false, 
    autoClose = 5000,
    includeLocation = false,
    includeNotes = false,
    useDetailedContent = true
  } = options;
  
  const title = isCustomerView 
    ? 'Your booking has been cancelled!'
    : 'Booking deleted';
  
  const icon = '🗑️';
  
  if (useDetailedContent && bookingData) {
    const content = createDetailedBookingToastContent(title, [], icon, bookingData);
    toast.warning(content, {
      autoClose,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  } else {
    const bookingInfo = createBookingInfoString(bookingData, { 
      includeLocation, 
      includeNotes, 
      includeStatus: true 
    });
    
    const message = `${icon} ${title}${bookingInfo ? `\n${bookingInfo}` : ''}`;
    const fallbackMessage = `${icon} ${title}`;
    
    toast.warning(bookingInfo ? message : fallbackMessage, {
      autoClose
    });
  }
};

/**
 * Main function to handle real-time booking toast notifications
 * @param {Object} payload - The real-time payload
 * @param {Object} options - Configuration options
 */
export const handleBookingRealtimeToast = (payload, options = {}) => {
  const { isCustomerView = false } = options;
  const bookingData = payload.new || payload.old;
  
  if (!bookingData) {
    // Fallback to basic messages if no booking data available
    if (payload.eventType === 'INSERT') {
      toast.success(isCustomerView ? '🎉 Your new booking has been created!' : '📅 New booking created');
    } else if (payload.eventType === 'UPDATE') {
      toast.info(isCustomerView ? '📝 Your booking has been updated!' : '📝 Booking updated');
    } else if (payload.eventType === 'DELETE') {
      toast.warning(isCustomerView ? '🗑️ Your booking has been cancelled!' : '🗑️ Booking deleted');
    }
    return;
  }
  
  // Use specific toast functions for detailed notifications
  switch (payload.eventType) {
    case 'INSERT':
      showBookingCreatedToast(bookingData, options);
      break;
    case 'UPDATE':
      showBookingUpdatedToast(payload, options);
      break;
    case 'DELETE':
      showBookingDeletedToast(bookingData, options);
      break;
    default:
      console.warn('Unknown booking event type:', payload.eventType);
  }
};