import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SignInForm({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  mobile, 
  setMobile, 
  authMethod, 
  onResetPassword, 
  isLoading,
  isMobileAuthEnabled,
  confirmationMessage,
  setConfirmationMessage
}) {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      {/* Confirmation Message Display */}
      {confirmationMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg relative">
          <div className="flex justify-between items-center">
            <span className="text-sm">{confirmationMessage}</span>
            <button
              type="button"
              onClick={() => setConfirmationMessage('')}
              className="text-green-500 hover:text-green-700 ml-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Email or Phone Input */}
      {authMethod === 'email' || (authMethod === 'phone' && isMobileAuthEnabled) ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {authMethod === 'email' ? t('auth.signIn.email') : t('auth.signIn.phoneNumber')}
          </label>
          <input
            type={authMethod === 'email' ? 'email' : 'tel'}
            placeholder={authMethod === 'email' ? t('auth.signIn.enterEmail') : t('auth.signIn.enterPhone')}
            value={authMethod === 'email' ? email : mobile}
            onChange={(e) => authMethod === 'email' ? setEmail(e.target.value) : setMobile(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : null}

      {/* Password Input - Only for email auth */}
      {authMethod === 'email' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.signIn.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.signIn.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="mb-6 text-right">
            <button
              type="button"
              onClick={onResetPassword}
              disabled={isLoading}
              className={`text-sm text-blue-500 hover:text-blue-700 hover:underline ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {t('auth.signIn.forgotPassword')}
            </button>
          </div>
        </>
      )}
    </>
  );
}