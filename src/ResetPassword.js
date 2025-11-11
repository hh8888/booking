import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
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
    const location = useLocation(); // Import useLocation hook

    // This effect handles the auth state listener, which should be set up once.
    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                recoveryAttemptedRef.current = true;
                if (session) {
                    setIsRecoveryReady(true);
                    setError('');
                    setMessage('You can now set your new password.');
                } else {
                    setError('Failed to verify recovery token: Session is null after PASSWORD_RECOVERY event.');
                    setIsRecoveryReady(false);
                }
            } else if (event === 'SIGNED_IN' && session) {
                // This condition might be relevant for other auth flows, but for password reset,
                // the USER_UPDATED event is the one we listen for after a successful update.
            } else if (event === 'USER_UPDATED') {
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

    // This effect handles the one-time logic of processing the recovery URL.
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const errorDescription = params.get('error_description');
        const urlError = params.get('error');

        if (urlError === 'access_denied' || errorDescription) {
            let errorMessage = `Error: ${errorDescription || 'Invalid or expired recovery link.'}`;
            if (params.get('error_code') === 'otp_expired') {
                errorMessage = 'The password reset link has expired or is invalid. Please request a new one.';
            }
            setError(errorMessage);
            setIsRecoveryReady(false);
            return;
        }

        // Only proceed if we have a recovery token and haven't tried yet.
        if (type === 'recovery' && accessToken && !recoveryAttemptedRef.current) {
            setError('Verifying recovery link, please wait...');
            recoveryAttemptedRef.current = true;

            const processRecovery = async () => {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                // If setSession fails, the auth listener won't fire. We must handle the error here.
                if (sessionError) {
                    setError(`Failed to process recovery link: ${sessionError.message}. Please try again.`);
                    setIsRecoveryReady(false);
                }
                // If successful, the 'PASSWORD_RECOVERY' event in the other listener will take over.
            };

            processRecovery();

            const timer = setTimeout(() => {
                // If after 7s, we still haven't succeeded, show a timeout error.
                if (!isRecoveryReady) {
                    setError('Verification timed out. Please try the link again or request a new one.');
                    setIsRecoveryReady(false);
                }
            }, 7000);

            return () => clearTimeout(timer);
        } else if (!accessToken || type !== 'recovery') {
            // Show an error for invalid links, but only if we're not already in a success/error state.
            if (!isRecoveryReady && !message && !error) {
                setError('Invalid recovery link. Please request a new password reset link.');
                setIsRecoveryReady(false);
            }
        }
    }, [location.search, isRecoveryReady, message, error]);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        // Keep the success message from verification if it's there
        // setMessage(''); 

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
            // Message will be set by USER_UPDATED event handler
        }
    };

    console.log('Rendering ResetPassword. Error:', error, 'Loading:', loading, 'RecoveryReady:', isRecoveryReady, 'Message:', message);

    const commonLinkClasses = "text-indigo-600 hover:text-indigo-500";

    // Base container for all states
    const PageContainer = ({ children }) => (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Reset Password
                </h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {children}
                </div>
            </div>
        </div>
    );

    if (message && (message.includes('Password updated successfully!') || message.includes('Redirecting'))) {
        return (
            <PageContainer>
                <p className="text-center text-green-600 text-sm">{message}</p>
                <p className="mt-2 text-center text-sm text-gray-600">
                    <a href="/" className={commonLinkClasses}>Go to Home</a>
                </p>
            </PageContainer>
        );
    }

    if (error && error !== 'Verifying recovery link, please wait...') {
        return (
            <PageContainer>
                <p className="text-center text-red-600 text-sm">{error}</p>
                <div className="mt-6 flex justify-center space-x-4">
                    <a href="/auth" className={commonLinkClasses}>Go to Login</a>
                    <span className="text-gray-400">|</span>
                    <a href="/auth?forgotPassword=true" className={commonLinkClasses}>Request New Reset Link</a>
                    <span className="text-gray-400">|</span>
                    <a href="/" className={commonLinkClasses}>Go to Home</a>
                </div>
            </PageContainer>
        );
    }

    if (isRecoveryReady) {
        return (
            <PageContainer>
                {message && !message.includes('Password updated successfully!') && (
                    <p className="text-center text-green-600 text-sm mb-4">{message}</p>
                )}
                {error && error !== 'Verifying recovery link, please wait...' && (
                    <p className="text-center text-red-600 text-sm mb-4">{error}</p>
                )}
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            New Password
                        </label>
                        <div className="mt-1">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? (
                                <LoadingSpinner size="sm" color="white" text="Updating..." />
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </div>
                </form>
                <p className="mt-6 text-center text-sm text-gray-600">
                    <a href="/" className={commonLinkClasses}>Go to Home</a>
                </p>
            </PageContainer>
        );
    }

    // Default: Verifying link or other non-critical states
    return (
        <PageContainer>
            <p className="text-center text-gray-600 text-sm">
                {error || 'Verifying recovery link, please wait...'}
            </p>
            {loading && (
              <div className="flex justify-center mt-4">
                <LoadingSpinner text="Verifying..." />
              </div>
            )}
            <p className="mt-6 text-center text-sm text-gray-600">
                <a href="/" className={commonLinkClasses}>Go to Home</a>
            </p>
        </PageContainer>
    );
}

export default ResetPassword;