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
  const [isSignUp, setIsSignUp] = useState(false); // Default to "Sign In"
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [isSignedIn, setIsSignedIn] = useState(false); // Track sign-in state

  // Simulate initial loading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2-second loading delay
    return () => clearTimeout(timer);
  }, []);

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
    } else {
      // Create a user record in the public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: email,
            post_code: postCode,
            birthday: birthday || null,
            gender: gender || null,
            role: 'customer', // Default role
          },
        ]);

      if (userError) {
        alert(userError.message);
      } else {
        alert('Check your email for the confirmation link!');
      }
    }
  };

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      // Update last_sign_in in public.users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_sign_in: new Date().toISOString() })
        .eq('id', data.user.id);

      if (updateError) {
        console.error('Error updating last_sign_in:', updateError);
      } else {
        setIsSignedIn(true); // Redirect to admin dashboard
      }
    }
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // If signed in, show the AdminDashboard
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
        onSignIn={handleSignIn} // Pass handleSignIn as a prop
        onSignUp={handleSignUp} // Pass handleSignUp as a prop
      />
    </div>
  );
}