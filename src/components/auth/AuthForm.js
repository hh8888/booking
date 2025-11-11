import React from 'react';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import LoadingSpinner from '../common/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../common/LanguageSwitcher'; // Add this import

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
  isMobileAuthEnabled,
  confirmationMessage,
  setConfirmationMessage,
  showForgotPasswordInitially,
}) {
  // Format timer display
  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  const { t } = useLanguage();
  const { businessName, loading: businessLoading } = useBusinessInfo();
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl relative">
      {/* Language Switcher - positioned at top right */}
      <div className="absolute top-3 right-3">
        <LanguageSwitcher />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 pr-16 pt-2">
        {businessLoading ? t('common.loading') : (businessName || 'Service Booking')}
      </h1>

      {/* Auth Method Toggle */}
      {!otpSent && (
        <div className="hidden flex space-x-2 border border-gray-200 rounded-lg p-1 mb-4">
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
          {isMobileAuthEnabled && (
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
            {t('auth.signIn.title')}
          </button>
          <button
            onClick={() => !isLoading && setIsSignUp(true)}
            disabled={isLoading}
            className={`py-2 px-4 ${isSignUp ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t('auth.signUp.title')}
          </button>
        </div>
      )}

      {/* OTP Verification Form */}
      {otpSent ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-center">
            {t('auth.otp.enterCode')}
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center">
            {t('auth.otp.sentTo', { contact: authMethod === 'email' ? email : mobile })}
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.otp.verificationCode')}
            </label>
            <input
              type="text"
              placeholder={t('auth.otp.enterSixDigit')}
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
            {isLoading ? t('auth.otp.verifying') : t('auth.otp.verifyCode')}
          </button>

          {/* Resend Code Section */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-600">
                {t('auth.otp.resendIn', { time: formatTimer(resendTimer) })}
              </p>
            ) : (
              <button
                onClick={onResendOtp}
                disabled={!canResend || isLoading}
                className={`text-sm text-blue-500 hover:text-blue-600 transition-colors ${
                  !canResend || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
                }`}
              >
                {isLoading ? t('auth.otp.sending') : t('auth.otp.resendCode')}
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
              isMobileAuthEnabled={isMobileAuthEnabled}
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
              isMobileAuthEnabled={isMobileAuthEnabled}
              confirmationMessage={confirmationMessage}
              setConfirmationMessage={setConfirmationMessage}
              showForgotPasswordInitially={showForgotPasswordInitially}
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
                  ? t('auth.otp.sendingOtp')
                  : isSignUp
                  ? t('auth.signUp.signingUp')
                  : t('auth.signIn.signingIn')}
              </div>
            ) : (
              authMethod === 'phone'
                ? t('auth.otp.sendOtpTo', { action: isSignUp ? t('auth.signUp.title') : t('auth.signIn.title') })
                : isSignUp
                ? t('auth.signUp.title')
                : t('auth.signIn.title')
            )}
          </button>
        </>
      )}
    </div>
  );
}