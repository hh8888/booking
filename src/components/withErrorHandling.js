import React from 'react';
import ErrorHandlingService from '../services/ErrorHandlingService';

const withErrorHandling = (WrappedComponent, resourceName) => {
  return function WithErrorHandlingComponent(props) {
    const errorHandler = ErrorHandlingService.getInstance();

    // Unified error handling method
    const handleError = async (operation, action) => {
      try {
        const result = await action();
        return result;
      } catch (error) {
        return errorHandler.handleDatabaseError(error, operation, resourceName);
      }
    };

    // Unified network error handling method
    const handleNetworkError = async (action, actionName) => {
      try {
        const result = await action();
        return result;
      } catch (error) {
        return errorHandler.handleNetworkError(error, actionName);
      }
    };

    // Unified validation error handling method
    const handleValidationError = (error, fieldName) => {
      return errorHandler.handleValidationError(error, fieldName);
    };

    // Unified authentication error handling method
    const handleAuthError = (error, action) => {
      return errorHandler.handleAuthError(error, action);
    };

    // Inject error handling methods into component props
    const errorHandlingProps = {
      handleError,
      handleNetworkError,
      handleValidationError,
      handleAuthError
    };

    return <WrappedComponent {...props} {...errorHandlingProps} />;
  };
};

export default withErrorHandling;