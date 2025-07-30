import { useCallback } from 'react';

export const useAuthValidation = () => {
  const validateForm = useCallback((email, password, name, mobile) => {
    if (!email || !password) {
      return { isValid: false, error: 'Please enter your email and password' };
    }
    if (!name) {
      return { isValid: false, error: 'Please enter your name' };
    }
    if (!mobile) {
      return { isValid: false, error: 'Please enter your mobile number' };
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters' };
    }
    
    return { isValid: true, error: '' };
  }, []);
  
  const validateSignInForm = useCallback((email, password) => {
    if (!email || !password) {
      return { isValid: false, error: 'Please enter your email and password' };
    }
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters' };
    }
    
    return { isValid: true, error: '' };
  }, []);
  
  const validateEmail = useCallback((email) => {
    if (!email) {
      return { isValid: false, error: 'Please enter your email address to reset your password.' };
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return { isValid: false, error: 'Please enter a valid email address.' };
    }
    
    return { isValid: true, error: '' };
  }, []);
  
  const validatePhoneNumber = useCallback((mobile) => {
    if (!mobile) {
      return { isValid: false, error: 'Please enter your phone number' };
    }
    
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(mobile)) {
      console.log('WARNING: Phone number may not be in international format (+country_code)');
      console.log('Expected format: +1234567890 (with country code)');
    }
    
    return { isValid: true, error: '' };
  }, []);
  
  return {
    validateForm,
    validateSignInForm,
    validateEmail,
    validatePhoneNumber
  };
};