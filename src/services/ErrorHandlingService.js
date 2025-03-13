import { toast } from 'react-toastify';

class ErrorHandlingService {
  static instance = null;

  static getInstance() {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  // Handle general errors
  handleError(error, context = '') {
    console.error(`Error ${context}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(errorMessage);
    return errorMessage;
  }

  // Handle database operation errors
  handleDatabaseError(error, operation, resourceName) {
    console.error(`Database error during ${operation} of ${resourceName}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`${operation} ${resourceName} failed: ${errorMessage}`);
    return errorMessage;
  }

  // Handle network request errors
  handleNetworkError(error, action) {
    console.error(`Network error during ${action}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`Network error: ${errorMessage}. Please check your connection and try again.`);
    return errorMessage;
  }

  // Handle validation errors
  handleValidationError(error, fieldName) {
    console.error(`Validation error for ${fieldName}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`Validation failed: ${errorMessage}`);
    return errorMessage;
  }

  // Handle authentication errors
  handleAuthError(error, action) {
    console.error(`Authentication error during ${action}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`Authentication failed: ${errorMessage}`);
    return errorMessage;
  }

  // Get formatted error message
  getErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      return error.message;
    }

    if (error.error && error.error.message) {
      return error.error.message;
    }

    return 'An unexpected error occurred';
  }

  // Log error message
  logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorDetails = {
      timestamp,
      context,
      error: this.getErrorMessage(error),
      stack: error.stack
    };
    
    console.error('Error Log:', errorDetails);
    
    // Here you can add logic to save error logs to database or send to logging service
  }
}

export default ErrorHandlingService;