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
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');
    const tokenType = params.get('token_type');

    if (error || errorCode || errorDescription || accessToken) {
      // Construct the new URL with hash routing and query parameters
      const newSearchParams = new URLSearchParams();
      if (error) newSearchParams.append('error', error);
      if (errorCode) newSearchParams.append('error_code', errorCode);
      if (errorDescription) newSearchParams.append('error_description', errorDescription);
      if (accessToken) newSearchParams.append('access_token', accessToken);
      if (refreshToken) newSearchParams.append('refresh_token', refreshToken);
      if (expiresIn) newSearchParams.append('expires_in', expiresIn);
      if (tokenType) newSearchParams.append('token_type', tokenType);

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