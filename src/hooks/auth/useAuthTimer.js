import { useEffect, useCallback } from 'react';

export const useAuthTimer = (resendTimer, setResendTimer, setCanResend) => {
  // Timer effect for resend functionality
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(timer => {
          if (timer <= 1) {
            setCanResend(true);
            return 0;
          }
          return timer - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer, setResendTimer, setCanResend]);
  
  const startResendTimer = useCallback((seconds = 120) => {
    setResendTimer(seconds);
    setCanResend(false);
  }, [setResendTimer, setCanResend]);
  
  const resetTimer = useCallback(() => {
    setResendTimer(0);
    setCanResend(true);
  }, [setResendTimer, setCanResend]);
  
  const formatTimer = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
  return {
    startResendTimer,
    resetTimer,
    formatTimer
  };
};