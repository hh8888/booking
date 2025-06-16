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
    const authListenerRef = useRef(null);
    const recoveryAttemptedRef = useRef(false); // To prevent multiple setSession attempts

    useEffect(() => {
        console.log('ResetPassword useEffect triggered. Current hash:', window.location.hash);
        const hash = window.location.hash;
        const paramsStr = hash.includes('#', 1) ? hash.substring(hash.indexOf('#', 1) + 1) : hash.substring(1);
        const params = new URLSearchParams(paramsStr);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const errorDescription = params.get('error_description');
        const urlError = params.get('error'); // Renamed to avoid conflict with state variable

        console.log('Parsed from URL -> AccessToken:', !!accessToken, 'RefreshToken:', !!refreshToken, 'Type:', type, 'ErrorDescription:', errorDescription, 'URLError:', urlError);

        if (urlError === 'access_denied' || errorDescription) {
            console.error('Error from URL:', errorDescription || urlError);
            setError(`Error: ${errorDescription || 'Invalid or expired recovery link.'}`);
            setIsRecoveryReady(false);
            // No automatic redirect here, let user see the error and use links
            return;
        }

        if (!accessToken || type !== 'recovery') {
            console.error('Missing access token or type is not recovery.');
            setError('Invalid recovery link. Please request a new password reset link.');
            setIsRecoveryReady(false);
            return;
        }

        if (!recoveryAttemptedRef.current) {
            setError('Verifying recovery link, please wait...');
        }

        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('onAuthStateChange event:', event, 'session:', session);

            if (event === 'PASSWORD_RECOVERY') {
                console.log('PASSWORD_RECOVERY event received, session:', session);
                recoveryAttemptedRef.current = true;
                if (session) {
                    setIsRecoveryReady(true);
                    setError('');
                    setMessage('You can now set your new password.');
                } else {
                    setError('Failed to verify recovery token: Session is null after PASSWORD_RECOVERY event.');
                    setIsRecoveryReady(false);
                }
            } else if (event === 'INITIAL_SESSION' && accessToken && refreshToken && type === 'recovery' && !isRecoveryReady && !recoveryAttemptedRef.current) {
                console.log('INITIAL_SESSION event. Recovery tokens present. PASSWORD_RECOVERY not yet fired.');
                recoveryAttemptedRef.current = true; // Mark that we are attempting manual recovery
                console.log('Attempting manual setSession with access_token and refresh_token...');
                try {
                    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        console.error('Error during manual setSession:', sessionError);
                        setError(`Failed to process recovery link: ${sessionError.message}. Please try again.`);
                        setIsRecoveryReady(false);
                    } else if (sessionData && sessionData.session) {
                        console.log('Manual setSession successful, session:', sessionData.session);
                        // Check if this user matches the one in the token if possible, or just proceed
                        // Supabase should now emit USER_AUTHENTICATED or similar, or we might need to check user state
                        setIsRecoveryReady(true);
                        setError('');
                        setMessage('Recovery link verified. You can now set your new password.');
                    } else {
                        console.warn('Manual setSession did not return a session or error.');
                        setError('Failed to process recovery link. Please try again.');
                        setIsRecoveryReady(false);
                    }
                } catch (e) {
                    console.error('Exception during manual setSession attempt:', e);
                    setError('Failed to process recovery link. Please try again.');
                    setIsRecoveryReady(false);
                }
            } else if (event === 'USER_UPDATED') {
                console.log('USER_UPDATED event received, session:', session);
                setLoading(false);
                setMessage('Password updated successfully! Redirecting to login...');
                setTimeout(() => navigate('/auth'), 3000);
            }
        });

        authListenerRef.current = listener;

        const timer = setTimeout(() => {
            if (!isRecoveryReady && !recoveryAttemptedRef.current && accessToken && type === 'recovery') {
                console.warn('Timeout: PASSWORD_RECOVERY event not received and manual setSession not initiated or failed.');
                if (!isRecoveryReady) {
                    setError('Verification timed out. Please try the link again or request a new one.');
                    setIsRecoveryReady(false);
                    recoveryAttemptedRef.current = true; 
                }
            }
        }, 7000); // Increased timeout slightly to allow for setSession attempt

        return () => {
            clearTimeout(timer);
            if (authListenerRef.current && typeof authListenerRef.current.unsubscribe === 'function') {
                console.log('Unsubscribing from auth state changes.');
                authListenerRef.current.unsubscribe();
            }
        };
    }, [navigate]); // Removed isRecoveryReady from dependencies to avoid re-triggering on its change

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
        }
    };

    console.log('Rendering ResetPassword. Error:', error, 'Loading:', loading, 'RecoveryReady:', isRecoveryReady, 'Message:', message);

    if (message) { 
        return (
            <div className="container">
                <h2>Reset Password</h2>
                <p className="message">{message}</p>
                <p><a href="/">Go to Home</a></p>
            </div>
        );
    }

    // Display specific error messages first
    if (error && error !== 'Verifying recovery link, please wait...') {
        return (
            <div className="container">
                <h2>Reset Password</h2>
                <p className="error">{error}</p>
                <p>
                    <a href="/auth">Go to Login</a> | <a href="/">Go to Home</a>
                </p>
            </div>
        );
    }

    // If still verifying or recovery not ready (and no other specific error shown above)
    if (!isRecoveryReady) {
        return (
            <div className="container">
                <h2>Reset Password</h2>
                {/* Show the current error/status message. If error is empty, it shows the default verifying message */}
                <p>{error || 'Verifying recovery link, please wait...'}</p> 
                <p><a href="/">Go to Home</a></p>
            </div>
        );
    }

    // If recovery is ready, show the form
    return (
        <div className="container">
            <h2>Reset Password</h2>
            {/* This error display might be redundant if handled by the block above, but kept for safety */}
            {/* {error && error !== 'Verifying recovery link, please wait...' && <p className="error">{error}</p>}  */}
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
            <p><a href="/">Go to Home</a></p>
        </div>
    );
}

export default ResetPassword;