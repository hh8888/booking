import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isRecoveryReady, setIsRecoveryReady] = useState(false);
    const navigate = useNavigate();

    const authListenerRef = useRef(null);
    const recoveryAttemptedRef = useRef(false);
    const verificationTimeoutRef = useRef(null); // Ref to hold the verification timeout

    // This effect handles the auth state listener, which should be set up once.
    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`onAuthStateChange event received: ${event}`, { session });
            if (event === 'PASSWORD_RECOVERY') {
                // If we get the recovery event, the link is valid. Clear any timeout.
                if (verificationTimeoutRef.current) {
                    clearTimeout(verificationTimeoutRef.current);
                }
                recoveryAttemptedRef.current = true;
                if (session) {
                    console.log('PASSWORD_RECOVERY: Session available. Ready for password update.');
                    setIsRecoveryReady(true);
                    setError('');
                    setMessage('You can now set your new password.');
                } else {
                    console.error('PASSWORD_RECOVERY: Session is null. Cannot proceed.');
                    setError('Failed to verify recovery token: Session is null after PASSWORD_RECOVERY event.');
                    setIsRecoveryReady(false);
                }
            } else if (event === 'SIGNED_IN' && session) {
                console.log('SIGNED_IN event detected.');
                // This condition might be relevant for other auth flows, but for password reset,
                // the USER_UPDATED event is the one we listen for after a successful update.
            } else if (event === 'USER_UPDATED') {
                console.log('USER_UPDATED event detected. Password update successful.');
                setLoading(false);
                setMessage('Password updated successfully! Redirecting to login...');
                setTimeout(() => navigate('/auth'), 3000);
            }
        });

        authListenerRef.current = listener;

        return () => {
            if (authListenerRef.current && typeof authListenerRef.current.unsubscribe === 'function') {
                console.log('Unsubscribing from auth state changes.');
                authListenerRef.current.unsubscribe();
            }
        };
    }, [navigate]);

    // This effect handles the one-time logic of processing the recovery URL on component mount.
    useEffect(() => {
        const hash = window.location.hash;
        const queryString = hash.includes('?') ? hash.substring(hash.indexOf('?')) : '';
        const params = new URLSearchParams(queryString);

        console.log(`ResetPassword URL Processing. Hash: ${hash}, Debug Param: ${params.get('debug_reset')}`);

        // 1. Check for debug mode
        if (params.get('debug_reset') === 'true') {
            console.log('Password reset debug mode enabled.');
            setIsRecoveryReady(true);
            setMessage('Debug Mode: You can now set your new password.');
            return;
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const errorDescription = params.get('error_description');
        const urlError = params.get('error');

        // 2. Check for errors in the URL
        if (urlError || errorDescription) {
            let errorMessage = `Error: ${errorDescription || 'Invalid or expired recovery link.'}`;
            if (params.get('error_code') === 'otp_expired') {
                errorMessage = 'The password reset link has expired or is invalid. Please request a new one.';
            }
            setError(errorMessage);
            setIsRecoveryReady(false);
            return;
        }

        // 3. Check for a valid recovery token
        if (type === 'recovery' && accessToken) {
            if (recoveryAttemptedRef.current) {
                console.log('Recovery already attempted, skipping.');
                return;
            }
            
            setError('Verifying recovery link, please wait...');
            recoveryAttemptedRef.current = true;

            const processRecovery = async () => {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (sessionError) {
                    // If setSession fails, clear the timeout and show an error.
                    if (verificationTimeoutRef.current) {
                        clearTimeout(verificationTimeoutRef.current);
                    }
                    setError(`Failed to process recovery link: ${sessionError.message}. Please try again.`);
                    setIsRecoveryReady(false);
                }
                // If successful, the 'PASSWORD_RECOVERY' event will set the ready state.
            };

            processRecovery();

            // Set a timeout to handle cases where the recovery event never arrives.
            verificationTimeoutRef.current = setTimeout(() => {
                setError('Verification timed out. Please try the link again or request a new one.');
                setIsRecoveryReady(false);
            }, 7000);

            return () => {
                if (verificationTimeoutRef.current) {
                    clearTimeout(verificationTimeoutRef.current);
                }
            };
        }

        // 4. If none of the above, the link is invalid
        setError('Invalid recovery link. Please request a new password reset link.');
        setIsRecoveryReady(false);

    }, []); // <-- Run only ONCE on component mount

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        // Debug mode simulation
        if (new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?'))).get('debug_reset') === 'true') {
            console.log('Simulating password update in debug mode.');
            setTimeout(() => {
                setLoading(false);
                setMessage('Debug: Password would have been updated successfully!');
                console.log('Redirecting to /auth');
                navigate('/auth');
            }, 1000);
            return;
        }

        // Real password update
        const { error: updateError } = await supabase.auth.updateUser({ password });

        setLoading(false);

        if (updateError) {
            console.error('Error updating password:', updateError);
            setError(`Failed to update password: ${updateError.message}`);
        }
        // Success is handled by the 'USER_UPDATED' event in the auth state listener.
    };

    return (
        <div className="container mx-auto max-w-xs">
            <div className="mt-8 flex flex-col items-center">
                <h1 className="text-2xl font-bold">
                    Reset Password
                </h1>
                {error && <div className="mt-2 w-full rounded-md bg-red-100 p-4 text-red-700">{error}</div>}
                {message && <div className="mt-2 w-full rounded-md bg-green-100 p-4 text-green-700">{message}</div>}

                {isRecoveryReady ? (
                    <form onSubmit={handlePasswordReset} noValidate className="mt-1 w-full">
                        <input
                            required
                            name="password"
                            placeholder="New Password"
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="mt-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="mt-3 mb-2 w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Set New Password'}
                        </button>
                    </form>
                ) : (
                    !error && <p className="mt-2">Verifying link...</p>
                )}

                {!isRecoveryReady && (
                     <div className="mt-2 flex w-full justify-around">
                        <button onClick={() => navigate('/auth')} className="text-indigo-600 hover:text-indigo-500">Go to Login</button>
                        <button onClick={() => navigate('/forgot-password')} className="text-indigo-600 hover:text-indigo-500">Request New Reset Link</button>
                        <button onClick={() => navigate('/')} className="text-indigo-600 hover:text-indigo-500">Go to Home</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;