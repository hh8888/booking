import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignUp({ setUser, setRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    // Sign up the user
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
        console.error('Sign-up error:', signUpError);
        setError(signUpError.message);
        return;
      }

    if (user) {
      // Fetch the user's role after sign-up
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Failed to fetch user role.');
        return;
      }

      setUser(user);
      setRole(profile?.role || 'public');
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSignUp}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}

export default SignUp;