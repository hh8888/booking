import React from 'react';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import { formatBookingDateTime, createDetailedBookingToastContent, BOOKING_FIELDS_CONFIG } from './realtimeBookingToastUtils';
import { getFieldChanges } from './realtimeToastUtils';

/**
 * Create a multilingual toast utility that uses the translation context
 * @param {Function} t - Translation function from useLanguage hook
 * @returns {Object} Toast utility functions
 */
export const createMultilingualToastUtils = (t) => {
  
  /**
   * Show success toast with translation
   */
  const showSuccessToast = (messageKey, params = {}, options = {}) => {
    const message = t(`messages.success.${messageKey}`, params);
    toast.success(message, { autoClose: 3000, ...options });
  };

  /**
   * Show error toast with translation
   */
  const showErrorToast = (messageKey, params = {}, options = {}) => {
    const message = t(`messages.error.${messageKey}`, params);
    toast.error(message, { autoClose: 5000, ...options });
  };

  /**
   * Show info toast with translation
   */
  const showInfoToast = (messageKey, params = {}, options = {}) => {
    const message = t(`messages.info.${messageKey}`, params);
    toast.info(message, { autoClose: 4000, ...options });
  };

  /**
   * Show warning toast with translation
   */
  const showWarningToast = (messageKey, params = {}, options = {}) => {
    const message = t(`messages.warning.${messageKey}`, params);
    toast.warning(message, { autoClose: 4000, ...options });
  };

  /**
   * Show multilingual booking created toast
   */
  const showBookingCreatedToast = (bookingData, options = {}) => {
    const { isCustomerView = false, useDetailedContent = true } = options;
    
    if (useDetailedContent) {
      const messageKey = isCustomerView ? 'bookingCreatedCustomer' : 'bookingCreated';
      const message = t(`messages.success.${messageKey}`);
      const content = createDetailedBookingToastContent(message, [], '🎉', bookingData);
      
      toast.success(
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{message}</div>
          <div>{content}</div>
        </div>,
        { autoClose: 5000, ...options }
      );
    } else {
      const messageKey = isCustomerView ? 'bookingCreatedCustomer' : 'bookingCreated';
      showSuccessToast(messageKey, {}, options);
    }
  };

  /**
   * Show multilingual booking updated toast
   */
  const showBookingUpdatedToast = (oldData, newData, options = {}) => {
    const { isCustomerView = false, useDetailedContent = true } = options;
    
    if (useDetailedContent) {
      const changes = getFieldChanges(oldData, newData, BOOKING_FIELDS_CONFIG);
      if (changes.length > 0) {
        const messageKey = isCustomerView ? 'bookingUpdatedCustomer' : 'bookingUpdated';
        const message = t(`messages.success.${messageKey}`);
        const content = createDetailedBookingToastContent(message, changes, '📝', newData);
        
        toast.info(
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{message}</div>
            <div>{content}</div>
          </div>,
          { autoClose: 5000, ...options }
        );
      } else {
        const messageKey = isCustomerView ? 'bookingUpdatedCustomer' : 'bookingUpdated';
        showInfoToast(messageKey, {}, options);
      }
    } else {
      const messageKey = isCustomerView ? 'bookingUpdatedCustomer' : 'bookingUpdated';
      showInfoToast(messageKey, {}, options);
    }
  };

  /**
   * Show multilingual booking deleted toast
   */
  const showBookingDeletedToast = (bookingData, options = {}) => {
    const { isCustomerView = false, useDetailedContent = true } = options;
    
    if (useDetailedContent) {
      const messageKey = isCustomerView ? 'bookingCancelledCustomer' : 'bookingDeleted';
      const message = t(`messages.success.${messageKey}`);
      const content = createDetailedBookingToastContent(message, [], '🗑️', bookingData);
      
      toast.warning(
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{message}</div>
          <div>{content}</div>
        </div>,
        { autoClose: 5000, ...options }
      );
    } else {
      const messageKey = isCustomerView ? 'bookingCancelledCustomer' : 'bookingDeleted';
      showWarningToast(messageKey, {}, options);
    }
  };

  /**
   * Handle real-time booking toast notifications
   */
  const handleBookingRealtimeToast = (payload, options = {}) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const { isCustomerView = false } = options;
    
    switch (eventType) {
      case 'INSERT':
        showBookingCreatedToast(newRecord, { isCustomerView, ...options });
        break;
      case 'UPDATE':
        showBookingUpdatedToast(oldRecord, newRecord, { isCustomerView, ...options });
        break;
      case 'DELETE':
        showBookingDeletedToast(oldRecord, { isCustomerView, ...options });
        break;
      default:
        console.warn('Unknown booking event type:', eventType);
    }
  };

  /**
   * Show multilingual user update toast
   */
  const showUserUpdateToast = (oldData, newData, options = {}) => {
    const changes = getFieldChanges(oldData, newData, {
      first_name: { label: t('profile.firstName'), format: (value) => value },
      last_name: { label: t('profile.lastName'), format: (value) => value },
      email: { label: t('profile.email'), format: (value) => value },
      phone: { label: t('profile.phone'), format: (value) => value || t('common.notSet') }
    });
    
    if (changes.length > 0) {
      const message = t('messages.success.profileUpdated');
      const changesList = changes.map(change => 
        `${change.label}: ${change.oldValue} → ${change.newValue}`
      ).join('\n');
      
      toast.success(
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{message}</div>
          <div style={{ fontSize: '0.9em', whiteSpace: 'pre-line' }}>{changesList}</div>
        </div>,
        { autoClose: 5000, ...options }
      );
    } else {
      showSuccessToast('profileUpdated', {}, options);
    }
  };

  return {
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast,
    showBookingCreatedToast,
    showBookingUpdatedToast,
    showBookingDeletedToast,
    handleBookingRealtimeToast,
    showUserUpdateToast
  };
};

/**
 * Hook to use multilingual toast utilities
 * @returns {Object} Toast utility functions
 */
export const useMultilingualToast = () => {
  const { t } = useLanguage();
  return createMultilingualToastUtils(t);
};