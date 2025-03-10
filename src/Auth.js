import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthForm from './components/AuthForm';
import AdminDashboard from './AdminDashboard';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [postCode, setPostCode] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setIsSignedIn(true);
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const validateForm = () => {
    if (!email || !password) {
      setError('Please enter your email and password');
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
    if (isSignUp && !postCode) {
      setError('Please enter your post code');
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
            post_code: postCode,
            birthday: birthday || null,
            gender: gender || null,
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
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const { error: updateError } = await supabase
        .from('users')
        .update({ last_sign_in: new Date().toISOString() })
        .eq('id', data.user.id);

      if (updateError) throw updateError;

      setIsSignedIn(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSignedIn) {
    return <AdminDashboard />;
  }

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
        password={password}
        setPassword={setPassword}
        postCode={postCode}
        setPostCode={setPostCode}
        birthday={birthday}
        setBirthday={setBirthday}
        gender={gender}
        setGender={setGender}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        isLoading={isLoading}
      />
    </div>
  );
}