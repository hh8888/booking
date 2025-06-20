import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import AuthForm from './components/auth/AuthForm';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard'; // Add this import
import DatabaseService from './services/DatabaseService';
import LoadingSpinner from './components/common/LoadingSpinner';

export default function Auth() {
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
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  // Add resend timer state
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [isMobileAuthEnabled, setIsMobileAuthEnabled] = useState(false); // Default to false, will be updated from DB
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
      // Fetch mobile auth setting
      try {
        const dbService = DatabaseService.getInstance();
        const mobileAuthSetting = await dbService.getSettingsByKey('system', 'enableMobileAuth');
        if (mobileAuthSetting !== null && mobileAuthSetting !== undefined) {
          setIsMobileAuthEnabled(mobileAuthSetting === 'true' || mobileAuthSetting === true);
        } else {
          // Default to false if setting not found, and create it
          setIsMobileAuthEnabled(false);
          await dbService.createItem('settings', {
            category: 'system',
            key: 'enableMobileAuth',
            value: 'false'
          }, 'Setting');
        }
      } catch (err) {
        console.error('Error fetching mobile auth setting:', err);
        setIsMobileAuthEnabled(false); // Default to false on error
      }

      // Log current path and hash for debugging
      console.log('Auth.js useEffect - Pathname:', window.location.pathname);
      console.log('Auth.js useEffect - Hash:', window.location.hash);

      // UPDATED CHECK for reset password flow (success or error)
      const isResetPasswordFlow = 
        window.location.hash.startsWith('#/reset-password') || 
        window.location.hash.includes('error_description='); // Supabase often includes this for recovery errors

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
  }, [navigate]); // Add dispatch if used

  const checkUserRoleAndRedirect = async (user) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUserRole(userData.role);
      setIsSignedIn(true);

      // Redirect based on role
      if (userData.role === 'customer') {
        navigate('/booking');
      } else if (userData.role === 'staff') {
        navigate('/staff');
      } else if (userData.role === 'admin') {
        navigate('/admin');
      }
    } catch (err) {
      console.error('Error checking user role:', err);
      setError('Error loading user information');
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
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      
      if (signUpError) throw signUpError;

      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: email,
            full_name: name,
            post_code: postCode,
            birthday: birthday || null,
            gender: gender || null,
            phone_number: mobile || null,
            role: 'customer',
          },
        ]);

      if (userError) throw userError;
      
      setError('Registration successful! Please check your email for the confirmation link.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateSignInForm()) return;

    setIsLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Check if user is confirmed
      if (!data.user.confirmed_at) {
        setError('Please check your email to validate your account before signing in.');
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ last_sign_in: new Date().toISOString() })
        .eq('id', data.user.id);

      if (updateError) throw updateError;

      // Check role and redirect
      await checkUserRoleAndRedirect(data.user);
    } catch (err) {
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
          role: 'customer',
        };
        console.log('User insert data:', userInsertData);
        
        const { error: userError } = await supabase
          .from('users')
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

  // Show appropriate dashboard based on user role
  // Only show dashboards when we're on the root path and user is signed in
  // Other paths should be handled by their respective route components
  if (isSignedIn && window.location.pathname === '/') {
    if (userRole === 'admin') {
      return <AdminDashboard />;
    }
    if (userRole === 'staff') {
      return <StaffDashboard />;
    }
  }

  // For customers, they will be redirected to /booking
  // This component will only show the auth form for non-authenticated users
  if (isLoading) {
    return <LoadingSpinner fullScreen={true} text="Loading..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {error && (
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
      />
    </div>
  );
}

