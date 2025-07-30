import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const ExpiredLinkError = ({ onGoToLogin, onCreateAccount }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('auth.expiredLink') || 'Link Expired'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {t('auth.expiredLinkMessage') || 'This verification link has expired or is invalid. Please try signing in again or create a new account.'}
          </p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={onGoToLogin}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition duration-200"
            >
              {t('auth.goToLogin') || 'Go to Login'}
            </button>
            <button
              onClick={onCreateAccount}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded transition duration-200"
            >
              {t('auth.createAccount') || 'Create New Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpiredLinkError;