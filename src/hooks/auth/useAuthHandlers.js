import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { USER_ROLES, ERROR_MESSAGES, TABLES } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';
import DatabaseService from '../../services/DatabaseService';
import { isFakeEmail } from '../../utils/validationUtils';
import LocationService from '../../services/LocationService'; // Add this import

export const useAuthHandlers = (authState, validateForm, validateSignInForm, validateEmail, validatePhoneNumber, startResendTimer) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const checkUserRoleAndRedirect = async (user) => {
    try {
      // Check if this is a repeated click on verification link for already verified user
      const hash = window.location.hash;
      const isVerificationLink = hash.includes('access_token') && hash.includes('type=signup');
      
      if (isVerificationLink && user.confirmed_at) {
        console.log('User already verified, clearing hash and redirecting to sign-in');
        window.location.hash = '';
        authState.setIsSignedIn(false);
        authState.setUserRole(null);
        authState.setIsSignUp(false);
        toast.info('Your email is already verified. Please sign in to continue.');
        return;
      }
      
      const { data: userData, error } = await supabase
        .from(TABLES.USERS)
        .select('role')
        .eq('id', user.id)
        .single();
  
      if (error) {
        console.error('Database error:', error);
        if (error.code === 'PGRST116') {
          authState.setError('Account setup incomplete. User record not found in database. Please contact support.');
        } else if (error.code === '42501') {
          authState.setError('Access denied. Please check your permissions or contact support.');
        } else {
          authState.setError(`Database error: ${error.message}`);
        }
        return;
      }
  
      authState.setUserRole(userData.role);
      authState.setIsSignedIn(true);
  
      // Redirect based on role
      const roleRoutes = {
        [USER_ROLES.CUSTOMER]: '/booking',
        [USER_ROLES.STAFF]: '/staff',
        [USER_ROLES.MANAGER]: '/admin',
        [USER_ROLES.ADMIN]: '/admin'
      };
      
      const route = roleRoutes[userData.role];
      if (route) {
        navigate(route);
      } else {
        authState.setError(ERROR_MESSAGES.UNKNOWN_ROLE);
      }
    } catch (err) {
      console.error('Unexpected error in checkUserRoleAndRedirect:', err);
      authState.setError(t('messages.error.general'));
    }
  };

  const handleSignUp = async () => {
    if (!validateForm(authState)) return;
    authState.setIsLoading(true);
    
    try {
      const isFakeEmailAddress = isFakeEmail(authState.email);
      
      if (isFakeEmailAddress) {
        // For fake emails, use admin API to create user without triggering emails
        const { data, error } = await supabase.auth.admin.createUser({
          email: authState.email,
          password: authState.password,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            full_name: authState.name,
            skip_confirmation: true
          }
        });
        
        if (error) throw error;
        
        // Insert user data directly
        const { error: userError } = await supabase
          .from(TABLES.USERS)
          .insert([{
            id: data.user.id,
            email: authState.email,
            full_name: authState.name,
            post_code: authState.postCode,
            birthday: authState.birthday || null,
            gender: authState.gender || null,
            phone_number: authState.mobile || null,
            role: USER_ROLES.CUSTOMER,
            email_verified: true, // Mark as verified for fake emails
          }]);
          
        if (userError) throw userError;
      } else {
        // For real emails, use normal signup
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email: authState.email, 
          password: authState.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: authState.name
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        // Insert user data
        const { error: userError } = await supabase
          .from(TABLES.USERS)
          .insert([{
            id: data.user.id,
            email: authState.email,
            full_name: authState.name,
            post_code: authState.postCode,
            birthday: authState.birthday || null,
            gender: authState.gender || null,
            phone_number: authState.mobile || null,
            role: USER_ROLES.CUSTOMER,
            email_verified: false,
          }]);
          
        if (userError) throw userError;
      }
      
      // Show different messages based on email type
      if (isFakeEmailAddress) {
        authState.setConfirmationMessage('Account created successfully! You can now sign in.');
        toast.success('Registration successful! Account ready to use.');
      } else {
        authState.setConfirmationMessage('Please check your email for the confirmation link.');
        toast.success('Registration successful!');
      }
      
      authState.setIsSignUp(false);
      authState.clearForm();
      
    } catch (err) {
      // Handle duplicate email errors with user-friendly message
      if (err.message && (
        err.message.includes('User already registered') ||
        err.message.includes('already registered') ||
        err.message.includes('duplicate key value violates unique constraint') ||
        err.message.includes('users_pkey')
      )) {
        authState.setError(ERROR_MESSAGES.DUPLICATE_EMAIL);
      } else {
        authState.setError(err.message);
      }
    } finally {
      authState.setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateSignInForm(authState)) return;
    
    authState.setIsLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authState.email,
        password: authState.password,
      });
  
      if (signInError) throw signInError;
  
      // Check if this is a fake email user
      const isFakeEmailUser = isFakeEmail(authState.email);
      
      // For real email users, check confirmation status
      if (!isFakeEmailUser && !data.user.confirmed_at) {
        authState.setError('Please check your email to validate your account before signing in.');
        return;
      }
      
      // For fake email users, we skip the confirmed_at check since they can't receive emails
      // but we should verify they exist in our users table with email_verified = true
      // above is not true, fake email user is not verified
      if (isFakeEmailUser) {
        // const { data: userData, error: userError } = await supabase
        //   .from(TABLES.USERS)
        //   .select('email_verified')
        //   .eq('id', data.user.id)
        //   .single();
          
        // if (userError || !userData?.email_verified) {
        //   authState.setError('Account verification required. Please contact support.');
        //   return;
        // }
      } else {
  
        // Update last_sign_in timestamp
        const { error: updateError } = await supabase
          .from(TABLES.USERS)
          .update({ last_sign_in: new Date().toISOString() })
          .eq('id', data.user.id);
    
        if (updateError) {
          console.warn('Could not update last_sign_in:', updateError.message);
        }
      }
  
      // Fetch user's last_location and set it in LocationService
      try {
        const { data: userData, error: userError } = await supabase
          .from(TABLES.USERS)
          .select('last_location')
          .eq('id', data.user.id)
          .single();
  
        if (!userError && userData?.last_location !== null && userData?.last_location !== undefined) {
          // Get LocationService instance
          const locationService = LocationService.getInstance();
          
          // Get available locations
          const locations = locationService.getLocations();
          
          // If locations are not loaded yet, initialize them first
          if (!locations || locations.length === 0) {
            const dbService = DatabaseService.getInstance();
            await locationService.initializeLocations(dbService);
          }
          
          // Set the user's last location
          const updatedLocations = locationService.getLocations();
          // Fix: Find location by ID instead of using array index
          const userLocation = updatedLocations.find(loc => loc.id === userData.last_location);
          if (userLocation) {
            locationService.setSelectedLocation(userLocation);
            console.log('Set user location to last_location:', userData.last_location, userLocation.name);
          } else {
            console.warn('Invalid last_location ID:', userData.last_location);
          }
        } else {
          console.log('No last_location found for user or error fetching:', userError?.message);
        }
      } catch (locationError) {
        console.warn('Could not set user location:', locationError.message);
        // Don't fail the login process if location setting fails
      }
  
      await checkUserRoleAndRedirect(data.user);
    } catch (err) {
      authState.setError(err.message);
    } finally {
      authState.setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const validation = validateEmail(authState.email);
    if (!validation.isValid) {
      authState.setError(validation.error);
      return;
    }
  
    authState.setIsLoading(true);
    authState.setError('');
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(authState.email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
  
      if (resetError) throw resetError;
  
      authState.setResetPasswordSent(true);
      authState.setError('Password reset email sent! Please check your inbox.');
    } catch (err) {
      authState.setError(err.message);
    } finally {
      authState.setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const emailValidation = validateEmail(authState.email);
    if (!emailValidation.isValid) {
      authState.setError(emailValidation.error);
      return;
    }

    authState.setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authState.email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      
      if (error) throw error;
      
      authState.setConfirmationMessage('Password reset email sent. Please check your inbox.');
      toast.success('Password reset email sent!');
    } catch (err) {
      authState.setError(err.message);
    } finally {
      authState.setIsLoading(false);
    }
  };

  const handlePhoneSignUp = async () => {
    if (!authState.isMobileAuthEnabled) {
      authState.setError('Mobile sign up is currently disabled.');
      return;
    }
    
    const nameValidation = authState.name ? { isValid: true } : { isValid: false, error: 'Please enter your name' };
    const phoneValidation = validatePhoneNumber(authState.mobile);
    
    if (!nameValidation.isValid) {
      authState.setError(nameValidation.error);
      return;
    }
    
    if (!phoneValidation.isValid) {
      authState.setError(phoneValidation.error);
      return;
    }

    authState.setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        phone: authState.mobile,
        password: 'temp-password',
        options: {
          data: {
            full_name: authState.name,
            post_code: authState.postCode,
            birthday: authState.birthday || null,
            gender: authState.gender || null,
          }
        }
      });

      if (signUpError) throw signUpError;

      authState.setOtpSent(true);
      startResendTimer(120);
      authState.setError('OTP sent to your phone. Please enter the verification code.');
    } catch (err) {
      authState.setError(err.message);
    } finally {
      authState.setIsLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    if (!authState.isMobileAuthEnabled) {
      authState.setError('Mobile sign in is currently disabled.');
      return;
    }
    
    const phoneValidation = validatePhoneNumber(authState.mobile);
    if (!phoneValidation.isValid) {
      authState.setError(phoneValidation.error);
      return;
    }

    authState.setIsLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithOtp({
        phone: authState.mobile,
      });

      if (signInError) throw signInError;

      authState.setOtpSent(true);
      startResendTimer(120);
      authState.setError('OTP sent to your phone. Please enter the verification code.');
    } catch (err) {
      authState.setError(err.message);
    } finally {
      authState.setIsLoading(false);
    }
  };

  return {
    handleSignUp,
    handleSignIn,
    handleForgotPassword,
    handleResetPassword,
    handlePhoneSignUp,
    handlePhoneSignIn,
    checkUserRoleAndRedirect
  };
};