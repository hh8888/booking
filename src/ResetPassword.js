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

    const recoveryAttemptedRef = useRef(false);

    // This effect handles the one-time logic of processing the recovery URL on component mount.
    useEffect(() => {
        const hash = window.location.hash;
        const queryString = hash.includes('?') ? hash.substring(hash.indexOf('?')) : '';
        const params = new URLSearchParams(queryString);

        console.log(`ResetPassword URL Processing. Hash: ${hash}`);

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

        const processRecoveryToken = async (token, refresh) => {
            if (recoveryAttemptedRef.current) {
                console.log('Recovery already attempted, skipping.');
                return;
            }
            recoveryAttemptedRef.current = true;
            
            setLoading(true);
            setError('');

            const { data, error: sessionError } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: refresh,
            });

            setLoading(false);

            if (sessionError) {
                setError(`Failed to process recovery link: ${sessionError.message}. Please try again.`);
                setIsRecoveryReady(false);
            } else if (data.session) {
                console.log('setSession successful. Ready for password update.');
                setIsRecoveryReady(true);
                setMessage('You can now set your new password.');
            } else {
                setError('Failed to verify recovery token. The session could not be established.');
                setIsRecoveryReady(false);
            }
        };

        // 3. Check for a valid recovery token
        if (type === 'recovery' && accessToken) {
            processRecoveryToken(accessToken, refreshToken);
        } else {
            // 4. If not a debug link and not a recovery link, it's invalid.
            // We should only show this if there wasn't already a URL error.
            if (!urlError && !errorDescription) {
                setError('Invalid recovery link. Please request a new password reset link.');
                setIsRecoveryReady(false);
            }
        }
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
        } else {
            setMessage('Password updated successfully! Redirecting to login...');
            setTimeout(() => navigate('/auth'), 3000);
        }
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
                    // Show a loading indicator while verifying
                    loading && <p className="mt-2">Verifying link, please wait...</p>
                )}

                {/* Show these options if recovery is not ready and we are not in a loading state */}
                {!isRecoveryReady && !loading && (
                     <div className="mt-2 flex w-full justify-around">
                        <button onClick={() => navigate('/auth')} className="text-indigo-600 hover:text-indigo-500">Go to Login</button>
                        <button onClick={() => navigate('/auth?forgotPassword=true')} className="text-indigo-600 hover:text-indigo-500">Request New Reset Link</button>
                        <button onClick={() => navigate('/')} className="text-indigo-600 hover:text-indigo-500">Go to Home</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;