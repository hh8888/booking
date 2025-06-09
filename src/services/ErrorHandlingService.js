import { toast } from 'react-toastify';

// Error type enumeration
const ErrorType = {
  VALIDATION: 'VALIDATION',
  DATABASE: 'DATABASE',
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTH',
  AUTHORIZATION: 'AUTHORIZATION',
  BUSINESS: 'BUSINESS',
  SYSTEM: 'SYSTEM'
};

// Error code mapping
const ErrorCodeMap = {
  [ErrorType.VALIDATION]: {
    INVALID_INPUT: 'E001',
    REQUIRED_FIELD: 'E002',
    INVALID_FORMAT: 'E003'
  },
  [ErrorType.DATABASE]: {
    CONNECTION_ERROR: 'E101',
    QUERY_ERROR: 'E102',
    DUPLICATE_ENTRY: 'E103'
  },
  [ErrorType.NETWORK]: {
    CONNECTION_FAILED: 'E201',
    TIMEOUT: 'E202',
    API_ERROR: 'E203'
  },
  [ErrorType.AUTHENTICATION]: {
    INVALID_CREDENTIALS: 'E301',
    TOKEN_EXPIRED: 'E302',
    UNAUTHORIZED: 'E303'
  },
  [ErrorType.AUTHORIZATION]: {
    INSUFFICIENT_PERMISSIONS: 'E401',
    FORBIDDEN: 'E402'
  },
  [ErrorType.BUSINESS]: {
    INVALID_OPERATION: 'E501',
    RESOURCE_NOT_FOUND: 'E502',
    CONFLICT: 'E503'
  },
  [ErrorType.SYSTEM]: {
    INTERNAL_ERROR: 'E901',
    SERVICE_UNAVAILABLE: 'E902'
  }
};

class ErrorHandlingService {
  static instance = null;

  static getInstance() {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  // Handle general error
  handleError(error, context = '', errorType = ErrorType.SYSTEM) {
    const errorCode = this.getErrorCode(error, errorType);
    console.error(`Error [${errorCode}] ${context}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`[${errorCode}] ${errorMessage}`);
    return { code: errorCode, message: errorMessage };
  }

  // Get error code
  getErrorCode(error, errorType) {
    if (error.code && typeof error.code === 'string') {
      return error.code;
    }
    return ErrorCodeMap[errorType]?.INTERNAL_ERROR || 'E999';
  }

  // Handle database operation error
  handleDatabaseError(error, operation, resourceName) {
    const errorCode = this.getErrorCode(error, ErrorType.DATABASE);
    console.error(`Database error [${errorCode}] during ${operation} of ${resourceName}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`[${errorCode}] ${operation} ${resourceName} failed: ${errorMessage}`);
    return { code: errorCode, message: errorMessage };
  }

  // Handle network request error
  handleNetworkError(error, action) {
    const errorCode = this.getErrorCode(error, ErrorType.NETWORK);
    console.error(`Network error [${errorCode}] during ${action}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`[${errorCode}] Network error: ${errorMessage}. Please check your connection and try again.`);
    return { code: errorCode, message: errorMessage };
  }

  // Handle validation error
  handleValidationError(error, fieldName) {
    const errorCode = this.getErrorCode(error, ErrorType.VALIDATION);
    console.error(`Validation error [${errorCode}] for ${fieldName}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`[${errorCode}] Validation failed: ${errorMessage}`);
    return { code: errorCode, message: errorMessage };
  }

  // Handle authentication error
  handleAuthError(error, action) {
    const errorCode = this.getErrorCode(error, ErrorType.AUTHENTICATION);
    console.error(`Authentication error [${errorCode}] during ${action}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`[${errorCode}] Authentication failed: ${errorMessage}`);
    return { code: errorCode, message: errorMessage };
  }

  // Handle authorization error
  handleAuthorizationError(error, action) {
    const errorCode = this.getErrorCode(error, ErrorType.AUTHORIZATION);
    console.error(`Authorization error [${errorCode}] during ${action}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`[${errorCode}] Authorization failed: ${errorMessage}`);
    return { code: errorCode, message: errorMessage };
  }

  // Handle business logic error
  handleBusinessError(error, operation) {
    const errorCode = this.getErrorCode(error, ErrorType.BUSINESS);
    console.error(`Business error [${errorCode}] during ${operation}:`, error);
    const errorMessage = this.getErrorMessage(error);
    toast.error(`[${errorCode}] Operation failed: ${errorMessage}`);
    return { code: errorCode, message: errorMessage };
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