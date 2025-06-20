import React from 'react';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import { useBusinessInfo } from '../../hooks/useBusinessInfo'; // Add this import
import LoadingSpinner from '../common/LoadingSpinner';

export default function AuthForm({
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  postCode,
  setPostCode,
  birthday,
  setBirthday,
  gender,
  setGender,
  mobile,
  setMobile,
  authMethod,
  setAuthMethod,
  otpSent,
  otp,
  setOtp,
  resendTimer,
  canResend,
  onSignIn,
  onSignUp,
  onOtpVerification,
  onResendOtp,
  onResetPassword,
  isLoading,
  isMobileAuthEnabled, // Keep prop for conditional rendering
  // setIsMobileAuthEnabled // Remove setter prop, toggle is moved
}) {
  // Format timer display
  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  const { businessName, loading: businessLoading } = useBusinessInfo(); // Add this hook
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        {businessLoading ? 'Loading...' : (businessName || 'Service Booking')}
      </h1>

      {/* Mobile Auth Enable/Disable Toggle - REMOVED FROM HERE */}

      {/* Auth Method Toggle */}
      {!otpSent && (
        <div className="flex space-x-2 border border-gray-200 rounded-lg p-1 mb-4">
          <button
            onClick={() => !isLoading && setAuthMethod('email')}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              authMethod === 'email'
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:text-gray-700'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Email
          </button>
          {isMobileAuthEnabled && ( // Conditionally render Phone button
            <button
              onClick={() => !isLoading && setAuthMethod('phone')}
              disabled={isLoading}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMethod === 'phone'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Phone
            </button>
          )}
        </div>
      )}

      {/* Toggle between Sign Up and Sign In */}
      {!otpSent && (
        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => !isLoading && setIsSignUp(false)}
            disabled={isLoading}
            className={`py-2 px-4 ${!isSignUp ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Sign In
          </button>
          <button
            onClick={() => !isLoading && setIsSignUp(true)}
            disabled={isLoading}
            className={`py-2 px-4 ${isSignUp ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* OTP Verification Form */}
      {otpSent ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Enter Verification Code
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center">
            We sent a verification code to {authMethod === 'email' ? email : mobile}
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
            />
          </div>
          
          {/* Verify Button */}
          <button
            onClick={onOtpVerification}
            disabled={isLoading}
            className={`w-full bg-blue-500 text-white py-2 rounded-lg transition duration-200 mb-4 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>

          {/* Resend Code Section */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-600">
                Resend code in {formatTimer(resendTimer)}
              </p>
            ) : (
              <button
                onClick={onResendOtp}
                disabled={!canResend || isLoading}
                className={`text-sm text-blue-500 hover:text-blue-600 transition-colors ${
                  !canResend || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
                }`}
              >
                {isLoading ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Render SignInForm or SignUpForm */}
          {isSignUp ? (
            <SignUpForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              name={name}
              setName={setName}
              postCode={postCode}
              setPostCode={setPostCode}
              birthday={birthday}
              setBirthday={setBirthday}
              gender={gender}
              setGender={setGender}
              mobile={mobile}
              setMobile={setMobile}
              authMethod={authMethod}
              isLoading={isLoading}
              isMobileAuthEnabled={isMobileAuthEnabled} // Pass down prop
            />
          ) : (
            <SignInForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              mobile={mobile}
              setMobile={setMobile}
              authMethod={authMethod}
              onResetPassword={onResetPassword}
              isLoading={isLoading}
              isMobileAuthEnabled={isMobileAuthEnabled} // Pass down prop
            />
          )}

          {/* Sign Up/Sign In Button */}
          <button
            onClick={() => {
              console.log('Button clicked!');
              console.log('isSignUp:', isSignUp);
              console.log('authMethod:', authMethod);
              console.log('onSignUp function:', isSignUp ? onSignUp : onSignIn);
              
              if (isSignUp) {
                onSignUp();
              } else {
                onSignIn();
              }
            }}
            disabled={isLoading}
            className={`w-full bg-blue-500 text-white py-2 rounded-lg transition duration-200 mt-6 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                {authMethod === 'phone'
                  ? 'Sending OTP...'
                  : isSignUp
                  ? 'Signing Up...'
                  : 'Signing In...'}
              </div>
            ) : (
              authMethod === 'phone'
                ? `Send OTP to ${isSignUp ? 'Sign Up' : 'Sign In'}`
                : isSignUp
                ? 'Sign Up'
                : 'Sign In'
            )}
          </button>
        </>
      )}
    </div>
  );
}