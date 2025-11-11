import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import AuthForm from './components/auth/AuthForm';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import CustomerDashboard from './components/customer/CustomerDashboard';
import DatabaseService from './services/DatabaseService';
import LoadingSpinner from './components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { USER_ROLES, ERROR_MESSAGES, SUCCESS_MESSAGES, TABLES } from './constants';
import { filterUsersByRole } from './utils';
import { useLanguage } from './contexts/LanguageContext';
import { useCompactMode } from './contexts/CompactModeContext';

// Import custom hooks
import { useAuthState } from './hooks/auth/useAuthState';
import { useAuthValidation } from './hooks/auth/useAuthValidation';
import { useAuthTimer } from './hooks/auth/useAuthTimer';
import { useAuthHandlers } from './hooks/auth/useAuthHandlers';
import { useAuthEffects } from './hooks/auth/useAuthEffects';

// Import components
import TimeoutPrompt from './components/auth/TimeoutPrompt';
import ExpiredLinkError from './components/auth/ExpiredLinkError';

export default function Auth() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isCompactMode, toggleCompactMode } = useCompactMode();
  const [showForgotPasswordInitially, setShowForgotPasswordInitially] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('forgotPassword') === 'true') {
      setShowForgotPasswordInitially(true);
    }
  }, []);
  
  // Override compact mode for login page
  useEffect(() => {
    let wasCompactMode = false;
    
    // If compact mode is currently enabled, disable it for the login page
    if (isCompactMode) {
      wasCompactMode = true;
      toggleCompactMode(); // This will disable compact mode
    }
    
    // Cleanup function to restore compact mode when leaving the auth page
    return () => {
      // Only restore compact mode if it was previously enabled
      if (wasCompactMode && !isCompactMode) {
        toggleCompactMode(); // This will re-enable compact mode
      }
    };
  }, []); // Empty dependency array to run only on mount/unmount
  
  // Use custom hooks for state management
  const authState = useAuthState();
  const { validateForm, validateSignInForm, validateEmail, validatePhoneNumber } = useAuthValidation();
  const { startResendTimer, resetTimer, formatTimer } = useAuthTimer(
    authState.resendTimer,
    authState.setResendTimer,
    authState.setCanResend
  );
  
  // Get authentication handlers
  const {
    handleSignUp,
    handleSignIn,
    handleForgotPassword,
    handleResetPassword,
    handlePhoneSignUp,
    handlePhoneSignIn,
    checkUserRoleAndRedirect
  } = useAuthHandlers(authState, validateForm, validateSignInForm, validateEmail, validatePhoneNumber, startResendTimer);
  
  // Use authentication effects
  useAuthEffects(authState, checkUserRoleAndRedirect);
  
  // Handler functions for timeout and verification
  const handleResendOtp = async () => {
    if (!authState.canResend) return;
    
    authState.setError('');
    authState.setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'sms',
        phone: authState.mobile
      });
      
      if (error) {
        authState.setError(error.message);
      } else {
        toast.success('OTP sent successfully!');
        startResendTimer();
      }
    } catch (err) {
      authState.setError('Failed to resend OTP. Please try again.');
    } finally {
      authState.setIsLoading(false);
    }
  };
  
  const handleOtpVerification = async () => {
    if (!authState.otp || authState.otp.length !== 6) {
      authState.setError('Please enter a valid 6-digit OTP');
      return;
    }
    
    authState.setIsLoading(true);
    authState.setError('');
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: authState.mobile,
        token: authState.otp,
        type: 'sms'
      });
      
      if (error) {
        authState.setError(error.message);
      } else if (data.user) {
        await checkUserRoleAndRedirect(data.user);
      }
    } catch (err) {
      authState.setError('OTP verification failed. Please try again.');
    } finally {
      authState.setIsLoading(false);
    }
  };
  
  const handleTimeoutRefresh = () => {
    authState.setShowTimeoutPrompt(false);
    window.location.reload();
  };
  
  const handleTimeoutCancel = () => {
    authState.setShowTimeoutPrompt(false);
    // Clear URL hash and stay on current page
    window.location.hash = '';
  };
  
  // Show timeout prompt
  if (authState.showTimeoutPrompt) {
    return (
      <TimeoutPrompt 
        onRefresh={handleTimeoutRefresh}
        onCancel={handleTimeoutCancel}
      />
    );
  }
  
  if (authState.isLoading) {
    const loadingText = authState.isVerifying 
      ? 'Verifying your email... This may take up to 30 seconds.' 
      : t('common.loading');
    return <LoadingSpinner fullScreen={true} text={loadingText} />;
  }
  
  if (authState.showExpiredLinkError) {
    return (
      <ExpiredLinkError 
        onGoToLogin={() => {
          authState.setShowExpiredLinkError(false);
          authState.setIsSignUp(false);
          authState.setError('');
        }}
        onCreateAccount={() => {
          authState.setShowExpiredLinkError(false);
          authState.setIsSignUp(true);
          authState.setError('');
        }}
      />
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {!authState.isLoading && authState.error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {authState.error}
        </div>
      )}
      
      {authState.isSignedIn ? (
        <div>
          {authState.userRole === USER_ROLES.ADMIN && <AdminDashboard />}
          {authState.userRole === USER_ROLES.STAFF && <StaffDashboard />}
          {authState.userRole === USER_ROLES.CUSTOMER && <CustomerDashboard />}
        </div>
      ) : (
        <AuthForm
          isSignUp={authState.isSignUp}
          setIsSignUp={authState.setIsSignUp}
          email={authState.email}
          setEmail={authState.setEmail}
          password={authState.password}
          setPassword={authState.setPassword}
          name={authState.name}
          setName={authState.setName}
          postCode={authState.postCode}
          setPostCode={authState.setPostCode}
          birthday={authState.birthday}
          setBirthday={authState.setBirthday}
          gender={authState.gender}
          setGender={authState.setGender}
          mobile={authState.mobile}
          setMobile={authState.setMobile}
          authMethod={authState.authMethod}
          setAuthMethod={authState.setAuthMethod}
          otpSent={authState.otpSent}
          otp={authState.otp}
          setOtp={authState.setOtp}
          resendTimer={authState.resendTimer}
          canResend={authState.canResend}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onOtpVerification={handleOtpVerification}
          onResendOtp={handleResendOtp}
          onResetPassword={handleResetPassword}
          isLoading={authState.isLoading}
          isMobileAuthEnabled={authState.isMobileAuthEnabled}
          confirmationMessage={authState.confirmationMessage}
          setConfirmationMessage={authState.setConfirmationMessage}
          showForgotPasswordInitially={showForgotPasswordInitially}
        />
      )}
    </div>
  );
}

