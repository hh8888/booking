import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './components/common/LoadingSpinner';

// A simple SVG spinner component
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

function ResetPassword() {
    
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isRecoveryReady, setIsRecoveryReady] = useState(false);
    const navigate = useNavigate();
    const authListenerRef = useRef(null);
    const recoveryAttemptedRef = useRef(false);

    // This effect handles the auth state listener, which should be set up once.
    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`onAuthStateChange event received: ${event}`, { session });
            if (event === 'PASSWORD_RECOVERY') {
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
                    setError(`Failed to process recovery link: ${sessionError.message}. Please try again.`);
                    setIsRecoveryReady(false);
                }
                // If successful, the 'PASSWORD_RECOVERY' event will set the ready state.
            };

            processRecovery();

            const timer = setTimeout(() => {
                if (!isRecoveryReady) {
                    setError('Verification timed out. Please try the link again or request a new one.');
                    setIsRecoveryReady(false);
                }
            }, 7000);

            return () => clearTimeout(timer);
        }

        // 4. If none of the above, the link is invalid
        setError('Invalid recovery link. Please request a new password reset link.');
        setIsRecoveryReady(false);

    }, []); // <-- Run only ONCE on component mount

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!password) {
            setError('Please enter a new password.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');

        // In debug mode, we just simulate the success message without calling Supabase
        if (new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?'))).get('debug_reset') === 'true') {
            console.log('Debug mode: Simulating password update.');
            setTimeout(() => {
                setLoading(false);
                setMessage('Debug: Password would have been updated successfully! Redirecting...');
                setTimeout(() => {
                    // In a real scenario, you might want to navigate to a mock login page
                    // or just clear the state. For now, we'll just show the message.
                    navigate('/auth'); 
                }, 3000);
            }, 1500);
            return;
        }

        // This part runs only if not in debug mode
        const { error: updateError } = await supabase.auth.updateUser({ password: password });

        if (updateError) {
            setLoading(false);
            setError(`Error updating password: ${updateError.message}`);
        }
        // If successful, the 'USER_UPDATED' event in the listener will handle the success message and redirection.
    };

    const renderContent = () => {
        console.log(`Rendering ResetPassword. Error: ${error} Loading: ${loading} RecoveryReady: ${isRecoveryReady} Message: ${message}`);
        if (!isRecoveryReady && !error) {
            return <LoadingSpinner message="Verifying link..." />;
        }

        if (error) {
            return (
                <div className="text-center text-red-500">
                    <p>{error}</p>
                    <div className="mt-4 flex justify-center space-x-4">
                        <button onClick={() => navigate('/auth')} className="text-blue-600 hover:underline">Go to Login</button>
                        <span className="text-gray-400">|</span>
                        <button onClick={() => navigate('/request-reset')} className="text-blue-600 hover:underline">Request New Reset Link</button>
                        <span className="text-gray-400">|</span>
                        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">Go to Home</button>
                    </div>
                </div>
            );
        }

        if (message && !isRecoveryReady) {
            return <p className="text-center text-green-500">{message}</p>;
        }

        return (
            <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                    <label htmlFor="password-input" className="block text-sm font-medium text-gray-700">
                        New Password
                    </label>
                    <div className="mt-1">
                        <input
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter your new password"
                            required
                        />
                    </div>
                </div>
                {message && <p className="text-sm text-green-600">{message}</p>}
                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading && <Spinner />}
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </form>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Reset Password
                </h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;