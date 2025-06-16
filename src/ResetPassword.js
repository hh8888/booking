import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

function ResetPassword() {
    console.log('ResetPassword component mounted');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isRecoveryReady, setIsRecoveryReady] = useState(false);
    const navigate = useNavigate();
    const authListenerRef = useRef(null); // Using useRef to hold the listener subscription

    useEffect(() => {
        console.log('ResetPassword useEffect triggered. Current hash:', window.location.hash);
        const hash = window.location.hash;
        const paramsStr = hash.includes('#', 1) ? hash.substring(hash.indexOf('#', 1) + 1) : hash.substring(1);
        const params = new URLSearchParams(paramsStr);
        const accessToken = params.get('access_token');
        const errorDescription = params.get('error_description');

        console.log('Parsed from URL -> AccessToken:', accessToken, 'ErrorDescription:', errorDescription);

        if (errorDescription) {
            console.error('Error from URL:', errorDescription);
            setError(`Error: ${errorDescription}`);
            setIsRecoveryReady(false);
            return; // Exit early if there's an error in the URL
        }

        if (!accessToken) {
            console.error('No access token found in URL.');
            setError('No recovery token found in URL. Please request a new password reset link.');
            setIsRecoveryReady(false);
            return; // Exit early if no token and no error (should be caught by previous if)
        }

        // If we have an access token and no error description, proceed to set up listener
        console.log('Access token found, setting up onAuthStateChange listener.');
        setError('Verifying recovery link, please wait...'); // Set initial verifying message

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('onAuthStateChange event:', event, 'session:', session);

            if (event === 'PASSWORD_RECOVERY') {
                console.log('PASSWORD_RECOVERY event received, session:', session);
                if (session) {
                    setIsRecoveryReady(true);
                    setError('');
                    setMessage('You can now set your new password.');
                } else {
                    setError('Failed to verify recovery token: Session is null after PASSWORD_RECOVERY event.');
                    setIsRecoveryReady(false);
                }
            } else if (event === 'INITIAL_SESSION') {
                console.log('INITIAL_SESSION event. Current session:', session, 'Access Token from URL was present.');
                // With detectSessionInUrl: true and an access_token in URL,
                // we expect Supabase to process it and trigger PASSWORD_RECOVERY soon after.
                // If INITIAL_SESSION provides a session, it might be from a previous login, not the recovery token.
            } else if (event === 'SIGNED_IN') {
                console.log('SIGNED_IN event, session:', session);
                // This might occur if the recovery process also signs the user in.
                // If isRecoveryReady is not yet true, this might be the event we need.
                if (session && accessToken && !isRecoveryReady) {
                    console.log('SIGNED_IN event with session, considering this as recovery ready.');
                    // setIsRecoveryReady(true); // Potentially set recovery ready here too
                    // setError('');
                    // setMessage('Signed in for password recovery. You can now set your new password.');
                }
            } else if (event === 'USER_UPDATED') {
                console.log('USER_UPDATED event received, session:', session);
                setLoading(false);
                setMessage('Password updated successfully! Redirecting to login...');
                setTimeout(() => navigate('/auth'), 3000);
            }
        });

        authListenerRef.current = listener; // Store the listener subscription

        // Cleanup function
        return () => {
            if (authListenerRef.current && typeof authListenerRef.current.unsubscribe === 'function') {
                console.log('Unsubscribing from auth state changes.');
                authListenerRef.current.unsubscribe();
            }
        };
    }, [navigate]); // navigate is a dependency

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!isRecoveryReady) {
            setError('Recovery session not ready. Please wait or ensure the link is correct.');
            setLoading(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        setLoading(false);
        if (updateError) {
            console.error('Error updating password:', updateError.message);
            setError(`Error updating password: ${updateError.message}`);
        } else {
            console.log('Password update request successful. Waiting for USER_UPDATED event.');
            // Message and redirect are handled by USER_UPDATED event
        }
    };

    console.log('Rendering ResetPassword. Error:', error, 'Loading:', loading, 'RecoveryReady:', isRecoveryReady, 'Message:', message);

    if (message) { // If there's a success message, show it primarily
        return (
            <div className="container">
                <h2>Reset Password</h2>
                <p className="message">{message}</p>
            </div>
        );
    }

    if (error && error !== 'Verifying recovery link, please wait...') {
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
                <h2>Reset Password</h2>
                <p>{error || 'Verifying recovery link, please wait...'}</p>
            </div>
        );
    }

    // Only show form if recovery is ready and no overriding message/error
    return (
        <div className="container">
            <h2>Reset Password</h2>
            {/* Show non-blocking error if it occurs after form is shown */}
            {error && error !== 'Verifying recovery link, please wait...' && <p className="error">{error}</p>} 
            <form onSubmit={handleResetPassword}>
                <div>
                    <label htmlFor="password">New Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
}

export default ResetPassword;