import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  className = '',
  text,
  fullScreen = false 
}) => {
  const { t } = useLanguage();
  const displayText = text || t('common.loading');
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    white: 'border-white',
    gray: 'border-gray-500',
    green: 'border-green-500',
    red: 'border-red-500'
  };

  const spinner = (
    <div className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${colorClasses[color]} ${className}`} role="status">
      <span className="sr-only">{displayText}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          {spinner}
          {displayText && <p className="text-gray-600 text-sm">{displayText}</p>}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center space-x-2">
        {spinner}
        <span className="text-sm text-gray-600">{displayText}</span>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;