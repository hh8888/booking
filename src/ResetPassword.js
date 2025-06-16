import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Ensure this path is correct
import { useNavigate } from 'react-router-dom';

function ResetPassword() {
    console.log('ResetPassword component mounted');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isRecoveryReady, setIsRecoveryReady] = useState(false);
    const navigate = useNavigate();

    // Move onAuthStateChange listener setup outside useEffect
    // It's important to unsubscribe when the component unmounts.
    // We'll store the subscription to unsubscribe in the cleanup function of useEffect.
    let authListener = null;

    useEffect(() => {
        console.log('ResetPassword useEffect triggered. Current hash:', window.location.hash);
        const hash = window.location.hash;
        const paramsStr = hash.includes('#', 1) ? hash.substring(hash.indexOf('#', 1) + 1) : hash.substring(1);
        const params = new URLSearchParams(paramsStr);
        const accessToken = params.get('access_token');
        const errorDescription = params.get('error_description');

        if (errorDescription) {
            setError(`Error: ${errorDescription}`);
            return;
        }

        if (accessToken) {
            console.log('Access token found in URL hash.');
            // The PASSWORD_RECOVERY event will handle setting the session
            // and isRecoveryReady state.
            // We no longer need to manually call setSession here if onAuthStateChange handles it.
        } else if (!errorDescription) {
            // Only set this error if there's no access token AND no error description from Supabase
            // This avoids overwriting a more specific error from Supabase
            setError('No recovery token found in URL. Please request a new password reset link.');
        }

        // Setup the listener
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('onAuthStateChange event:', event, 'session:', session);
            if (event === 'PASSWORD_RECOVERY') {
                console.log('PASSWORD_RECOVERY event received, session:', session);
                if (session) {
                    // Supabase client has processed the recovery token and established a session.
                    // The user is now effectively logged in for the purpose of updating their password.
                    setIsRecoveryReady(true);
                    setError(''); // Clear any previous errors like "Verifying..."
                    setMessage('You can now set your new password.');
                } else {
                    setError('Failed to verify recovery token. The session is null after PASSWORD_RECOVERY event.');
                    setIsRecoveryReady(false);
                }
            } else if (event === 'INITIAL_SESSION') {
                // This event fires when the listener is first attached.
                // If a session already exists (e.g. user is already logged in), it will be provided here.
                // For password recovery, we expect session to be null initially, then populated by PASSWORD_RECOVERY.
                if (session) {
                    // This case should ideally not happen in a clean password recovery flow
                    // unless the user was already logged in in another tab.
                    console.log('INITIAL_SESSION with an existing session. This might not be the recovery flow.');
                    // Potentially navigate away or show an error if this is unexpected.
                }
            } else if (event === 'SIGNED_IN') {
                // This might happen after updateUser if it also signs the user in.
                // We might not need specific handling here if PASSWORD_RECOVERY is sufficient.
                console.log('SIGNED_IN event received, session:', session);
            } else if (event === 'USER_UPDATED') {
                console.log('USER_UPDATED event received, session:', session);
                // This event fires after a successful password update.
                setLoading(false);
                setMessage('Password updated successfully! Redirecting to login...');
                setTimeout(() => {
                    navigate('/auth'); // Or your login page
                }, 3000);
            }
        });

        authListener = listener; // Store the listener subscription

        // Initial check for error state based on URL hash, before PASSWORD_RECOVERY event
        if (!accessToken && !errorDescription) {
            // Handled above
        } else if (!isRecoveryReady && !errorDescription) {
            // If there's an access token but recovery isn't ready yet, show verifying message.
            // Avoid showing this if there's already an error from Supabase (errorDescription)
            setError('Verifying recovery link, please wait...');
        }


        return () => {
            if (authListener && typeof authListener.unsubscribe === 'function') {
                console.log('Unsubscribing from auth state changes.');
                authListener.unsubscribe();
            }
        };
    }, [navigate]); // Added navigate to dependency array as it's used in useEffect

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!isRecoveryReady) {
            setError('Recovery session not ready. Please wait or try the link again.');
            setLoading(false);
            return;
        }

        // At this point, Supabase client should have the session from the PASSWORD_RECOVERY event.
        const { data, error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        setLoading(false);
        if (updateError) {
            console.error('Error updating password:', updateError.message);
            setError(`Error updating password: ${updateError.message}`);
        } else {
            console.log('Password update successful:', data);
            // The USER_UPDATED event from onAuthStateChange should handle the message and redirect.
            // setMessage('Password updated successfully! You can now log in with your new password.');
            // No need to navigate here if USER_UPDATED handles it.
        }
    };

    // Conditional rendering logic
    console.log('Rendering ResetPassword form. Error state:', error, 'Loading state:', loading, 'RecoveryReady:', isRecoveryReady);
    if (error && !isRecoveryReady && error !== 'Verifying recovery link, please wait...') {
        // If there's a definitive error (not the verifying message) and recovery isn't ready, show only the error.
        return (
          <div className="container">
          <h2>Reset Password</h2>
          <p className="error">{error}</p>
          <p><a href="/auth">Go to Login</a></p> 
      </div>
        );
    }

    if (!isRecoveryReady) {
        return (
            <div className="container">
                <p>{error || 'Verifying recovery link, please wait...'}</p>
            </div>
        );
    }

    // If recovery is ready, show the form
    return (
        <div className="container">
            <h2>Reset Password</h2>
            {message && <p className="message">{message}</p>}
            {error && <p className="error">{error}</p>} {/* Show error here as well, in case it occurs after form is shown */}
            <form onSubmit={handleResetPassword}>
                <div>
                    <label htmlFor="password">New Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading || !isRecoveryReady}
                    />
                </div>
                <button type="submit" disabled={loading || !isRecoveryReady}>
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
}

export default ResetPassword;