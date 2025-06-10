import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import AuthForm from './components/auth/AuthForm';
import AdminDashboard from './AdminDashboard';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [postCode, setPostCode] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState(''); // Add mobile state
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await checkUserRoleAndRedirect(session.user);
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

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
      } else {
        // Admin or other roles stay on current page (will show AdminDashboard)
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
            mobile: mobile || null, // Add mobile to database insert
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

  // Only show AdminDashboard for admin users
  if (isSignedIn && userRole === 'admin') {
    return <AdminDashboard />;
  }

  // For customers, they will be redirected to /booking
  // This component will only show the auth form for non-authenticated users
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
        mobile={mobile} // Add mobile prop
        setMobile={setMobile} // Add setMobile prop
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        isLoading={isLoading}
      />
    </div>
  );
}