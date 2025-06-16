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
        const refreshToken = params.get('refresh_token'); // Supabase recovery URL includes this
        const type = params.get('type');
        const errorDescription = params.get('error_description');

        console.log('Parsed from URL -> AccessToken:', !!accessToken, 'RefreshToken:', !!refreshToken, 'Type:', type, 'ErrorDescription:', errorDescription);

        if (errorDescription) {
            console.error('Error from URL:', errorDescription);
            setError(`Error: ${errorDescription}`);
            setIsRecoveryReady(false);
            return;
        }

        if (!accessToken || type !== 'recovery') {
            console.error('Missing access token or type is not recovery.');
            setError('Invalid recovery link. Please request a new password reset link.');
            setIsRecoveryReady(false);
            return;
        }
        
        // If we have an access_token and type=recovery, set up the listener
        // but also prepare to manually set session if PASSWORD_RECOVERY event is not caught.
        if (!recoveryAttemptedRef.current) {
            setError('Verifying recovery link, please wait...');
        }

        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('onAuthStateChange event:', event, 'session:', session);

            if (event === 'PASSWORD_RECOVERY') {
                console.log('PASSWORD_RECOVERY event received, session:', session);
                recoveryAttemptedRef.current = true; // Mark that Supabase handled it
                if (session) {
                    setIsRecoveryReady(true);
                    setError('');
                    setMessage('You can now set your new password.');
                } else {
                    setError('Failed to verify recovery token: Session is null after PASSWORD_RECOVERY event.');
                    setIsRecoveryReady(false);
                }
            } else if (event === 'INITIAL_SESSION' && accessToken && type === 'recovery' && !isRecoveryReady && !recoveryAttemptedRef.current) {
                console.log('INITIAL_SESSION event. AccessToken and type=recovery present. PASSWORD_RECOVERY not yet fired.');
                // Attempt to manually set session if PASSWORD_RECOVERY hasn't fired and we haven't tried yet.
                // This is a fallback.
                console.log('Attempting manual setSession as a fallback...');
                recoveryAttemptedRef.current = true; // Mark that we are attempting manual recovery
                try {
                    // For password recovery, Supabase expects the access_token from the URL
                    // to be used to establish a temporary session for password update.
                    // The `setSession` method might not be the direct way to trigger this for `type=recovery`,
                    // as `detectSessionInUrl` should handle it. But if it's failing, this is an experiment.
                    // Supabase internally uses the #access_token for password recovery when `onAuthStateChange` processes it.
                    // A more direct trigger isn't explicitly documented for manual calls outside that event.
                    // However, if `detectSessionInUrl` fails, the client might not have the session.
                    // Let's ensure the client is aware of the token. The `PASSWORD_RECOVERY` event is KEY.
                    
                    // The most reliable way is to ensure onAuthStateChange picks up the PASSWORD_RECOVERY event.
                    // If it doesn't, it points to an issue with Supabase client's URL processing.
                    // For now, we'll rely on onAuthStateChange. If it consistently fails, we might need to explore
                    // if there's a bug with supabase-js or a specific interaction.
                    console.warn('PASSWORD_RECOVERY event not firing as expected. Check Supabase client version and setup.');
                    // We will not call setSession here directly as it might interfere with the natural flow
                    // or have unintended consequences if not used as Supabase expects for type=recovery.
                    // The issue is likely that the event isn't being triggered or caught.
                    setError('Verification timed out or failed. Please try the link again or request a new one.');
                    setIsRecoveryReady(false);

                } catch (e) {
                    console.error('Error during manual setSession attempt:', e);
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

        // Fallback timeout if PASSWORD_RECOVERY event is not received
        const timer = setTimeout(() => {
            if (!isRecoveryReady && !recoveryAttemptedRef.current && accessToken && type === 'recovery') {
                console.warn('Timeout: PASSWORD_RECOVERY event not received. Manually tried or will mark as failed.');
                // This path is taken if onAuthStateChange's INITIAL_SESSION didn't trigger the manual attempt block
                // or if that block itself didn't lead to isRecoveryReady.
                if (!isRecoveryReady) { // Double check if some other async action made it ready
                    setError('Verification timed out. Please try the link again or request a new one.');
                    setIsRecoveryReady(false);
                    recoveryAttemptedRef.current = true; // Mark attempt to prevent loops
                }
            }
        }, 5000); // 5 seconds timeout


        return () => {
            clearTimeout(timer);
            if (authListenerRef.current && typeof authListenerRef.current.unsubscribe === 'function') {
                console.log('Unsubscribing from auth state changes.');
                authListenerRef.current.unsubscribe();
            }
        };
    }, [navigate]);

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

    return (
        <div className="container">
            <h2>Reset Password</h2>
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