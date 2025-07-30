import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const TimeoutPrompt = ({ onRefresh, onCancel }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('auth.sessionTimeout') || 'Session Timeout'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {t('auth.sessionTimeoutMessage') || 'Your session has timed out due to inactivity. Would you like to refresh and continue?'}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded transition duration-200"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              onClick={onRefresh}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition duration-200"
            >
              {t('common.refresh') || 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeoutPrompt;