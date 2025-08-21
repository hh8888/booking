import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { TABLES } from '../../constants';
import DatabaseService from '../../services/DatabaseService';

export const useAuthEffects = (authState, checkUserRoleAndRedirect) => {
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
    const checkSessionAndSettings = async () => {
      authState.setIsLoading(true);
      authState.setError('');
      
      // Fetch mobile auth setting
      try {
        const dbService = DatabaseService.getInstance();
        const mobileAuthSetting = await dbService.getSettingsByKey('system', 'enableMobileAuth');
        authState.setIsMobileAuthEnabled(
          mobileAuthSetting === 'true' || mobileAuthSetting === true
        );
      } catch (err) {
        console.error('Error fetching mobile auth setting:', err);
        authState.setIsMobileAuthEnabled(false);
      }

      // Check for expired email verification link
      const hash = window.location.hash;
      const isExpiredEmailLink = hash.includes('error=access_denied') && 
                                 hash.includes('error_code=otp_expired') && 
                                 hash.includes('error_description=Email+link+is+invalid+or+has+expired');
      
      if (isExpiredEmailLink) {
        window.location.hash = '';
        authState.setShowExpiredLinkError(true);
        authState.setIsLoading(false);
        return;
      }

      // Check for reset password flow
      const isResetPasswordFlow = 
        window.location.hash.startsWith('#/reset-password') || 
        (window.location.hash.includes('error_description=') && !isExpiredEmailLink);

      if (isResetPasswordFlow) {
        authState.setIsLoading(false);
        return; 
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await checkUserRoleAndRedirect(session.user);
      }
      authState.setIsLoading(false);
    };
    
    checkSessionAndSettings();
  }, []);

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
  }, [authState.isVerifying, authState.verificationTimeout]);
};