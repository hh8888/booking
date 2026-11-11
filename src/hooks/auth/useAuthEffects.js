import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { TABLES } from '../../constants';
import DatabaseService from '../../services/DatabaseService';
import withTimeout from '../../utils/withTimeout';
import { useSystemSettings } from '../useSystemSettings';

export const useAuthEffects = (authState, checkUserRoleAndRedirect) => {
  const location = useLocation();
  const { error, errorCode, errorDescription } = location.state || {};
  const { settings: systemSettings, loading: systemSettingsLoading } = useSystemSettings();

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
    // Expired or invalid email link (from the URL query or router state)
    const params = new URLSearchParams(location.search);
    const linkError = params.get('error') || error;
    const linkErrorCode = params.get('error_code') || errorCode;

    if (linkError && (linkErrorCode === 'otp_expired' || linkError === 'access_denied')) {
      console.log('useAuthEffects: Expired or invalid link detected.');
      authState.setShowExpiredLinkError(true);
      authState.setIsLoading(false);
      return; // Stop further execution
    }

    console.log('useAuthEffects: systemSettingsLoading changed:', systemSettingsLoading);
    if (systemSettingsLoading) {
      return; // Wait for settings to be loaded
    }

    const mobileAuthSetting = systemSettings.enableMobileAuth || 'false';
    console.log('useAuthEffects: Mobile auth setting from useSystemSettings:', mobileAuthSetting);
    authState.setIsMobileAuthEnabled(mobileAuthSetting === 'true' || mobileAuthSetting === true);

    const checkSession = async () => {
      console.log('useAuthEffects: checkSession started.');
      authState.setIsLoading(true);
      console.log('useAuthEffects: isLoading set to true.');
      authState.setError('');
      try {
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
        let session = null;
        try {
          const res = await withTimeout(supabase.auth.getSession(), 15000);
          session = res?.data?.session || null;
        } catch (err) {
          console.error('useAuthEffects: Failed to get Supabase session:', err);
          session = null;
        }
        console.log('useAuthEffects: Supabase session obtained:', session);
        if (session) {
          console.log('useAuthEffects: Session exists, checking user role and redirecting...');
          await checkUserRoleAndRedirect(session.user);
          console.log('useAuthEffects: User role checked and redirected.');
        }
      } catch (err) {
        console.error('useAuthEffects: Unhandled error in checkSession:', err);
      } finally {
        authState.setIsLoading(false);
        console.log('useAuthEffects: isLoading set to false (end of checkSession).');
      }
    };

    checkSession();
    // checkUserRoleAndRedirect is deliberately not a dependency: it is a new
    // function on every render, which would restart the session check forever.
  }, [location, systemSettings, systemSettingsLoading]);

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
