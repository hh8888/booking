import React from 'react';
import { toast } from 'react-toastify';

/**
 * Utility functions for real-time toast notifications
 */

/**
 * Check if a value is considered empty (null, undefined, or empty string)
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is empty
 */
export const isEmpty = (value) => {
  return value === null || value === undefined || value === '';
};

/**
 * Compare old and new data to find changes
 * @param {Object} oldData - Previous data
 * @param {Object} newData - Updated data
 * @param {Array} fieldsToCheck - Array of field configurations
 * @returns {Array} Array of change descriptions
 */
export const getFieldChanges = (oldData, newData, fieldsToCheck) => {
  const changes = [];
  
  fieldsToCheck.forEach(field => {
    const { key, label, formatter } = field;
    const oldValue = oldData[key];
    const newValue = newData[key];
    
    // Use isEmpty to properly compare values
    const oldIsEmpty = isEmpty(oldValue);
    const newIsEmpty = isEmpty(newValue);
    
    // Only show changes if:
    // 1. Both values are not empty and they're different
    // 2. One is empty and the other is not
    if ((!oldIsEmpty || !newIsEmpty) && oldValue !== newValue) {
      const formattedNewValue = formatter ? formatter(newValue) : (newValue || 'Not set');
      changes.push(`${label}: ${formattedNewValue}`);
    }
  });
  
  return changes;
};

/**
 * Format date for display
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date or 'Not set'
 */
export const formatDate = (dateString) => {
  return dateString ? new Date(dateString).toLocaleDateString() : dateString;
};

/**
 * Common user fields configuration for change detection
 */
export const USER_FIELDS_CONFIG = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone_number', label: 'Phone' },
  { key: 'phone', label: 'Phone' }, // Alternative field name
  { key: 'birthday', label: 'Birthday', formatter: formatDate },
  { key: 'gender', label: 'Gender' },
  { key: 'post_code', label: 'Post Code' },
  { key: 'address', label: 'Address' },
  { key: 'emergency_contact', label: 'Emergency Contact' },
  { key: 'role', label: 'Role' },
  { key: 'location', label: 'Location' }
];

/**
 * Create a detailed toast content component
 * @param {string} title - Toast title
 * @param {Array} changes - Array of change descriptions
 * @param {string} icon - Icon to display
 * @param {Object} userData - User data for context
 * @returns {React.Component} Toast content component
 */
export const createDetailedToastContent = (title, changes, icon = '👤', userData = {}) => {
  const ToastContent = () => (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {icon} {title}
      </div>
      {userData && (userData.full_name || userData.email) && (
        <div style={{ fontSize: '0.9em', marginBottom: '4px' }}>
          <strong>User:</strong> {userData.full_name || userData.email}
        </div>
      )}
      {changes.length > 0 && (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📝 Changes:</div>
          <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
            {changes.map((change, index) => (
              <li key={index} style={{ fontSize: '0.9em', marginBottom: '2px' }}>
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  
  return ToastContent;
};

/**
 * Show a detailed user update toast
 * @param {Object} oldData - Previous user data
 * @param {Object} newData - Updated user data
 * @param {Object} options - Toast options
 */
export const showUserUpdateToast = (oldData, newData, options = {}) => {
  const {
    fieldsConfig = USER_FIELDS_CONFIG,
    title = 'User Profile Updated',
    icon = '👤',
    toastType = 'info',
    fallbackMessage = 'User information updated'
  } = options;
  
  const changes = getFieldChanges(oldData, newData, fieldsConfig);
  
  if (changes.length > 0) {
    const ToastContent = createDetailedToastContent(title, changes, icon, newData);
    
    const toastOptions = {
      autoClose: Math.min(8000, 3000 + (changes.length * 1000)),
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options.toastOptions
    };
    
    toast[toastType](<ToastContent title={title} />, toastOptions);

  } else {
    toast[toastType](fallbackMessage, {
      autoClose: 3000,
      ...options.toastOptions
    });
  }
};

/**
 * Show a user creation toast
 * @param {Object} userData - New user data
 * @param {Object} options - Toast options
 */
export const showUserCreatedToast = (userData, options = {}) => {
  const {
    title = 'New User Added',
    icon = '✅',
    toastType = 'success'
  } = options;
  
  const ToastContent = () => (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {icon} {title}
      </div>
      <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
        • Name: {userData?.full_name || 'Not provided'}<br/>
        • Email: {userData?.email || 'Not provided'}<br/>
        • Role: {userData?.role || 'Not specified'}<br/>
        • Phone: {userData?.phone_number || userData?.phone || 'Not provided'}
      </div>
    </div>
  );
  
  const toastOptions = {
    autoClose: 5000,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options.toastOptions
  };
  
  toast[toastType](<ToastContent title={title} />, toastOptions);

};

/**
 * Show a user deletion toast
 * @param {Object} userData - Deleted user data
 * @param {Object} options - Toast options
 */
export const showUserDeletedToast = (userData, options = {}) => {
  const {
    title = 'User Removed',
    icon = '⚠️',
    toastType = 'warning'
  } = options;
  
  const ToastContent = () => (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {icon} {title}
      </div>
      <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
        • Name: {userData?.full_name || 'Unknown'}<br/>
        • Email: {userData?.email || 'Unknown'}<br/>
        • Role: {userData?.role || 'Unknown'}
      </div>
    </div>
  );
  
  const toastOptions = {
    autoClose: 4000,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options.toastOptions
  };
  
  toast[toastType](<ToastContent title={title} />, toastOptions);
};
