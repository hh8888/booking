import { useState } from 'react';

export const useAuthState = () => {
  // User credentials
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [postCode, setPostCode] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  
  // Authentication states
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState('');
  const [resetPasswordSent, setResetPasswordSent] = useState(false);
  const [authMethod, setAuthMethod] = useState('email');
  
  // OTP and verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationTimeout, setVerificationTimeout] = useState(null);
  const [showTimeoutPrompt, setShowTimeoutPrompt] = useState(false);
  
  // Timer states
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  
  // Settings and UI states
  const [isMobileAuthEnabled, setIsMobileAuthEnabled] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [showExpiredLinkError, setShowExpiredLinkError] = useState(false);
  
  // Clear form function
  const clearForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPostCode('');
    setBirthday('');
    setGender('');
    setMobile('');
    setOtp('');
    setError('');
  };
  
  // Reset authentication state
  const resetAuthState = () => {
    setIsSignedIn(false);
    setUserRole(null);
    setOtpSent(false);
    setIsVerifying(false);
    setShowTimeoutPrompt(false);
    setResetPasswordSent(false);
    setConfirmationMessage('');
    setShowExpiredLinkError(false);
    if (verificationTimeout) {
      clearTimeout(verificationTimeout);
      setVerificationTimeout(null);
    }
  };
  
  return {
    // User credentials
    email, setEmail,
    name, setName,
    password, setPassword,
    postCode, setPostCode,
    birthday, setBirthday,
    gender, setGender,
    mobile, setMobile,
    
    // Authentication states
    isSignUp, setIsSignUp,
    isLoading, setIsLoading,
    isSignedIn, setIsSignedIn,
    userRole, setUserRole,
    error, setError,
    resetPasswordSent, setResetPasswordSent,
    authMethod, setAuthMethod,
    
    // OTP and verification states
    otpSent, setOtpSent,
    otp, setOtp,
    isVerifying, setIsVerifying,
    verificationTimeout, setVerificationTimeout,
    showTimeoutPrompt, setShowTimeoutPrompt,
    
    // Timer states
    resendTimer, setResendTimer,
    canResend, setCanResend,
    
    // Settings and UI states
    isMobileAuthEnabled, setIsMobileAuthEnabled,
    confirmationMessage, setConfirmationMessage,
    showExpiredLinkError, setShowExpiredLinkError,
    
    // Utility functions
    clearForm,
    resetAuthState
  };
};