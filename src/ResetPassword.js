import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  console.log('ResetPassword component mounted');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [isRecoveryReady, setIsRecoveryReady] = useState(false); // New state
  const [recoveryLinkProcessed, setRecoveryLinkProcessed] = useState(false); // New state to avoid multiple processing

  useEffect(() => {
    console.log('ResetPassword useEffect triggered. Current hash:', window.location.hash);

    if (window.location.hash.includes('access_token=')) {
      console.log('Access token found in URL hash.');
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange event:', event, 'session:', session);
      if (event === 'PASSWORD_RECOVERY' && session && !recoveryLinkProcessed) {
        console.log('PASSWORD_RECOVERY event received. Session available. Ready to reset.');
        setIsRecoveryReady(true);
        setRecoveryLinkProcessed(true); // Mark as processed
        setError(''); // Clear any previous errors like 'Verifying link...'
      } else if (event === 'INITIAL_SESSION' && !session && window.location.hash.includes('access_token=')) {
        // If initial session is null but we have a token, it might still be processing
        // or PASSWORD_RECOVERY will fire soon.
        // You could set a message here like "Verifying recovery link..."
        if (!isRecoveryReady) {
            setError('Verifying recovery link, please wait...');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('SIGNED_OUT event received.');
        if (!window.location.hash.includes('access_token=')) {
          console.log('No access_token in hash, navigating to / on SIGNED_OUT');
          navigate('/');
        }
      }
    });

    if (window.location.hash.includes('error_description')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = params.get('error_description').replace(/\+/g, ' ');
      console.error('Error from URL hash:', errorDesc);
      setError(errorDesc);
      setIsRecoveryReady(false); // Not ready if there's an error in URL
    }
    
    // Initial check - Supabase client should pick up session from URL if detectSessionInUrl is true
    // The onAuthStateChange listener with PASSWORD_RECOVERY is the more robust way to confirm readiness.

    return () => {
      console.log('ResetPassword useEffect cleanup. Unsubscribing authListener.');
      authListener?.unsubscribe();
    };
  }, [navigate, isRecoveryReady, recoveryLinkProcessed]); // Added dependencies

  const handleResetPassword = async (e) => {
    e.preventDefault();
    console.log('handleResetPassword called');

    if (!isRecoveryReady) {
      setError('Recovery session not ready. Please ensure the link is valid or try again.');
      console.log('Attempted password reset, but recovery session not ready.');
      return;
    }
    
    if (password !== confirmPassword) {
      console.log('Passwords do not match');
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('Password too short');
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    console.log('Attempting to update user password...');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Error updating password:', updateError.message);
        setError(updateError.message);
      } else {
        console.log('Password updated successfully');
        setSuccess(true);
        setTimeout(() => {
          console.log('Navigating to / after successful password reset.');
          navigate('/');
        }, 2000);
      }
    } catch (catchedError) {
      console.error('Catched error during password update:', catchedError);
      setError('An error occurred while resetting password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    console.log('Rendering success message');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Password Reset Successful
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been updated. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering ResetPassword form. Error state:', error, 'Loading state:', loading, 'RecoveryReady:', isRecoveryReady);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
        {/* Optional: Message while waiting for recovery readiness */}
        {!isRecoveryReady && !error && !success && window.location.hash.includes('access_token=') && (
            <p className="text-sm text-gray-600">Verifying link, please wait...</p>
        )}
          <div>
            <button
              type="submit"
              disabled={loading || !isRecoveryReady} // Disable button if not ready
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;