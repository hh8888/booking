import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import AuthForm from './components/auth/AuthForm';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import CustomerDashboard from './components/customer/CustomerDashboard';
import DatabaseService from './services/DatabaseService';
import LoadingSpinner from './components/common/LoadingSpinner';
import { toast } from 'react-toastify'; // Use the existing toast library
import { USER_ROLES, ERROR_MESSAGES, SUCCESS_MESSAGES, TABLES } from './constants';
import { filterUsersByRole } from './utils';
import { useLanguage } from './contexts/LanguageContext';

export default function Auth() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [postCode, setPostCode] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState('');
  const [resetPasswordSent, setResetPasswordSent] = useState(false);
  const [authMethod, setAuthMethod] = useState('email');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [isMobileAuthEnabled, setIsMobileAuthEnabled] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  
  // Add the missing state variables for verification timeout
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationTimeout, setVerificationTimeout] = useState(null);
  const [showTimeoutPrompt, setShowTimeoutPrompt] = useState(false);
  
  // Add new state for expired email link
  const [showExpiredLinkError, setShowExpiredLinkError] = useState(false);
  
  const navigate = useNavigate();
  
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
  }, [resendTimer]);

  useEffect(() => {
    const checkSessionAndSettings = async () => {
      setIsLoading(true);
      // Clear any existing errors when component mounts
      setError('');
      
      // Fetch mobile auth setting
      try {
        const dbService = DatabaseService.getInstance();
        const mobileAuthSetting = await dbService.getSettingsByKey('system', 'enableMobileAuth');
        if (mobileAuthSetting !== null && mobileAuthSetting !== undefined) {
          setIsMobileAuthEnabled(mobileAuthSetting === 'true' || mobileAuthSetting === true);
        } else {
          // Default to false if setting not found - don't try to create it here
          // Settings should be created by admin users through the settings interface
          setIsMobileAuthEnabled(false);
        }
      } catch (err) {
        console.error('Error fetching mobile auth setting:', err);
        setIsMobileAuthEnabled(false); // Default to false on error
      }

      // Log current path and hash for debugging
      console.log('Auth.js useEffect - Pathname:', window.location.pathname);
      console.log('Auth.js useEffect - Hash:', window.location.hash);

      // Check for expired email verification link
      const hash = window.location.hash;
      const isExpiredEmailLink = hash.includes('error=access_denied') && 
                                 hash.includes('error_code=otp_expired') && 
                                 hash.includes('error_description=Email+link+is+invalid+or+has+expired');
      
      if (isExpiredEmailLink) {
        console.log('Expired email verification link detected');
        // Clear the hash
        window.location.hash = '';
        
        // Set expired link error state instead of navigating
        setShowExpiredLinkError(true);
        setIsLoading(false);
        return;
      }

      // UPDATED CHECK for reset password flow (success or error) - exclude email verification errors
      const isResetPasswordFlow = 
        window.location.hash.startsWith('#/reset-password') || 
        (window.location.hash.includes('error_description=') && !isExpiredEmailLink); // Exclude email verification errors

      if (isResetPasswordFlow) {
        console.log('Auth.js: On reset-password flow (or error), skipping initial session redirect logic.');
        setIsLoading(false);
        return; 
      } else {
        console.log('Auth.js: Not on reset-password flow. Pathname was:', window.location.pathname, 'Hash was:', window.location.hash);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await checkUserRoleAndRedirect(session.user);
      } else {
        console.log('Auth.js: No session, user should be on Auth page or will be handled by route protection.');
      }
      setIsLoading(false);
    };
    checkSessionAndSettings();
  }, []); // Remove 'navigate' from dependencies

  // Add auth state change listener for email verification with timeout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event);
      console.log('Session:', session?.user ? 'User present' : 'No user');
      
      // Check if this is a verification link click
      const hash = window.location.hash;
      const isVerificationLink = hash.includes('access_token') && hash.includes('type=signup');
      
      if (isVerificationLink && !isVerifying) {
        console.log('Email verification link detected, starting timeout');
        setIsVerifying(true);
        setIsLoading(true);
        
        // Set 30-second timeout
        const timeoutId = setTimeout(() => {
          console.log('Verification timeout reached');
          setIsLoading(false);
          setIsVerifying(false);
          setShowTimeoutPrompt(true);
        }, 30000); // 30 seconds
        
        setVerificationTimeout(timeoutId);
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, checking email verification status');
        
        // Clear timeout if verification succeeds
        if (verificationTimeout) {
          clearTimeout(verificationTimeout);
          setVerificationTimeout(null);
        }
        setIsVerifying(false);
        setShowTimeoutPrompt(false);
        
        // Check if user's email is confirmed and update email_verified field
        if (session.user.confirmed_at) {
          console.log('User email is confirmed, updating email_verified field');
          try {
            // First check if email_verified is already true to avoid unnecessary updates
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
              
              if (updateError) {
                console.error('Error updating email_verified field:', updateError);
              } else {
                console.log('Successfully updated email_verified to true');
                // Show success message for email verification
                toast.success('Email verified successfully! Welcome to the platform.');
              }
            }
          } catch (err) {
            console.error('Error updating email verification status:', err);
          }
        }
        
        // Handle redirect after email verification
        await checkUserRoleAndRedirect(session.user);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed, checking if email verification status changed');
        
        // Check if email verification status changed during token refresh
        if (session.user.confirmed_at) {
          try {
            const { data: userData, error: fetchError } = await supabase
              .from(TABLES.USERS)
              .select('email_verified')
              .eq('id', session.user.id)
              .single();
            
            if (!fetchError && !userData.email_verified) {
              console.log('Email verified during token refresh, updating database');
              const { error: updateError } = await supabase
                .from(TABLES.USERS)
                .update({ email_verified: true })
                .eq('id', session.user.id);
              
              if (updateError) {
                console.error('Error updating email_verified field:', updateError);
              } else {
                console.log('Successfully updated email_verified to true');
              }
            }
          } catch (err) {
            console.error('Error checking/updating email verification status:', err);
          }
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
      // Clean up timeout on unmount
      if (verificationTimeout) {
        clearTimeout(verificationTimeout);
      }
    };
  }, [isVerifying, verificationTimeout]);

  const checkUserRoleAndRedirect = async (user) => {
    try {
      // Check if this is a repeated click on verification link for already verified user
      const hash = window.location.hash;
      const isVerificationLink = hash.includes('access_token') && hash.includes('type=signup');
      
      if (isVerificationLink && user.confirmed_at) {
        // User is already verified but clicked the link again
        console.log('User already verified, clearing hash and redirecting to sign-in');
        window.location.hash = '';
        setIsSignedIn(false);
        setUserRole(null);
        setIsSignUp(false);
        toast.info('Your email is already verified. Please sign in to continue.');
        return;
      }
      
      const { data: userData, error } = await supabase
        .from(TABLES.USERS)
        .select('role')
        .eq('id', user.id)
        .single();
  
      console.log('Database query result:', { userData, error });
      
      if (error) {
        console.error('=== DATABASE ERROR DETAILS ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error object:', error);
        
        if (error.code === 'PGRST116') {
          console.error('USER NOT FOUND: User exists in auth.users but not in users table');
          setError('Account setup incomplete. User record not found in database. Please contact support.');
        } else if (error.code === '42501') {
          console.error('PERMISSION DENIED: RLS policy blocking access');
          setError('Access denied. Please check your permissions or contact support.');
        } else {
          console.error('UNKNOWN DATABASE ERROR');
          setError(`Database error granting user: ${error.message}`);
        }
        console.error('=== DATABASE ERROR DEBUG END ===');
        return;
      }
  
      console.log('User role successfully retrieved:', userData.role);
      setUserRole(userData.role);
      setIsSignedIn(true);
  
      // Redirect based on role
      console.log('Redirecting user based on role:', userData.role);
      if (userData.role === USER_ROLES.CUSTOMER) {
        console.log('Redirecting to /booking');
        navigate('/booking');
      } else if (userData.role === USER_ROLES.STAFF) {
        console.log('Redirecting to /staff');
        navigate('/staff');
      } else if (userData.role === USER_ROLES.MANAGER) {
        console.log('Redirecting to /admin');
        navigate('/admin');
      } else if (userData.role === USER_ROLES.ADMIN) {
        console.log('Redirecting to /admin');
        navigate('/admin');
      } else {
        console.warn('Unknown user role:', userData.role);
        setError(ERROR_MESSAGES.UNKNOWN_ROLE);
      }
      console.log('=== CHECKING USER ROLE DEBUG END ===');
    } catch (err) {
      console.error('=== UNEXPECTED ERROR IN checkUserRoleAndRedirect ===');
      console.error('Error type:', typeof err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Full error object:', err);
      console.error('=== UNEXPECTED ERROR DEBUG END ===');
      setError(t('messages.error.general'));
    }
  };

  const validateForm = () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return false;
    }
    if (!name) {
      setError('Please enter your name');
      return false;
    }
    if (!mobile) {
      setError('Please enter your mobile number');
      return false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    setError('');
    return true;
  };

  const validateSignInForm = () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    setError('');
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (signUpError) throw signUpError;

      const { error: userError } = await supabase
        .from(TABLES.USERS)
        .insert([
          {
            id: data.user.id,
            email: email,
            full_name: name,
            post_code: postCode,
            birthday: birthday || null,
            gender: gender || null,
            phone_number: mobile || null,
            role: USER_ROLES.CUSTOMER,
            email_verified: false, // Set to false initially
          },
        ]);

      if (userError) throw userError;
      
      // Set confirmation message and redirect to sign-in form
      setConfirmationMessage('Please check your email for the confirmation link.');
      setIsSignUp(false); // This redirects to sign-in form
      
      // Clear the form fields
      setEmail('');
      setPassword('');
      setName('');
      setPostCode('');
      setBirthday('');
      setGender('');
      setMobile('');
      
      // Show success toast
      toast.success('Registration successful!');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateSignInForm()) return;

    console.log('=== SIGN IN PROCESS DEBUG START ===');
    console.log('Attempting sign in for email:', email);
    
    setIsLoading(true);
    try {
      console.log('Calling supabase.auth.signInWithPassword...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in response:', { data: data?.user ? 'User object received' : 'No user', error: signInError });
      
      if (signInError) {
        console.error('Sign in error:', signInError);
        throw signInError;
      }

      // Check if user is confirmed
      console.log('Checking if user is confirmed:', data.user.confirmed_at);
      if (!data.user.confirmed_at) {
        console.warn('User email not confirmed');
        setError('Please check your email to validate your account before signing in.');
        return;
      }

      // Try to update last_sign_in but don't fail if it doesn't work
      console.log('Updating last_sign_in timestamp...');
      const updateData = {
        last_sign_in: new Date().toISOString()
      };
      
      console.log('Update data being sent:', updateData);
      console.log('Updating user with ID:', data.user.id);
      
      const { data: updatedData, error: updateError } = await supabase
        .from(TABLES.USERS)
        .update(updateData)
        .eq('id', data.user.id)
        .select('id, last_sign_in, created_at'); // Select to verify what was updated

      if (updateError) {
        console.warn('Could not update last_sign_in:', updateError.message);
        // Don't throw the error - just log it
      } else {
        console.log('Successfully updated last_sign_in');
        console.log('Updated user data returned from database:', updatedData);
        
        // Verify that created_at was not modified
        if (updatedData && updatedData[0]) {
          console.log('Verification - created_at after update:', updatedData[0].created_at);
          console.log('Verification - last_sign_in after update:', updatedData[0].last_sign_in);
        }
      }

      // Check role and redirect
      console.log('Proceeding to check user role and redirect...');
      await checkUserRoleAndRedirect(data.user);
      console.log('=== SIGN IN PROCESS DEBUG END ===');
    } catch (err) {
      console.error('=== SIGN IN ERROR ===');
      console.error('Error during sign in:', err);
      console.error('Error message:', err.message);
      console.error('=== SIGN IN ERROR END ===');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (resetError) throw resetError;

      setResetPasswordSent(true);
      setError('Password reset email sent! Please check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSignUp = async () => {
    if (!isMobileAuthEnabled) {
      setError('Mobile sign up is currently disabled.');
      return;
    }
    console.log('=== PHONE SIGN UP DEBUG START ===');
    console.log('Mobile number entered:', mobile);
    console.log('Name entered:', name);
    console.log('Post code:', postCode);
    console.log('Birthday:', birthday);
    console.log('Gender:', gender);
    
    if (!mobile) {
      console.log('ERROR: No mobile number provided');
      setError('Please enter your phone number');
      return;
    }
    if (!name) {
      console.log('ERROR: No name provided');
      setError('Please enter your name');
      return;
    }
  
    // Validate phone number format
    console.log('Phone number format check:', mobile);
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(mobile)) {
      console.log('WARNING: Phone number may not be in international format (+country_code)');
      console.log('Expected format: +1234567890 (with country code)');
    }
  
    setIsLoading(true);
    try {
      console.log('Attempting Supabase phone sign up...');
      console.log('Request payload:', {
        phone: mobile,
        password: 'temp-password',
        options: {
          data: {
            full_name: name,
            post_code: postCode,
            birthday: birthday || null,
            gender: gender || null,
          }
        }
      });
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        phone: mobile,
        password: 'temp-password',
        options: {
          data: {
            full_name: name,
            post_code: postCode,
            birthday: birthday || null,
            gender: gender || null,
          }
        }
      });
  
      // Add more detailed error logging
      if (signUpError) {
        console.log('DETAILED ERROR ANALYSIS:');
        console.log('Error message:', signUpError.message);
        console.log('Error status:', signUpError.status);
        console.log('Error details:', JSON.stringify(signUpError, null, 2));
        
        // Check for specific SMS provider errors
        if (signUpError.message.includes('sms Provider') || 
            signUpError.message.includes('SMS') ||
            signUpError.message.includes('Twilio')) {
          console.log('SMS PROVIDER ERROR DETECTED - Check Supabase SMS configuration');
        }
        
        throw signUpError;
      }
  
      console.log('Sign up successful, setting OTP sent state');
      setOtpSent(true);
      setResendTimer(120); // 2 minutes
      setCanResend(false);
      setError('OTP sent to your phone. Please enter the verification code.');
      console.log('=== PHONE SIGN UP DEBUG END ===');
    } catch (err) {
      console.log('=== PHONE SIGN UP ERROR ===');
      console.log('Caught error:', err);
      console.log('Error message:', err.message);
      console.log('Error stack:', err.stack);
      console.log('=== PHONE SIGN UP ERROR END ===');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    if (!isMobileAuthEnabled) {
      setError('Mobile sign in is currently disabled.');
      return;
    }
    console.log('=== PHONE SIGN IN DEBUG START ===');
    console.log('Mobile number entered:', mobile);
    
    if (!mobile) {
      console.log('ERROR: No mobile number provided');
      setError('Please enter your phone number');
      return;
    }
  
    // Validate phone number format
    console.log('Phone number format check:', mobile);
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(mobile)) {
      console.log('WARNING: Phone number may not be in international format (+country_code)');
      console.log('Expected format: +1234567890 (with country code)');
    }
  
    setIsLoading(true);
    try {
      console.log('Attempting Supabase phone sign in with OTP...');
      console.log('Request payload:', { phone: mobile });
      
      const { data, error: signInError } = await supabase.auth.signInWithOtp({
        phone: mobile,
      });
  
      console.log('Supabase OTP response data:', data);
      console.log('Supabase OTP response error:', signInError);
  
      if (signInError) {
        console.log('SIGN IN ERROR DETAILS:');
        console.log('Error message:', signInError.message);
        console.log('Error code:', signInError.status);
        console.log('Full error object:', signInError);
        throw signInError;
      }
  
      console.log('OTP request successful, setting OTP sent state');
      setOtpSent(true);
      setResendTimer(120); // 2 minutes
      setCanResend(false);
      setError('OTP sent to your phone. Please enter the verification code.');
      console.log('=== PHONE SIGN IN DEBUG END ===');
    } catch (err) {
      console.log('=== PHONE SIGN IN ERROR ===');
      console.log('Caught error:', err);
      console.log('Error message:', err.message);
      console.log('Error stack:', err.stack);
      console.log('=== PHONE SIGN IN ERROR END ===');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add resend OTP function with debug logs
  const handleResendOtp = async () => {
    console.log('=== RESEND OTP DEBUG START ===');
    console.log('Can resend:', canResend);
    console.log('Mobile number:', mobile);
    console.log('Is sign up:', isSignUp);
  
    if (!canResend || !mobile) {
      console.log('Cannot resend - canResend:', canResend, 'mobile:', mobile);
      return;
    }
  
    setIsLoading(true);
    try {
      if (isSignUp) {
        console.log('Resending OTP for sign up...');
        const { error: signUpError } = await supabase.auth.signUp({
          phone: mobile,
          password: 'temp-password',
          options: {
            data: {
              full_name: name,
              post_code: postCode,
              birthday: birthday || null,
              gender: gender || null,
            }
          }
        });
        console.log('Resend sign up error:', signUpError);
        if (signUpError) throw signUpError;
      } else {
        console.log('Resending OTP for sign in...');
        const { error: signInError } = await supabase.auth.signInWithOtp({
          phone: mobile,
        });
        console.log('Resend sign in error:', signInError);
        if (signInError) throw signInError;
      }
  
      console.log('Resend successful, resetting timer');
      setResendTimer(120); // Reset timer to 2 minutes
      setCanResend(false);
      setOtp(''); // Clear previous OTP
      setError('New OTP sent to your phone.');
      console.log('=== RESEND OTP DEBUG END ===');
    } catch (err) {
      console.log('=== RESEND OTP ERROR ===');
      console.log('Resend error:', err);
      console.log('Error message:', err.message);
      console.log('=== RESEND OTP ERROR END ===');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async () => {
    console.log('=== OTP VERIFICATION DEBUG START ===');
    console.log('OTP entered:', otp);
    console.log('Mobile number:', mobile);
    console.log('Is sign up:', isSignUp);
    
    if (!otp) {
      console.log('ERROR: No OTP provided');
      setError('Please enter the OTP code');
      return;
    }
  
    if (otp.length !== 6) {
      console.log('WARNING: OTP length is not 6 digits, length:', otp.length);
    }

    setIsLoading(true);
    try {
      console.log('Attempting OTP verification...');
      console.log('Verification payload:', {
        phone: mobile,
        token: otp,
        type: 'sms'
      });
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: mobile,
        token: otp,
        type: 'sms'
      });

      console.log('OTP verification response data:', data);
      console.log('OTP verification error:', verifyError);

      if (verifyError) {
        console.log('OTP VERIFICATION ERROR DETAILS:');
        console.log('Error message:', verifyError.message);
        console.log('Error code:', verifyError.status);
        console.log('Full error object:', verifyError);
        throw verifyError;
      }

      console.log('OTP verification successful');
      
      // For sign-up, create user record in users table
      if (isSignUp) {
        console.log('Creating user record for sign up...');
        const userInsertData = {
          id: data.user.id,
          phone_number: mobile,
          full_name: name,
          post_code: postCode,
          birthday: birthday || null,
          gender: gender || null,
          role: USER_ROLES.CUSTOMER,
        };
        console.log('User insert data:', userInsertData);
        
        const { error: userError } = await supabase
          .from(TABLES.USERS)
          .insert([userInsertData]);

        console.log('User insert error:', userError);
        if (userError) throw userError;
        console.log('User record created successfully');
      }

      console.log('Checking user role and redirecting...');
      // Check role and redirect
      await checkUserRoleAndRedirect(data.user);
      console.log('=== OTP VERIFICATION DEBUG END ===');
    } catch (err) {
      console.log('=== OTP VERIFICATION ERROR ===');
      console.log('Verification error:', err);
      console.log('Error message:', err.message);
      console.log('Error stack:', err.stack);
      console.log('=== OTP VERIFICATION ERROR END ===');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add these timeout handler functions
  const handleTimeoutRefresh = () => {
    setShowTimeoutPrompt(false);
    setIsLoading(true);
    
    // Clear URL hash and redirect to sign-in
    window.location.hash = '';
    
    // Show message and redirect to sign-in
    setTimeout(() => {
      setIsLoading(false);
      setIsSignUp(false); // Ensure we're on sign-in form
      toast.info('Please sign in with your verified account.');
    }, 1000);
  };
  
  const handleTimeoutCancel = () => {
    setShowTimeoutPrompt(false);
    // Clear URL hash and stay on current page
    window.location.hash = '';
  };

  // Show timeout prompt
  if (showTimeoutPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Verification Timeout
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              The email verification process is taking longer than expected (30 seconds). 
              This might be due to network issues or the verification link may have expired.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleTimeoutRefresh}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go to Sign In
              </button>
              <button
                onClick={handleTimeoutCancel}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading spinner during verification or normal loading
  if (isLoading) {
    const loadingText = isVerifying 
      ? 'Verifying your email... This may take up to 30 seconds.' 
      : t('common.loading');
    return <LoadingSpinner fullScreen={true} text={loadingText} />;
  }

  // Show expired email link error page
  if (showExpiredLinkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('auth.expiredLink.title') || 'Email Link Expired'}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('auth.expiredLink.message') || 'This email verification link has expired or is invalid. Please sign in with your account to continue.'}
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => {
                setShowExpiredLinkError(false);
                setIsSignUp(false);
                setError('');
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              {t('auth.expiredLink.goToLogin') || 'Go to Sign In'}
            </button>

            <button
              onClick={() => {
                setShowExpiredLinkError(false);
                setIsSignUp(true);
                setError('');
              }}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
            >
              {t('auth.expiredLink.createAccount') || 'Create New Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {!isLoading && error && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded ${
          resetPasswordSent || otpSent
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {error}
        </div>
      )}
      <AuthForm
        isSignUp={isSignUp}
        setIsSignUp={setIsSignUp}
        email={email}
        setEmail={setEmail}
        name={name}
        setName={setName}
        password={password}
        setPassword={setPassword}
        postCode={postCode}
        setPostCode={setPostCode}
        birthday={birthday}
        setBirthday={setBirthday}
        gender={gender}
        setGender={setGender}
        mobile={mobile}
        setMobile={setMobile}
        authMethod={authMethod}
        setAuthMethod={setAuthMethod}
        otpSent={otpSent}
        otp={otp}
        setOtp={setOtp}
        resendTimer={resendTimer}
        canResend={canResend}
        onSignIn={authMethod === 'email' ? handleSignIn : handlePhoneSignIn}
        onSignUp={authMethod === 'email' ? handleSignUp : handlePhoneSignUp}
        onOtpVerification={handleOtpVerification}
        onResendOtp={handleResendOtp}
        onResetPassword={handleResetPassword}
        isLoading={isLoading}
        isMobileAuthEnabled={isMobileAuthEnabled} // Pass state to AuthForm
        // setIsMobileAuthEnabled={setIsMobileAuthEnabled} // REMOVE setter, controlled by settings tab
        confirmationMessage={confirmationMessage}
        setConfirmationMessage={setConfirmationMessage}
      />
    </div>
  );
}

