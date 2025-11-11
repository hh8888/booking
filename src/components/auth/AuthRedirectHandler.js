import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthRedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthRedirectHandler: useEffect triggered.');
    // Check both hash and path for Supabase auth parameters
    let paramsSource = null;
    let paramsString = '';

    // Check hash first
    const hash = window.location.hash;
    console.log('AuthRedirectHandler: Current hash:', hash);

    // If in debug mode for reset password, do nothing and let the ResetPassword component handle it.
    if (hash.includes('debug_reset=true')) {
      console.log('AuthRedirectHandler: Debug mode for reset password detected. Skipping parameter processing.');
      return;
    }

    if (hash && hash.length > 1 && !hash.startsWith('#/auth') && !hash.startsWith('#/reset-password')) {
      paramsSource = 'hash';
      paramsString = hash.substring(1);
    } 
    // Check path if no valid hash parameters found
    else if (window.location.pathname.includes('access_token') || window.location.pathname.includes('type=') || window.location.pathname.includes('error=') || window.location.pathname.includes('error_code=')) {
      paramsSource = 'path';
      paramsString = window.location.pathname.substring(1); // Remove leading slash
      console.log('AuthRedirectHandler: Found Supabase parameters in path:', paramsString);
    }

    if (paramsString) {
      console.log('AuthRedirectHandler: Processing parameters from', paramsSource);
      const authParams = new URLSearchParams(paramsString);
      const type = authParams.get('type');
      console.log('AuthRedirectHandler: Extracted type:', type);

      let targetPath = '/auth';
      if (type === 'recovery') {
        targetPath = '/reset-password';
      }
      console.log('AuthRedirectHandler: Target path:', targetPath);

      // Construct query string from auth parameters
      const queryString = authParams.toString();
      console.log('AuthRedirectHandler: Query string:', queryString);

      // Navigate to target path with query parameters
      console.log('AuthRedirectHandler: Navigating to:', `${targetPath}?${queryString}`);
      navigate(`${targetPath}?${queryString}`, { replace: true });
    } else {
      console.log('AuthRedirectHandler: No relevant auth parameters to process or already processed.');
    }
  }, [navigate]);

  return null;
};

export default AuthRedirectHandler;