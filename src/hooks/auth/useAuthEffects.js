import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { TABLES } from '../../constants';
import DatabaseService from '../../services/DatabaseService';

export const useAuthEffects = (authState, checkUserRoleAndRedirect) => {
  const location = useLocation();
  const { error, errorCode, errorDescription } = location.state || {};

  // Timer effect for resend functionality
  useEffect(() => {
    let interval = null;
    if (authState.resendTimer > 0) {
      interval = setInterval(() => {
        authState.setResendTimer(timer => {
          if (timer <= 1) {
            authState.setCanResend(true);
            return 0;
          }
          return timer - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [authState.resendTimer, authState.setResendTimer, authState.setCanResend]);

  // Session and settings check effect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    const errorCodeParam = params.get('error_code');

    const { state } = location;
    const errorState = state?.error;
    const errorCodeState = state?.errorCode;

    const error = errorParam || errorState;
    const errorCode = errorCodeParam || errorCodeState;

    if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
      console.log('useAuthEffects: Expired or invalid link detected.');
      authState.setShowExpiredLinkError(true);
      authState.setIsLoading(false);
      return; // Stop further execution
    }

    const checkSessionAndSettings = async () => {
      console.log('useAuthEffects: checkSessionAndSettings started.');
      authState.setIsLoading(true);
      console.log('useAuthEffects: isLoading set to true.');
      authState.setError('');

      // Fetch mobile auth setting
      try {
        const dbService = DatabaseService.getInstance();
        console.log('useAuthEffects: Fetching mobile auth setting...');
        const mobileAuthSetting = await dbService.getSettingsByKey('system', 'enableMobileAuth');
        console.log('useAuthEffects: Mobile auth setting fetched:', mobileAuthSetting);
        authState.setIsMobileAuthEnabled(
          mobileAuthSetting === 'true' || mobileAuthSetting === true
        );
      } catch (err) {
        console.error('Error fetching mobile auth setting:', err);
        authState.setIsMobileAuthEnabled(false);
      }

      // Check for reset password flow
      const hash = window.location.hash;
      const isResetPasswordFlow =
        hash.startsWith('#/reset-password') ||
        hash.includes('error_description=');

      if (isResetPasswordFlow) {
        authState.setIsLoading(false);
        console.log('useAuthEffects: Reset password flow detected, isLoading set to false.');
        return;
      }

      console.log('useAuthEffects: Getting Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('useAuthEffects: Supabase session obtained:', session);
      if (session) {
        console.log('useAuthEffects: Session exists, checking user role and redirecting...');
        await checkUserRoleAndRedirect(session.user);
        console.log('useAuthEffects: User role checked and redirected.');
      }
      authState.setIsLoading(false);
      console.log('useAuthEffects: isLoading set to false (end of checkSessionAndSettings).');
    };

    checkSessionAndSettings();
  }, [location]); // Add location to dependency array

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const hash = window.location.hash;
      const isVerificationLink = hash.includes('access_token') && hash.includes('type=signup');

      if (isVerificationLink && !authState.isVerifying) {
        authState.setIsVerifying(true);
        authState.setIsLoading(true);

        const timeoutId = setTimeout(() => {
          authState.setIsLoading(false);
          authState.setIsVerifying(false);
          authState.setShowTimeoutPrompt(true);
        }, 60000);

        authState.setVerificationTimeout(timeoutId);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        if (authState.verificationTimeout) {
          clearTimeout(authState.verificationTimeout);
          authState.setVerificationTimeout(null);
        }
        authState.setIsVerifying(false);
        authState.setShowTimeoutPrompt(false);

        if (session.user.confirmed_at) {
          try {
            const { data: currentUser, error: fetchError } = await supabase
              .from(TABLES.USERS)
              .select('email_verified')
              .eq('id', session.user.id)
              .single();

            if (!fetchError && !currentUser.email_verified) {
              const { error: updateError } = await supabase
                .from(TABLES.USERS)
                .update({ email_verified: true })
                .eq('id', session.user.id);

              if (!updateError) {
                toast.success('Email verified successfully! Welcome to the platform.');
              }
            }
          } catch (err) {
            console.error('Error updating email verification status:', err);
          }
        }

        await checkUserRoleAndRedirect(session.user);
      }
    });

    return () => {
      subscription?.unsubscribe();
      if (authState.verificationTimeout) {
        clearTimeout(authState.verificationTimeout);
      }
    };
  }, [authState.isVerifying, authState.verificationTimeout, checkUserRoleAndRedirect]);
};