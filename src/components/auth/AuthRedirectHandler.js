import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');

    if (error || errorCode || errorDescription) {
      // Construct the new URL with hash routing and query parameters
      const newSearchParams = new URLSearchParams();
      if (error) newSearchParams.append('error', error);
      if (errorCode) newSearchParams.append('error_code', errorCode);
      if (errorDescription) newSearchParams.append('error_description', errorDescription);

      const newUrl = `/auth?${newSearchParams.toString()}`;
      navigate(newUrl, { replace: true });
    } else {
      // If no error params, redirect to home or a default route
      navigate('/', { replace: true });
    }
  }, [navigate, location.search]);

  return null; // This component doesn't render anything
};

export default AuthRedirectHandler;